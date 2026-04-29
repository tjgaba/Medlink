namespace HealthcareTriage.Application.Payroll;

public sealed record PayrollOvertimeSummary(
    Guid StaffId,
    double OvertimeHours);
