namespace HealthcareTriage.API.DTOs.Delegation;

public sealed record CreateDelegationRequest(
    Guid FromStaffId,
    Guid ToStaffId,
    Guid CaseId,
    string Type,
    string Reason);
