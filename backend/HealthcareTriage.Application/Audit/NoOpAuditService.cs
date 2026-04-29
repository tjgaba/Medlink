namespace HealthcareTriage.Application.Audit;

public sealed class NoOpAuditService : IAuditService
{
    public Task LogAsync(
        string actionType,
        string entityType,
        string entityId,
        string performedBy,
        string details,
        string severity,
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
