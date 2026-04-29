using HealthcareTriage.Domain.Entities;

namespace HealthcareTriage.Application.Delegation;

public interface IDelegationRepository
{
    Task<Staff?> GetStaffAsync(Guid staffId, CancellationToken cancellationToken);
    Task<Case?> GetCaseAsync(Guid caseId, CancellationToken cancellationToken);
    Task<DelegationRequest?> GetDelegationRequestAsync(Guid requestId, CancellationToken cancellationToken);
    Task AddDelegationRequestAsync(DelegationRequest request, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
