using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Application.Fatigue;

public sealed class FatigueService : IFatigueService
{
    private const int StandardCooldownPenalty = 10;
    private const int OptInCooldownPenalty = 3;

    public bool IsInCooldown(Staff staff)
    {
        ArgumentNullException.ThrowIfNull(staff);

        return staff.CooldownUntil is not null &&
            staff.CooldownUntil > DateTimeOffset.UtcNow;
    }

    public int CalculateFatiguePenalty(Staff staff)
    {
        ArgumentNullException.ThrowIfNull(staff);

        if (!IsInCooldown(staff))
        {
            return 0;
        }

        return staff.OptInOverride
            ? OptInCooldownPenalty
            : StandardCooldownPenalty;
    }

    public int CalculateFatiguePenalty(Staff staff, CaseSeverity severity)
    {
        ArgumentNullException.ThrowIfNull(staff);

        if (severity == CaseSeverity.Red)
        {
            return 0;
        }

        return CalculateFatiguePenalty(staff);
    }

    public DateTimeOffset CalculateCooldownEnd(CaseSeverity severity)
    {
        var cooldownDuration = severity switch
        {
            CaseSeverity.Green => TimeSpan.FromMinutes(3),
            CaseSeverity.Yellow => TimeSpan.FromMinutes(5),
            CaseSeverity.Orange => TimeSpan.FromMinutes(8),
            CaseSeverity.Red => TimeSpan.FromMinutes(10),
            _ => TimeSpan.FromMinutes(5)
        };

        return DateTimeOffset.UtcNow.Add(cooldownDuration);
    }

    public void ApplyCooldown(Staff staff, CaseSeverity severity)
    {
        ArgumentNullException.ThrowIfNull(staff);

        staff.CooldownUntil = CalculateCooldownEnd(severity);
        staff.IsBusy = false;

        if (staff.CurrentCaseCount > 0)
        {
            staff.CurrentCaseCount--;
        }
    }
}
