using HealthcareTriage.Domain.Entities;

namespace HealthcareTriage.Application.Notifications;

public interface IEscalationEmailService
{
    Task SendEscalationEmailAsync(
        Case incident,
        Staff departmentLead,
        string escalationLevel,
        string reason,
        string performedBy,
        CancellationToken cancellationToken = default);
}
