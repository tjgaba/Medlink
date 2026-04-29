using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Domain.Entities;

public sealed class Staff
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid ZoneId { get; set; }
    public Zone? Zone { get; set; }
    public string Specialization { get; set; } = string.Empty;
    public bool IsOnDuty { get; set; }
    public bool IsBusy { get; set; }
    public int CurrentCaseCount { get; set; }
    public DateTimeOffset? CooldownUntil { get; set; }
    public bool OptInOverride { get; set; }
    public decimal TotalHoursWorked { get; set; }
    public DateTimeOffset? LastShiftEndedAt { get; set; }
    public string? EmailAddress { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsDepartmentLead { get; set; }
    public CaseDepartment? DepartmentLeadDepartment { get; set; }

    public ICollection<Case> AssignedCases { get; set; } = new List<Case>();
    public ICollection<DelegationRequest> SentDelegationRequests { get; set; } = new List<DelegationRequest>();
    public ICollection<DelegationRequest> ReceivedDelegationRequests { get; set; } = new List<DelegationRequest>();
}
