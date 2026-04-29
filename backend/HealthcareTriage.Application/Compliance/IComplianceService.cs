using HealthcareTriage.Domain.Entities;

namespace HealthcareTriage.Application.Compliance;

public interface IComplianceService
{
    bool IsWithinWorkingHours(Staff staff);
    bool HasSufficientRest(Staff staff);
    bool IsOvertimeExceeded(Staff staff);
    bool IsZoneUnderstaffed(string zone, IReadOnlyCollection<Staff> staff);
    ComplianceRiskLevel EvaluateRisk(Staff staff, Case incident, string delegationType);
    ComplianceRiskLevel EvaluateShiftDelegation(Staff fromStaff, Staff toStaff, Case incident);
}
