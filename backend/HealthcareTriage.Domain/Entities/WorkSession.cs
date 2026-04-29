namespace HealthcareTriage.Domain.Entities;

public sealed class WorkSession
{
    public Guid Id { get; set; }
    public Guid StaffId { get; set; }
    public Staff? Staff { get; set; }
    public DateTime ShiftStart { get; set; }
    public DateTime? ShiftEnd { get; set; }
    public double ScheduledHours { get; set; }
    public double ActualHoursWorked { get; set; }
    public double OvertimeHours { get; set; }
    public DateTime CreatedAt { get; set; }
}
