using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Domain.Entities;

public sealed class DelegationAuditLog
{
    public Guid Id { get; set; }
    public Guid DelegationRequestId { get; set; }
    public Guid FromStaffId { get; set; }
    public Guid ToStaffId { get; set; }
    public Guid CaseId { get; set; }
    public DelegationType Type { get; set; }
    public DelegationStatus Status { get; set; }
    public string Action { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
}
