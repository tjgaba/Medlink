using HealthcareTriage.Domain.Entities;

namespace HealthcareTriage.Application.Payroll;

public interface IPayrollTrackingService
{
    Task StartSessionAsync(
        Guid staffId,
        DateTime shiftStart,
        double scheduledHours,
        CancellationToken cancellationToken = default);

    Task EndSessionAsync(
        Guid staffId,
        DateTime shiftEnd,
        CancellationToken cancellationToken = default);

    Task LogEventAsync(
        Guid staffId,
        string eventType,
        Guid? caseId,
        int? durationMinutes,
        string notes,
        CancellationToken cancellationToken = default);

    bool IsOvertimeTriggered(WorkSession session);

    Task<IReadOnlyCollection<WorkSession>> GetSessionsByStaffAsync(
        Guid staffId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<WorkEvent>> GetEventsByCaseAsync(
        Guid caseId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<PayrollOvertimeSummary>> GetOvertimeByStaffForMonthAsync(
        int year,
        int month,
        CancellationToken cancellationToken = default);
}
