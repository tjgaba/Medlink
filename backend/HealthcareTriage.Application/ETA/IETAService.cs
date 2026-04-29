using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Application.ETA;

public interface IETAService
{
    int CalculateTravelEtaMinutes(double distanceKm, double avgSpeedKmh);
    int EstimateInHospitalEtaMinutes(string staffZone, string caseZone, IEnumerable<Zone> zones);
    int ApplySeverityAdjustment(int baseMinutes, CaseSeverity severity);
    string FormatEta(int minutes);
}
