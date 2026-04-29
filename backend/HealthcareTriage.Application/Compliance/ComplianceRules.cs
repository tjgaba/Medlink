namespace HealthcareTriage.Application.Compliance;

public sealed class ComplianceRules
{
    public decimal MaximumShiftHours { get; init; } = 12;
    public decimal WarningShiftHours { get; init; } = 10;
    public decimal OvertimeThresholdHours { get; init; } = 8;
    public TimeSpan MinimumRestPeriod { get; init; } = TimeSpan.FromHours(8);
    public int MaximumActiveCases { get; init; } = 4;
    public int WarningActiveCases { get; init; } = 3;
    public int MinimumAvailableStaffPerZone { get; init; } = 2;
}
