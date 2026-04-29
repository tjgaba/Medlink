namespace HealthcareTriage.API.DTOs.Payroll;

public sealed record StartWorkSessionRequest(
    Guid StaffId,
    DateTime ShiftStart,
    double ScheduledHours);

public sealed record EndWorkSessionRequest(
    Guid StaffId,
    DateTime ShiftEnd);

public sealed record LogWorkEventRequest(
    Guid StaffId,
    string EventType,
    Guid? RelatedCaseId,
    int? DurationMinutes,
    string Notes);
