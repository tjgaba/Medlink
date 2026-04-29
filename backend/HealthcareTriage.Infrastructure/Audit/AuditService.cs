using HealthcareTriage.Application.Audit;
using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;
using HealthcareTriage.Infrastructure.Persistence;

namespace HealthcareTriage.Infrastructure.Audit;

public sealed class AuditService : IAuditService
{
    private readonly HealthcareTriageDbContext _dbContext;

    public AuditService(HealthcareTriageDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task LogAsync(
        string actionType,
        string entityType,
        string entityId,
        string performedBy,
        string details,
        string severity,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actionType);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityType);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityId);
        ArgumentException.ThrowIfNullOrWhiteSpace(performedBy);

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            ActionType = actionType.Trim(),
            EntityType = entityType.Trim(),
            EntityId = entityId.Trim(),
            PerformedBy = performedBy.Trim(),
            Details = string.IsNullOrWhiteSpace(details) ? "{}" : details.Trim(),
            Severity = ParseSeverity(severity),
            Timestamp = DateTime.UtcNow
        };

        await _dbContext.AuditLogs.AddAsync(auditLog, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static AuditSeverity ParseSeverity(string severity)
    {
        return Enum.TryParse<AuditSeverity>(severity, ignoreCase: true, out var parsedSeverity)
            ? parsedSeverity
            : AuditSeverity.Info;
    }
}
