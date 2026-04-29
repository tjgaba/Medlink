using HealthcareTriage.Application.Audit;
using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Application.Compliance;

public sealed class ComplianceService : IComplianceService
{
    private readonly ComplianceRules _rules;
    private readonly IAuditService _auditService;

    public ComplianceService(ComplianceRules rules, IAuditService auditService)
    {
        _rules = rules;
        _auditService = auditService;
    }

    public bool IsWithinWorkingHours(Staff staff)
    {
        ArgumentNullException.ThrowIfNull(staff);

        return staff.TotalHoursWorked <= _rules.MaximumShiftHours;
    }

    public bool HasSufficientRest(Staff staff)
    {
        ArgumentNullException.ThrowIfNull(staff);

        if (staff.LastShiftEndedAt is null)
        {
            return true;
        }

        return DateTimeOffset.UtcNow - staff.LastShiftEndedAt >= _rules.MinimumRestPeriod;
    }

    public bool IsOvertimeExceeded(Staff staff)
    {
        ArgumentNullException.ThrowIfNull(staff);

        return staff.TotalHoursWorked >= _rules.OvertimeThresholdHours;
    }

    public bool IsZoneUnderstaffed(string zone, IReadOnlyCollection<Staff> staff)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(zone);
        ArgumentNullException.ThrowIfNull(staff);

        var availableStaffInZone = staff.Count(member =>
            member.IsOnDuty &&
            !member.IsBusy &&
            IsSameZone(member, zone));

        return availableStaffInZone < _rules.MinimumAvailableStaffPerZone;
    }

    public ComplianceRiskLevel EvaluateRisk(Staff staff, Case incident, string delegationType)
    {
        ArgumentNullException.ThrowIfNull(staff);
        ArgumentNullException.ThrowIfNull(incident);

        if (!IsWithinWorkingHours(staff) ||
            !HasSufficientRest(staff) ||
            staff.CurrentCaseCount >= _rules.MaximumActiveCases)
        {
            return ComplianceRiskLevel.High;
        }

        if (IsOvertimeExceeded(staff))
        {
            return ComplianceRiskLevel.Warning;
        }

        if (IsShiftDelegation(delegationType) &&
            (staff.CurrentCaseCount >= _rules.WarningActiveCases ||
             staff.TotalHoursWorked >= _rules.WarningShiftHours))
        {
            return ComplianceRiskLevel.Warning;
        }

        var zoneStaff = incident.Zone?.StaffMembers ?? staff.Zone?.StaffMembers;
        var zoneName = incident.Zone?.Name ?? staff.Zone?.Name;

        if (!string.IsNullOrWhiteSpace(zoneName) &&
            zoneStaff is not null &&
            IsZoneUnderstaffed(zoneName, zoneStaff.ToList()))
        {
            return incident.Severity == CaseSeverity.Red
                ? ComplianceRiskLevel.Warning
                : ComplianceRiskLevel.High;
        }

        return ComplianceRiskLevel.Safe;
    }

    public ComplianceRiskLevel EvaluateShiftDelegation(Staff fromStaff, Staff toStaff, Case incident)
    {
        ArgumentNullException.ThrowIfNull(fromStaff);
        ArgumentNullException.ThrowIfNull(toStaff);
        ArgumentNullException.ThrowIfNull(incident);

        var targetRisk = EvaluateRisk(toStaff, incident, DelegationType.Shift.ToString());

        if (targetRisk == ComplianceRiskLevel.High)
        {
            LogComplianceRisk(toStaff, incident, targetRisk);
            return ComplianceRiskLevel.High;
        }

        if (targetRisk == ComplianceRiskLevel.Warning ||
            fromStaff.ZoneId != toStaff.ZoneId)
        {
            LogComplianceRisk(toStaff, incident, ComplianceRiskLevel.Warning);
            return ComplianceRiskLevel.Warning;
        }

        return ComplianceRiskLevel.Safe;
    }

    private static bool IsSameZone(Staff staff, string zone)
    {
        return string.Equals(staff.Zone?.Name, zone, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(staff.ZoneId.ToString(), zone, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsShiftDelegation(string delegationType)
    {
        return string.Equals(delegationType, DelegationType.Shift.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private void LogComplianceRisk(Staff staff, Case incident, ComplianceRiskLevel riskLevel)
    {
        var details = $$"""
        {
          "staffId": "{{staff.Id}}",
          "caseId": "{{incident.Id}}",
          "riskLevel": "{{riskLevel}}",
          "totalHoursWorked": {{staff.TotalHoursWorked}},
          "currentCaseCount": {{staff.CurrentCaseCount}}
        }
        """;

        _ = _auditService.LogAsync(
            riskLevel == ComplianceRiskLevel.High
                ? "ComplianceViolation"
                : "ComplianceWarning",
            nameof(Case),
            incident.Id.ToString(),
            staff.Id.ToString(),
            details,
            riskLevel == ComplianceRiskLevel.High ? "Critical" : "Warning");
    }
}
