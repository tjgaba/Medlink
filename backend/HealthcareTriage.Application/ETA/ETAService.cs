using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Application.ETA;

public sealed class ETAService : IETAService
{
    private const int MinimumEtaMinutes = 1;
    private const int MaximumTravelEtaMinutes = 180;
    private const int UnknownZoneEtaMinutes = 5;

    public int CalculateTravelEtaMinutes(double distanceKm, double avgSpeedKmh)
    {
        if (distanceKm <= 0 || avgSpeedKmh <= 0)
        {
            return UnknownZoneEtaMinutes;
        }

        var minutes = (int)Math.Ceiling(distanceKm / avgSpeedKmh * 60);
        return Math.Clamp(minutes, MinimumEtaMinutes, MaximumTravelEtaMinutes);
    }

    public int EstimateInHospitalEtaMinutes(
        string staffZone,
        string caseZone,
        IEnumerable<Zone> zones)
    {
        if (string.IsNullOrWhiteSpace(staffZone) ||
            string.IsNullOrWhiteSpace(caseZone))
        {
            return UnknownZoneEtaMinutes;
        }

        if (string.Equals(staffZone, caseZone, StringComparison.OrdinalIgnoreCase))
        {
            return 2;
        }

        var zoneMap = zones
            .Where(zone => !string.IsNullOrWhiteSpace(zone.Name))
            .GroupBy(zone => zone.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);

        if (!zoneMap.TryGetValue(staffZone, out var staffZoneEntity))
        {
            return UnknownZoneEtaMinutes;
        }

        var isAdjacent = staffZoneEntity.AdjacentZones.Any(zone =>
            string.Equals(zone.Name, caseZone, StringComparison.OrdinalIgnoreCase));

        return isAdjacent ? 4 : 8;
    }

    public int ApplySeverityAdjustment(int baseMinutes, CaseSeverity severity)
    {
        var adjustedMinutes = severity == CaseSeverity.Red
            ? baseMinutes - 1
            : baseMinutes;

        return Math.Max(MinimumEtaMinutes, adjustedMinutes);
    }

    public string FormatEta(int minutes)
    {
        var clampedMinutes = Math.Max(MinimumEtaMinutes, minutes);
        return $"ETA: ~{clampedMinutes} min";
    }
}
