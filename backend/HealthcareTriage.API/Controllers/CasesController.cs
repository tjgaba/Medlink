using HealthcareTriage.API.DTOs.Cases;
using HealthcareTriage.API.Hubs;
using HealthcareTriage.Application.Notifications;
using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;
using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

namespace HealthcareTriage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Doctor,Nurse,Paramedic")]
public sealed class CasesController : ControllerBase
{
    private readonly HealthcareTriageDbContext _dbContext;
    private readonly IHubContext<NotificationsHub> _hubContext;
    private readonly IEscalationEmailService _escalationEmailService;

    public CasesController(
        HealthcareTriageDbContext dbContext,
        IHubContext<NotificationsHub> hubContext,
        IEscalationEmailService escalationEmailService)
    {
        _dbContext = dbContext;
        _hubContext = hubContext;
        _escalationEmailService = escalationEmailService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<DashboardCaseResponse>>> GetCases(
        CancellationToken cancellationToken)
    {
        var cases = await _dbContext.Cases
            .AsNoTracking()
            .Include(incident => incident.Zone)
            .Include(incident => incident.AssignedStaff)
            .OrderByDescending(incident => incident.CreatedAt)
            .Select(incident => new DashboardCaseResponse(
                incident.Id,
                incident.DisplayCode,
                incident.PatientName,
                incident.PatientIdNumber,
                incident.Age,
                incident.Gender,
                incident.Address,
                incident.NextOfKinName,
                incident.NextOfKinRelationship,
                incident.NextOfKinPhone,
                incident.Severity.ToString(),
                incident.Department.ToString(),
                incident.SymptomsSummary,
                incident.RequiredSpecialization,
                incident.Zone == null ? "Unassigned" : incident.Zone.Name,
                incident.ETA,
                incident.AssignedStaffId,
                incident.AssignedStaff == null ? null : incident.AssignedStaff.Name,
                incident.Status.ToString(),
                incident.PatientStatus,
                incident.BloodPressure,
                incident.HeartRate,
                incident.RespiratoryRate,
                incident.Temperature,
                incident.OxygenSaturation,
                incident.ConsciousnessLevel,
                incident.ChronicConditions,
                incident.CurrentMedications,
                incident.Allergies,
                incident.MedicalAidScheme,
                incident.ParamedicNotes,
                incident.Prescription,
                incident.CancellationReason,
                incident.CreatedAt,
                incident.DelegationRequests
                    .Where(request => request.Status == DelegationStatus.Pending)
                    .OrderByDescending(request => request.CreatedAt)
                    .Select(request => (Guid?)request.Id)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);

        return Ok(cases);
    }

    [HttpPost]
    public async Task<ActionResult<DashboardCaseResponse>> CreateCase(
        CreateCaseRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryParseEnum<CaseSeverity>(request.Severity, out var severity))
        {
            return BadRequest(new { message = "Severity is invalid." });
        }

        if (!TryParseEnum<CaseDepartment>(request.Department, out var department))
        {
            return BadRequest(new { message = "Department is invalid." });
        }

        var status = CaseStatus.Pending;
        if (!string.IsNullOrWhiteSpace(request.Status) &&
            !TryParseEnum<CaseStatus>(request.Status, out status))
        {
            return BadRequest(new { message = "Patient status is invalid." });
        }

        var zone = request.ZoneId is not null
            ? await _dbContext.Zones.FirstOrDefaultAsync(currentZone => currentZone.Id == request.ZoneId, cancellationToken)
            : await _dbContext.Zones.FirstOrDefaultAsync(
                currentZone => currentZone.Name == (request.ZoneName ?? string.Empty),
                cancellationToken);

        if (zone is null && !string.IsNullOrWhiteSpace(request.ZoneName))
        {
            zone = new Zone
            {
                Id = Guid.NewGuid(),
                Name = request.ZoneName.Trim()
            };
            _dbContext.Zones.Add(zone);
        }

        zone ??= await _dbContext.Zones
            .OrderBy(currentZone => currentZone.Name)
            .FirstOrDefaultAsync(cancellationToken);

        if (zone is null)
        {
            return BadRequest(new { message = "At least one clinic zone is required before cases can be created." });
        }

        var nextCaseNumber = await _dbContext.Cases.CountAsync(cancellationToken) + 1;
        var incident = new Case
        {
            Id = Guid.NewGuid(),
            DisplayCode = string.IsNullOrWhiteSpace(request.DisplayCode)
                ? $"CASE-{nextCaseNumber:000}"
                : request.DisplayCode.Trim(),
            PatientName = string.IsNullOrWhiteSpace(request.PatientName)
                ? "Patient details pending"
                : request.PatientName.Trim(),
            PatientIdNumber = NormalizeOptionalText(request.PatientIdNumber),
            Age = request.Age,
            Gender = NormalizeOptionalText(request.Gender),
            Address = NormalizeOptionalText(request.Address),
            NextOfKinName = NormalizeOptionalText(request.NextOfKinName),
            NextOfKinRelationship = NormalizeOptionalText(request.NextOfKinRelationship),
            NextOfKinPhone = NormalizeOptionalText(request.NextOfKinPhone),
            Severity = severity,
            Department = department,
            SymptomsSummary = string.IsNullOrWhiteSpace(request.SymptomsSummary)
                ? "Symptoms pending review."
                : request.SymptomsSummary.Trim(),
            RequiredSpecialization = string.IsNullOrWhiteSpace(request.RequiredSpecialization)
                ? FormatDepartment(department)
                : request.RequiredSpecialization.Trim(),
            ZoneId = zone.Id,
            Zone = zone,
            ETA = request.EtaMinutes is null ? null : TimeSpan.FromMinutes(Math.Max(1, request.EtaMinutes.Value)),
            Status = status,
            PatientStatus = NormalizePatientStatus(request.PatientStatus),
            BloodPressure = NormalizeOptionalText(request.BloodPressure),
            HeartRate = request.HeartRate,
            RespiratoryRate = request.RespiratoryRate,
            Temperature = request.Temperature,
            OxygenSaturation = request.OxygenSaturation,
            ConsciousnessLevel = NormalizeOptionalText(request.ConsciousnessLevel),
            ChronicConditions = NormalizeOptionalText(request.ChronicConditions),
            CurrentMedications = NormalizeOptionalText(request.CurrentMedications),
            Allergies = NormalizeOptionalText(request.Allergies),
            MedicalAidScheme = NormalizeOptionalText(request.MedicalAidScheme),
            ParamedicNotes = NormalizeOptionalText(request.ParamedicNotes),
            Prescription = NormalizeOptionalText(request.Prescription),
            CancellationReason = NormalizeOptionalText(request.CancellationReason),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Cases.Add(incident);
        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "CaseCreated",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "paramedic",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                source = "paramedic-submit",
                department = incident.Department.ToString(),
                severity = incident.Severity.ToString(),
                vitals = new
                {
                    incident.BloodPressure,
                    incident.HeartRate,
                    incident.RespiratoryRate,
                    incident.Temperature,
                    incident.OxygenSaturation,
                    incident.ConsciousnessLevel
                }
            }),
            Severity = severity == CaseSeverity.Red ? AuditSeverity.Critical : AuditSeverity.Info
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = ToDashboardCaseResponse(incident);
        await _hubContext.Clients.All.SendAsync("NewCaseReceived", response, cancellationToken);

        return Created(string.Empty, response);
    }

    [HttpPut("{caseId:guid}/patient-profile")]
    // Patient profile edits are stored on the active case record.
    public async Task<ActionResult<DashboardCaseResponse>> UpdatePatientProfile(
        Guid caseId,
        UpdatePatientProfileRequest request,
        CancellationToken cancellationToken)
    {
        var incident = await _dbContext.Cases
            .Include(currentCase => currentCase.Zone)
            .Include(currentCase => currentCase.AssignedStaff)
            .FirstOrDefaultAsync(currentCase => currentCase.Id == caseId, cancellationToken);

        if (incident is null)
        {
            return NotFound();
        }

        if (!TryParseEnum<CaseSeverity>(request.Severity, out var severity))
        {
            return BadRequest(new { message = "Priority is invalid." });
        }

        if (!TryParseEnum<CaseDepartment>(request.Department, out var department))
        {
            return BadRequest(new { message = "Suggested department is invalid." });
        }

        if (!TryParseEnum<CaseStatus>(request.Status, out var status))
        {
            return BadRequest(new { message = "Case status is invalid." });
        }

        incident.PatientName = string.IsNullOrWhiteSpace(request.PatientName)
            ? "Patient details pending"
            : request.PatientName.Trim();
        incident.PatientIdNumber = NormalizeOptionalText(request.PatientIdNumber);
        incident.Age = request.Age;
        incident.Gender = NormalizeOptionalText(request.Gender);
        incident.Address = NormalizeOptionalText(request.Address);
        incident.NextOfKinName = NormalizeOptionalText(request.NextOfKinName);
        incident.NextOfKinRelationship = NormalizeOptionalText(request.NextOfKinRelationship);
        incident.NextOfKinPhone = NormalizeOptionalText(request.NextOfKinPhone);
        incident.BloodPressure = NormalizeOptionalText(request.BloodPressure);
        incident.HeartRate = request.HeartRate;
        incident.RespiratoryRate = request.RespiratoryRate;
        incident.Temperature = request.Temperature;
        incident.OxygenSaturation = request.OxygenSaturation;
        incident.ConsciousnessLevel = NormalizeOptionalText(request.ConsciousnessLevel);
        incident.ChronicConditions = NormalizeOptionalText(request.ChronicConditions);
        incident.CurrentMedications = NormalizeOptionalText(request.CurrentMedications);
        incident.Allergies = NormalizeOptionalText(request.Allergies);
        incident.MedicalAidScheme = NormalizeOptionalText(request.MedicalAidScheme);
        incident.ParamedicNotes = NormalizeOptionalText(request.ParamedicNotes);
        incident.Prescription = NormalizeOptionalText(request.Prescription);
        incident.CancellationReason = NormalizeOptionalText(request.CancellationReason);
        incident.Severity = severity;
        incident.Department = department;
        incident.RequiredSpecialization = string.IsNullOrWhiteSpace(request.RequiredSpecialization)
            ? FormatDepartment(department)
            : request.RequiredSpecialization.Trim();
        incident.PatientStatus = NormalizePatientStatus(request.PatientStatus);
        incident.Status = status;

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "PatientProfileUpdated",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "dashboard",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                source = "dashboard-patient-profile"
            }),
            Severity = AuditSeverity.Info
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = ToDashboardCaseResponse(incident);
        await _hubContext.Clients.All.SendAsync("CaseUpdated", response, cancellationToken);

        return Ok(response);
    }

    [HttpPost("{caseId:guid}/assign")]
    public async Task<ActionResult<DashboardCaseResponse>> AssignStaff(
        Guid caseId,
        AssignCaseRequest request,
        CancellationToken cancellationToken)
    {
        var incident = await _dbContext.Cases
            .Include(currentCase => currentCase.Zone)
            .Include(currentCase => currentCase.AssignedStaff)
            .FirstOrDefaultAsync(currentCase => currentCase.Id == caseId, cancellationToken);

        if (incident is null)
        {
            return NotFound();
        }

        var targetStaff = await _dbContext.Staff
            .Include(staff => staff.Zone)
            .FirstOrDefaultAsync(staff => staff.Id == request.StaffId, cancellationToken);

        if (targetStaff is null)
        {
            return BadRequest(new { message = "Staff member was not found." });
        }

        if (incident.Status is CaseStatus.Completed or CaseStatus.Cancelled)
        {
            return BadRequest(new { message = "Closed cases cannot be assigned." });
        }

        if (!targetStaff.IsOnDuty)
        {
            return BadRequest(new { message = "Staff member is not currently on duty." });
        }

        var isSameStaffAssignment = incident.AssignedStaffId == targetStaff.Id;

        if (incident.AssignedStaffId is not null &&
            !isSameStaffAssignment)
        {
            var previousStaff = await _dbContext.Staff
                .FirstOrDefaultAsync(staff => staff.Id == incident.AssignedStaffId, cancellationToken);

            if (previousStaff is not null && previousStaff.CurrentCaseCount > 0)
            {
                previousStaff.CurrentCaseCount--;
                previousStaff.IsBusy = previousStaff.CurrentCaseCount > 0;
            }
        }

        incident.AssignedStaffId = targetStaff.Id;
        incident.AssignedStaff = targetStaff;
        // Assignment captures the handoff, then immediately moves the case into treatment.
        incident.Status = CaseStatus.InProgress;

        if (!isSameStaffAssignment)
        {
            targetStaff.CurrentCaseCount++;
        }

        targetStaff.IsBusy = targetStaff.CurrentCaseCount >= 2;

        _dbContext.WorkEvents.Add(new WorkEvent
        {
            Id = Guid.NewGuid(),
            StaffId = targetStaff.Id,
            EventType = "CaseAssigned",
            RelatedCaseId = incident.Id,
            Timestamp = DateTime.UtcNow,
            Notes = string.IsNullOrWhiteSpace(request.Notes)
                ? $"Assigned {incident.DisplayCode} from dashboard workflow."
                : request.Notes.Trim()
        });

        _dbContext.WorkEvents.Add(new WorkEvent
        {
            Id = Guid.NewGuid(),
            StaffId = targetStaff.Id,
            EventType = "CaseInProgress",
            RelatedCaseId = incident.Id,
            Timestamp = DateTime.UtcNow,
            Notes = $"{incident.DisplayCode} moved to InProgress after assignment."
        });

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "CaseAssigned",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "dashboard",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                staffId = targetStaff.Id,
                capturedStatus = CaseStatus.Assigned.ToString(),
                finalStatus = incident.Status.ToString(),
                source = "dashboard"
            }),
            Severity = AuditSeverity.Info
        });

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "CaseInProgress",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "dashboard",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                staffId = targetStaff.Id,
                reason = "Automatic transition after staff assignment",
                source = "dashboard"
            }),
            Severity = AuditSeverity.Info
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = ToDashboardCaseResponse(incident);
        await _hubContext.Clients.All.SendAsync("StaffAssigned", response, cancellationToken);

        return Ok(response);
    }

    [HttpPost("{caseId:guid}/escalate")]
    public async Task<ActionResult<EscalateCaseResponse>> Escalate(
        Guid caseId,
        EscalateCaseRequest request,
        CancellationToken cancellationToken)
    {
        var incident = await _dbContext.Cases
            .Include(currentCase => currentCase.Zone)
            .Include(currentCase => currentCase.AssignedStaff)
            .FirstOrDefaultAsync(currentCase => currentCase.Id == caseId, cancellationToken);

        if (incident is null)
        {
            return NotFound();
        }

        // Department lead notifications resolve before audit and email side effects.
        var departmentLead = request.NotifyDepartmentLead
            ? await _dbContext.Staff
                .AsNoTracking()
                .FirstOrDefaultAsync(staff =>
                    staff.IsDepartmentLead &&
                    staff.DepartmentLeadDepartment == incident.Department,
                    cancellationToken)
            : null;

        if (request.NotifyDepartmentLead && departmentLead is null)
        {
            return BadRequest(new { message = $"No department lead is configured for {FormatDepartment(incident.Department)}." });
        }

        incident.Severity = request.Level?.Equals("Critical", StringComparison.OrdinalIgnoreCase) == true
            ? CaseSeverity.Red
            : CaseSeverity.Orange;

        if (incident.Status == CaseStatus.Pending)
        {
            incident.Status = CaseStatus.InProgress;
        }

        if (incident.AssignedStaffId is not null)
        {
            _dbContext.WorkEvents.Add(new WorkEvent
            {
                Id = Guid.NewGuid(),
                StaffId = incident.AssignedStaffId.Value,
                EventType = "CaseEscalated",
                RelatedCaseId = incident.Id,
                Timestamp = DateTime.UtcNow,
                Notes = $"{request.Level ?? "Department Lead"} escalation: {request.Reason}".Trim()
            });
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "CaseEscalated",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "dashboard",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                level = request.Level,
                reason = request.Reason,
                notifyLead = request.NotifyDepartmentLead,
                departmentLeadId = departmentLead?.Id,
                departmentLeadEmail = departmentLead?.EmailAddress
            }),
            Severity = AuditSeverity.Critical
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        string? notificationWarning = null;

        if (request.NotifyDepartmentLead && departmentLead is not null)
        {
            try
            {
                await _escalationEmailService.SendEscalationEmailAsync(
                    incident,
                    departmentLead,
                    request.Level ?? "Department Lead",
                    request.Reason,
                    User.Identity?.Name ?? "dashboard",
                    CancellationToken.None);
            }
            catch (Exception exception)
            {
                notificationWarning = $"Escalation was recorded, but the email notification failed: {exception.GetBaseException().Message}";

                _dbContext.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    ActionType = "EscalationEmailFailed",
                    EntityType = nameof(Case),
                    EntityId = incident.Id.ToString(),
                    PerformedBy = User.Identity?.Name ?? "dashboard",
                    Timestamp = DateTime.UtcNow,
                    Details = JsonSerializer.Serialize(new
                    {
                        caseId = incident.Id,
                        departmentLeadId = departmentLead.Id,
                        departmentLeadEmail = departmentLead.EmailAddress,
                        exceptionType = exception.GetType().Name,
                        message = exception.GetBaseException().Message
                    }),
                    Severity = AuditSeverity.Warning
                });

                await _dbContext.SaveChangesAsync(CancellationToken.None);
            }
        }

        return Ok(new EscalateCaseResponse(ToDashboardCaseResponse(incident), notificationWarning));
    }

    [HttpPost("{caseId:guid}/complete")]
    public async Task<ActionResult<DashboardCaseResponse>> CompleteCase(
        Guid caseId,
        CompleteCaseRequest request,
        CancellationToken cancellationToken)
    {
        var incident = await _dbContext.Cases
            .Include(currentCase => currentCase.Zone)
            .Include(currentCase => currentCase.AssignedStaff)
            .FirstOrDefaultAsync(currentCase => currentCase.Id == caseId, cancellationToken);

        if (incident is null)
        {
            return NotFound();
        }

        incident.Status = CaseStatus.Completed;
        incident.Prescription = NormalizeOptionalText(request.Prescription) ?? incident.Prescription;

        if (incident.AssignedStaffId is not null)
        {
            _dbContext.WorkEvents.Add(new WorkEvent
            {
                Id = Guid.NewGuid(),
                StaffId = incident.AssignedStaffId.Value,
                EventType = "CaseCompleted",
                RelatedCaseId = incident.Id,
                Timestamp = DateTime.UtcNow,
                Notes = string.IsNullOrWhiteSpace(request.Notes)
                    ? $"Completed {incident.DisplayCode}. Prescription: {incident.Prescription ?? "Not captured"}."
                    : $"{request.Notes.Trim()} Prescription: {incident.Prescription ?? "Not captured"}."
            });
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "CaseCompleted",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "dashboard",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                notes = request.Notes,
                prescription = incident.Prescription,
                source = "dashboard"
            }),
            Severity = AuditSeverity.Info
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDashboardCaseResponse(incident));
    }

    [HttpPost("{caseId:guid}/cancel")]
    public async Task<ActionResult<DashboardCaseResponse>> CancelCase(
        Guid caseId,
        CancelCaseRequest request,
        CancellationToken cancellationToken)
    {
        var incident = await _dbContext.Cases
            .Include(currentCase => currentCase.Zone)
            .Include(currentCase => currentCase.AssignedStaff)
            .FirstOrDefaultAsync(currentCase => currentCase.Id == caseId, cancellationToken);

        if (incident is null)
        {
            return NotFound();
        }

        if (incident.Status == CaseStatus.Completed)
        {
            return BadRequest(new { message = "Completed cases cannot be cancelled." });
        }

        if (incident.Status == CaseStatus.Cancelled)
        {
            return BadRequest(new { message = "This case is already cancelled." });
        }

        var wasActiveAssignment = incident.Status is CaseStatus.Assigned or CaseStatus.InProgress;
        incident.Status = CaseStatus.Cancelled;
        incident.PatientStatus = "Cancelled";
        incident.CancellationReason = NormalizeOptionalText(request.Notes) ?? incident.CancellationReason ?? "Cancelled from dashboard workflow.";

        if (incident.AssignedStaffId is not null)
        {
            if (wasActiveAssignment && incident.AssignedStaff is not null && incident.AssignedStaff.CurrentCaseCount > 0)
            {
                incident.AssignedStaff.CurrentCaseCount--;
                incident.AssignedStaff.IsBusy = incident.AssignedStaff.CurrentCaseCount >= 2;
            }

            _dbContext.WorkEvents.Add(new WorkEvent
            {
                Id = Guid.NewGuid(),
                StaffId = incident.AssignedStaffId.Value,
                EventType = "CaseCancelled",
                RelatedCaseId = incident.Id,
                Timestamp = DateTime.UtcNow,
                Notes = incident.CancellationReason
            });
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "CaseCancelled",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "dashboard",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                reason = incident.CancellationReason,
                source = "dashboard"
            }),
            Severity = AuditSeverity.Warning
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = ToDashboardCaseResponse(incident);
        await _hubContext.Clients.All.SendAsync("CaseUpdated", response, cancellationToken);

        return Ok(response);
    }

    [HttpPost("{caseId:guid}/unassign")]
    public async Task<ActionResult<DashboardCaseResponse>> UnassignStaff(
        Guid caseId,
        CancellationToken cancellationToken)
    {
        var incident = await _dbContext.Cases
            .Include(currentCase => currentCase.Zone)
            .Include(currentCase => currentCase.AssignedStaff)
            .FirstOrDefaultAsync(currentCase => currentCase.Id == caseId, cancellationToken);

        if (incident is null)
        {
            return NotFound();
        }

        var previousStaffId = incident.AssignedStaffId;
        var previousStaffName = incident.AssignedStaff?.Name ?? "Unassigned";

        if (previousStaffId is not null)
        {
            var previousStaff = incident.AssignedStaff ?? await _dbContext.Staff
                .FirstOrDefaultAsync(staff => staff.Id == previousStaffId, cancellationToken);

            if (previousStaff is not null)
            {
                if (previousStaff.CurrentCaseCount > 0)
                {
                    previousStaff.CurrentCaseCount--;
                }

                previousStaff.IsBusy = previousStaff.CurrentCaseCount >= 2;

                _dbContext.WorkEvents.Add(new WorkEvent
                {
                    Id = Guid.NewGuid(),
                    StaffId = previousStaff.Id,
                    EventType = "CaseUnassigned",
                    RelatedCaseId = incident.Id,
                    Timestamp = DateTime.UtcNow,
                    Notes = $"Unassigned {incident.DisplayCode} from {previousStaff.Name}."
                });
            }
        }

        incident.AssignedStaffId = null;
        incident.AssignedStaff = null;
        incident.Status = CaseStatus.Pending;

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = "CaseUnassigned",
            EntityType = nameof(Case),
            EntityId = incident.Id.ToString(),
            PerformedBy = User.Identity?.Name ?? "dashboard",
            Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new
            {
                caseId = incident.Id,
                previousStaffId,
                previousStaffName,
                source = "dashboard"
            }),
            Severity = AuditSeverity.Warning
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDashboardCaseResponse(incident));
    }

    private static DashboardCaseResponse ToDashboardCaseResponse(Case incident)
    {
        return new DashboardCaseResponse(
            incident.Id,
            incident.DisplayCode,
            incident.PatientName,
            incident.PatientIdNumber,
            incident.Age,
            incident.Gender,
            incident.Address,
            incident.NextOfKinName,
            incident.NextOfKinRelationship,
            incident.NextOfKinPhone,
            incident.Severity.ToString(),
            incident.Department.ToString(),
            incident.SymptomsSummary,
            incident.RequiredSpecialization,
            incident.Zone?.Name ?? "Unassigned",
            incident.ETA,
            incident.AssignedStaffId,
            incident.AssignedStaff?.Name,
            incident.Status.ToString(),
            incident.PatientStatus,
            incident.BloodPressure,
            incident.HeartRate,
            incident.RespiratoryRate,
            incident.Temperature,
            incident.OxygenSaturation,
            incident.ConsciousnessLevel,
            incident.ChronicConditions,
            incident.CurrentMedications,
            incident.Allergies,
            incident.MedicalAidScheme,
            incident.ParamedicNotes,
            incident.Prescription,
            incident.CancellationReason,
            incident.CreatedAt,
            null);
    }

    private static bool TryParseEnum<TEnum>(string value, out TEnum result)
        where TEnum : struct
    {
        return Enum.TryParse(NormalizeEnumToken(value), ignoreCase: true, out result);
    }

    private static string NormalizeEnumToken(string value)
    {
        return (value ?? string.Empty).Replace(" ", string.Empty).Replace("_", string.Empty).Replace("-", string.Empty);
    }

    private static string FormatDepartment(CaseDepartment department)
    {
        return department.ToString().Replace("CriticalCare", "Critical Care");
    }

    private static string NormalizePatientStatus(string? patientStatus)
    {
        return string.IsNullOrWhiteSpace(patientStatus)
            ? "Arrived"
            : patientStatus.Trim();
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
