using HealthcareTriage.Application.Audit;
using HealthcareTriage.Application.Compliance;
using HealthcareTriage.Application.Fatigue;
using HealthcareTriage.Application.Payroll;
using HealthcareTriage.Application.Resilience;
using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Application.Delegation;

public sealed class DelegationService : IDelegationService
{
    private const int MaximumRecommendedActiveCases = 4;

    private readonly IDelegationRepository _repository;
    private readonly IFatigueService _fatigueService;
    private readonly IComplianceService _complianceService;
    private readonly IAuditService _auditService;
    private readonly IResilienceService _resilienceService;
    private readonly IPayrollTrackingService _payrollTrackingService;

    public DelegationService(
        IDelegationRepository repository,
        IFatigueService fatigueService,
        IComplianceService complianceService,
        IAuditService auditService,
        IResilienceService resilienceService,
        IPayrollTrackingService payrollTrackingService)
    {
        _repository = repository;
        _fatigueService = fatigueService;
        _complianceService = complianceService;
        _auditService = auditService;
        _resilienceService = resilienceService;
        _payrollTrackingService = payrollTrackingService;
    }

    public async Task<DelegationRequest> CreateDelegationRequestAsync(
        Guid fromStaffId,
        Guid toStaffId,
        Guid caseId,
        string type,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (fromStaffId == toStaffId)
        {
            throw new InvalidOperationException("Delegation target must be a different staff member.");
        }

        if (!Enum.TryParse<DelegationType>(type, ignoreCase: true, out var delegationType))
        {
            throw new InvalidOperationException("Delegation type is invalid.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidOperationException("Delegation reason is required.");
        }

        var fromStaff = await GetRequiredStaffAsync(fromStaffId, cancellationToken);
        var toStaff = await GetRequiredStaffAsync(toStaffId, cancellationToken);
        var incident = await GetRequiredCaseAsync(caseId, cancellationToken);

        ValidateDelegation(fromStaff, toStaff, incident, delegationType);

        var request = new DelegationRequest
        {
            Id = Guid.NewGuid(),
            FromStaffId = fromStaffId,
            ToStaffId = toStaffId,
            CaseId = caseId,
            Type = delegationType,
            Status = DelegationStatus.Pending,
            Reason = reason.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _repository.AddDelegationRequestAsync(request, cancellationToken);
        await _resilienceService.ExecuteWithRetryAsync(
            () => _repository.SaveChangesAsync(cancellationToken),
            cancellationToken);
        await LogDelegationAsync(
            request,
            delegationType == DelegationType.Shift
                ? "ShiftLevelDelegationInitiated"
                : "DelegationRequested",
            fromStaffId.ToString(),
            "Info",
            cancellationToken);

        return request;
    }

    public async Task AcceptDelegationAsync(Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await GetRequiredRequestAsync(requestId, cancellationToken);

        if (request.Status != DelegationStatus.Pending)
        {
            throw new InvalidOperationException("Only pending delegation requests can be accepted.");
        }

        var fromStaff = request.FromStaff ?? await GetRequiredStaffAsync(request.FromStaffId, cancellationToken);
        var toStaff = request.ToStaff ?? await GetRequiredStaffAsync(request.ToStaffId, cancellationToken);
        var incident = request.Case ?? await GetRequiredCaseAsync(request.CaseId, cancellationToken);

        ValidateDelegation(fromStaff, toStaff, incident, request.Type);

        if (request.Type == DelegationType.Shift &&
            _complianceService.EvaluateShiftDelegation(fromStaff, toStaff, incident) == ComplianceRiskLevel.High)
        {
            throw new InvalidOperationException("Shift-level delegation requires admin approval due to compliance risk.");
        }

        if (incident.AssignedStaffId == fromStaff.Id && fromStaff.CurrentCaseCount > 0)
        {
            fromStaff.CurrentCaseCount--;
        }

        incident.AssignedStaffId = toStaff.Id;
        toStaff.CurrentCaseCount++;
        toStaff.IsBusy = true;

        request.Status = DelegationStatus.Accepted;
        request.ResolvedAt = DateTimeOffset.UtcNow;

        await _resilienceService.ExecuteWithRetryAsync(
            () => _repository.SaveChangesAsync(cancellationToken),
            cancellationToken);
        await LogDelegationAsync(
            request,
            "DelegationAccepted",
            toStaff.Id.ToString(),
            "Info",
            cancellationToken);

        await _payrollTrackingService.LogEventAsync(
            toStaff.Id,
            "DelegationAccepted",
            incident.Id,
            CalculateDurationMinutes(request),
            "Accepted additional delegated workload.",
            cancellationToken);
    }

    public async Task DeclineDelegationAsync(Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await GetRequiredRequestAsync(requestId, cancellationToken);

        if (request.Status != DelegationStatus.Pending)
        {
            throw new InvalidOperationException("Only pending delegation requests can be declined.");
        }

        request.Status = DelegationStatus.Declined;
        request.ResolvedAt = DateTimeOffset.UtcNow;

        await _resilienceService.ExecuteWithRetryAsync(
            () => _repository.SaveChangesAsync(cancellationToken),
            cancellationToken);
        await LogDelegationAsync(
            request,
            "DelegationDeclined",
            request.ToStaffId.ToString(),
            "Info",
            cancellationToken);

        await _payrollTrackingService.LogEventAsync(
            request.ToStaffId,
            "DelegationDeclined",
            request.CaseId,
            CalculateDurationMinutes(request),
            "Declined delegated workload.",
            cancellationToken);
    }

    private void ValidateDelegation(
        Staff fromStaff,
        Staff toStaff,
        Case incident,
        DelegationType type)
    {
        if (incident.AssignedStaffId is not null && incident.AssignedStaffId != fromStaff.Id)
        {
            throw new InvalidOperationException("Only the currently assigned staff member can delegate this case.");
        }

        if (!toStaff.IsOnDuty || toStaff.IsBusy)
        {
            throw new InvalidOperationException("Target staff member must be on duty and available.");
        }

        if (!IsZoneCompatible(incident, toStaff))
        {
            throw new InvalidOperationException("Target staff member must be in the same or an adjacent zone.");
        }

        if (!HasRequiredSkill(incident, toStaff))
        {
            throw new InvalidOperationException("Target staff member does not match the required specialization.");
        }

        if (toStaff.CurrentCaseCount >= MaximumRecommendedActiveCases)
        {
            throw new InvalidOperationException("Target staff member is overloaded.");
        }

        _ = _fatigueService.CalculateFatiguePenalty(toStaff, incident.Severity);

        if (type == DelegationType.Shift)
        {
            _ = _complianceService.EvaluateShiftDelegation(fromStaff, toStaff, incident);
        }
    }

    private static bool IsZoneCompatible(Case incident, Staff toStaff)
    {
        if (toStaff.ZoneId == incident.ZoneId)
        {
            return true;
        }

        return incident.Zone?.AdjacentZones.Any(zone => zone.Id == toStaff.ZoneId) == true;
    }

    private static bool HasRequiredSkill(Case incident, Staff toStaff)
    {
        if (string.IsNullOrWhiteSpace(incident.RequiredSpecialization))
        {
            return true;
        }

        return string.Equals(
            incident.RequiredSpecialization,
            toStaff.Specialization,
            StringComparison.OrdinalIgnoreCase);
    }

    private async Task<Staff> GetRequiredStaffAsync(Guid staffId, CancellationToken cancellationToken)
    {
        return await _repository.GetStaffAsync(staffId, cancellationToken)
            ?? throw new InvalidOperationException("Staff member was not found.");
    }

    private async Task<Case> GetRequiredCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _repository.GetCaseAsync(caseId, cancellationToken)
            ?? throw new InvalidOperationException("Case was not found.");
    }

    private async Task<DelegationRequest> GetRequiredRequestAsync(Guid requestId, CancellationToken cancellationToken)
    {
        return await _repository.GetDelegationRequestAsync(requestId, cancellationToken)
            ?? throw new InvalidOperationException("Delegation request was not found.");
    }

    private Task LogDelegationAsync(
        DelegationRequest request,
        string actionType,
        string performedBy,
        string severity,
        CancellationToken cancellationToken)
    {
        var details = $$"""
        {
          "delegationRequestId": "{{request.Id}}",
          "fromStaffId": "{{request.FromStaffId}}",
          "toStaffId": "{{request.ToStaffId}}",
          "caseId": "{{request.CaseId}}",
          "type": "{{request.Type}}",
          "status": "{{request.Status}}"
        }
        """;

        return _auditService.LogAsync(
            actionType,
            nameof(DelegationRequest),
            request.Id.ToString(),
            performedBy,
            details,
            severity,
            cancellationToken);
    }

    private static int? CalculateDurationMinutes(DelegationRequest request)
    {
        if (request.ResolvedAt is null)
        {
            return null;
        }

        return Math.Max(0, (int)Math.Round((request.ResolvedAt.Value - request.CreatedAt).TotalMinutes));
    }
}
