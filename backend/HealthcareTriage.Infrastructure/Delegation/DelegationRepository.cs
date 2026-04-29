using HealthcareTriage.Application.Delegation;
using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HealthcareTriage.Infrastructure.Delegation;

public sealed class DelegationRepository : IDelegationRepository
{
    private readonly HealthcareTriageDbContext _dbContext;

    public DelegationRepository(HealthcareTriageDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Staff?> GetStaffAsync(Guid staffId, CancellationToken cancellationToken)
    {
        return _dbContext.Staff
            .Include(staff => staff.Zone)
            .SingleOrDefaultAsync(staff => staff.Id == staffId, cancellationToken);
    }

    public Task<Case?> GetCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return _dbContext.Cases
            .Include(incident => incident.Zone)
            .ThenInclude(zone => zone!.AdjacentZones)
            .SingleOrDefaultAsync(incident => incident.Id == caseId, cancellationToken);
    }

    public Task<DelegationRequest?> GetDelegationRequestAsync(Guid requestId, CancellationToken cancellationToken)
    {
        return _dbContext.DelegationRequests
            .Include(request => request.FromStaff)
            .Include(request => request.ToStaff)
            .Include(request => request.Case)
            .ThenInclude(incident => incident!.Zone)
            .ThenInclude(zone => zone!.AdjacentZones)
            .SingleOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public async Task AddDelegationRequestAsync(DelegationRequest request, CancellationToken cancellationToken)
    {
        await _dbContext.DelegationRequests.AddAsync(request, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
