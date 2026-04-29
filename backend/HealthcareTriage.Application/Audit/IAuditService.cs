namespace HealthcareTriage.Application.Audit;

public interface IAuditService
{
    Task LogAsync(
        string actionType,
        string entityType,
        string entityId,
        string performedBy,
        string details,
        string severity,
        CancellationToken cancellationToken = default);
}
