namespace HealthcareTriage.Domain.Entities;

public sealed class WorkEvent
{
    public Guid Id { get; set; }
    public Guid StaffId { get; set; }
    public Staff? Staff { get; set; }
    public string EventType { get; set; } = string.Empty;
    public Guid? RelatedCaseId { get; set; }
    public DateTime Timestamp { get; set; }
    public int? DurationMinutes { get; set; }
    public string Notes { get; set; } = string.Empty;
}
