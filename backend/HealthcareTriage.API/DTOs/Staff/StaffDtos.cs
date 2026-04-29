namespace HealthcareTriage.API.DTOs.Staff;

public sealed record StaffResponse(
    Guid Id,
    string Name,
    string Specialization,
    string Zone,
    bool IsOnDuty,
    bool IsBusy,
    int CurrentCaseCount,
    DateTimeOffset? CooldownUntil,
    decimal TotalHoursWorked,
    string? EmailAddress,
    string? PhoneNumber,
    bool IsDepartmentLead,
    string? DepartmentLeadDepartment);

public sealed record UpdateStaffProfileRequest(
    string Name,
    string Specialization,
    string? EmailAddress,
    string? PhoneNumber);
