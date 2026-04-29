using HealthcareTriage.Application.Fatigue;
using HealthcareTriage.Application.ETA;
using HealthcareTriage.Domain.Entities;

namespace HealthcareTriage.Application.Assignment;

public sealed class AssignmentService : IAssignmentService
{
    private readonly IFatigueService _fatigueService;
    private readonly IETAService _etaService;

    public AssignmentService(IFatigueService fatigueService, IETAService etaService)
    {
        _fatigueService = fatigueService;
        _etaService = etaService;
    }

    public Task<Staff?> AssignStaffAsync(
        Case incident,
        IReadOnlyCollection<Staff> staffPool,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(incident);
        ArgumentNullException.ThrowIfNull(staffPool);

        cancellationToken.ThrowIfCancellationRequested();

        var primaryCandidates = GetAvailableStaffForZone(staffPool, incident.ZoneId);
        var candidateScope = primaryCandidates.Any()
            ? primaryCandidates
            : GetAvailableStaffForAdjacentZones(incident, staffPool);

        var bestCandidate = candidateScope
            .OrderByDescending(staff => HasMatchingSkill(incident, staff))
            .ThenBy(staff => staff.CurrentCaseCount)
            .ThenBy(staff => _fatigueService.CalculateFatiguePenalty(staff, incident.Severity))
            .ThenByDescending(staff => staff.OptInOverride)
            .ThenBy(staff => EstimateResponseMinutes(incident, staff, staffPool))
            .ThenBy(staff => staff.Name)
            .FirstOrDefault();

        return Task.FromResult(bestCandidate);
    }

    private static IEnumerable<Staff> GetAvailableStaffForZone(
        IEnumerable<Staff> staffPool,
        Guid zoneId)
    {
        return staffPool.Where(staff =>
            staff.ZoneId == zoneId &&
            staff.IsOnDuty &&
            !staff.IsBusy);
    }

    private static IEnumerable<Staff> GetAvailableStaffForAdjacentZones(
        Case incident,
        IEnumerable<Staff> staffPool)
    {
        var adjacentZoneIds = incident.Zone?.AdjacentZones
            .Select(zone => zone.Id)
            .ToHashSet() ?? [];

        if (adjacentZoneIds.Count == 0)
        {
            return [];
        }

        return staffPool.Where(staff =>
            adjacentZoneIds.Contains(staff.ZoneId) &&
            staff.IsOnDuty &&
            !staff.IsBusy);
    }

    private static bool HasMatchingSkill(Case incident, Staff staff)
    {
        if (string.IsNullOrWhiteSpace(incident.RequiredSpecialization))
        {
            return true;
        }

        return string.Equals(
            staff.Specialization,
            incident.RequiredSpecialization,
            StringComparison.OrdinalIgnoreCase);
    }

    private int EstimateResponseMinutes(
        Case incident,
        Staff staff,
        IReadOnlyCollection<Staff> staffPool)
    {
        var zones = staffPool
            .Select(member => member.Zone)
            .Append(incident.Zone)
            .Where(zone => zone is not null)
            .Cast<Zone>()
            .DistinctBy(zone => zone.Id);

        return _etaService.EstimateInHospitalEtaMinutes(
            staff.Zone?.Name ?? staff.ZoneId.ToString(),
            incident.Zone?.Name ?? incident.ZoneId.ToString(),
            zones);
    }
}
