using HealthcareTriage.Domain.Entities;

namespace HealthcareTriage.Application.Delegation;

public interface IDelegationService
{
    Task<DelegationRequest> CreateDelegationRequestAsync(
        Guid fromStaffId,
        Guid toStaffId,
        Guid caseId,
        string type,
        string reason,
        CancellationToken cancellationToken = default);

    Task AcceptDelegationAsync(Guid requestId, CancellationToken cancellationToken = default);
    Task DeclineDelegationAsync(Guid requestId, CancellationToken cancellationToken = default);
}
