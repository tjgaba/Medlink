using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Domain.Entities;

public sealed class AuditLog
{
    public Guid Id { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Details { get; set; } = "{}";
    public AuditSeverity Severity { get; set; }
}
