using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Application.Fatigue;

public interface IFatigueService
{
    bool IsInCooldown(Staff staff);
    int CalculateFatiguePenalty(Staff staff);
    int CalculateFatiguePenalty(Staff staff, CaseSeverity severity);
    DateTimeOffset CalculateCooldownEnd(CaseSeverity severity);
    void ApplyCooldown(Staff staff, CaseSeverity severity);
}
