using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Domain.Entities;

public sealed class DelegationRequest
{
    public Guid Id { get; set; }
    public Guid FromStaffId { get; set; }
    public Staff? FromStaff { get; set; }
    public Guid ToStaffId { get; set; }
    public Staff? ToStaff { get; set; }
    public Guid CaseId { get; set; }
    public Case? Case { get; set; }
    public DelegationType Type { get; set; }
    public DelegationStatus Status { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
}
