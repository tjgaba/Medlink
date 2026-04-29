using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.API.DTOs.ETA;

public sealed record TravelEtaRequest(
    double DistanceKm,
    double AvgSpeedKmh,
    CaseSeverity Severity);

public sealed record EtaResponse(
    int Minutes,
    string DisplayText);
