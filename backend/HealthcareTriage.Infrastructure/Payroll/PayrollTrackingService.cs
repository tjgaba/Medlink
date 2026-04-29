using HealthcareTriage.Application.Audit;
using HealthcareTriage.Application.Payroll;
using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HealthcareTriage.Infrastructure.Payroll;

public sealed class PayrollTrackingService : IPayrollTrackingService
{
    private readonly HealthcareTriageDbContext _dbContext;
    private readonly IAuditService _auditService;

    public PayrollTrackingService(
        HealthcareTriageDbContext dbContext,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
    }

    public async Task StartSessionAsync(
        Guid staffId,
        DateTime shiftStart,
        double scheduledHours,
        CancellationToken cancellationToken = default)
    {
        if (scheduledHours <= 0)
        {
            throw new InvalidOperationException("Scheduled hours must be greater than zero.");
        }

        var hasOpenSession = await _dbContext.WorkSessions.AnyAsync(
            session => session.StaffId == staffId && session.ShiftEnd == null,
            cancellationToken);

        if (hasOpenSession)
        {
            throw new InvalidOperationException("Staff member already has an open work session.");
        }

        var session = new WorkSession
        {
            Id = Guid.NewGuid(),
            StaffId = staffId,
            ShiftStart = shiftStart,
            ScheduledHours = scheduledHours,
            ActualHoursWorked = 0,
            OvertimeHours = 0,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.WorkSessions.AddAsync(session, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await LogPayrollAuditAsync("WorkSessionStarted", staffId, session.Id, cancellationToken);
    }

    public async Task EndSessionAsync(
        Guid staffId,
        DateTime shiftEnd,
        CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.WorkSessions
            .Where(session => session.StaffId == staffId && session.ShiftEnd == null)
            .OrderByDescending(session => session.ShiftStart)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("No open work session was found for this staff member.");

        if (shiftEnd <= session.ShiftStart)
        {
            throw new InvalidOperationException("Shift end must be after shift start.");
        }

        session.ShiftEnd = shiftEnd;
        session.ActualHoursWorked = Math.Round((shiftEnd - session.ShiftStart).TotalHours, 2);
        session.OvertimeHours = Math.Max(0, Math.Round(session.ActualHoursWorked - session.ScheduledHours, 2));

        var staff = await _dbContext.Staff.FindAsync([staffId], cancellationToken);
        if (staff is not null)
        {
            staff.TotalHoursWorked += (decimal)session.ActualHoursWorked;
            staff.LastShiftEndedAt = new DateTimeOffset(DateTime.SpecifyKind(shiftEnd, DateTimeKind.Utc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await LogPayrollAuditAsync(
            session.OvertimeHours > 0 ? "OvertimeTriggered" : "WorkSessionEnded",
            staffId,
            session.Id,
            cancellationToken);
    }

    public async Task LogEventAsync(
        Guid staffId,
        string eventType,
        Guid? caseId,
        int? durationMinutes,
        string notes,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(eventType);

        var workEvent = new WorkEvent
        {
            Id = Guid.NewGuid(),
            StaffId = staffId,
            EventType = eventType.Trim(),
            RelatedCaseId = caseId,
            Timestamp = DateTime.UtcNow,
            DurationMinutes = durationMinutes,
            Notes = notes.Trim()
        };

        await _dbContext.WorkEvents.AddAsync(workEvent, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await LogPayrollAuditAsync(eventType.Trim(), staffId, workEvent.Id, cancellationToken);
    }

    public bool IsOvertimeTriggered(WorkSession session)
    {
        ArgumentNullException.ThrowIfNull(session);

        return session.ActualHoursWorked > session.ScheduledHours;
    }

    public async Task<IReadOnlyCollection<WorkSession>> GetSessionsByStaffAsync(
        Guid staffId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.WorkSessions
            .AsNoTracking()
            .Where(session =>
                session.StaffId == staffId &&
                session.ShiftStart >= from &&
                session.ShiftStart <= to)
            .OrderByDescending(session => session.ShiftStart)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<WorkEvent>> GetEventsByCaseAsync(
        Guid caseId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.WorkEvents
            .AsNoTracking()
            .Where(workEvent => workEvent.RelatedCaseId == caseId)
            .OrderByDescending(workEvent => workEvent.Timestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<PayrollOvertimeSummary>> GetOvertimeByStaffForMonthAsync(
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        var from = new DateTime(year, month, 1);
        var to = from.AddMonths(1);

        return await _dbContext.WorkSessions
            .AsNoTracking()
            .Where(session =>
                session.ShiftStart >= from &&
                session.ShiftStart < to &&
                session.OvertimeHours > 0)
            .GroupBy(session => session.StaffId)
            .Select(group => new PayrollOvertimeSummary(
                group.Key,
                Math.Round(group.Sum(session => session.OvertimeHours), 2)))
            .ToListAsync(cancellationToken);
    }

    private Task LogPayrollAuditAsync(
        string actionType,
        Guid staffId,
        Guid entityId,
        CancellationToken cancellationToken)
    {
        var details = $$"""
        {
          "staffId": "{{staffId}}",
          "entityId": "{{entityId}}",
          "module": "PayrollTracking"
        }
        """;

        return _auditService.LogAsync(
            actionType,
            "PayrollTracking",
            entityId.ToString(),
            staffId.ToString(),
            details,
            "Info",
            cancellationToken);
    }
}
