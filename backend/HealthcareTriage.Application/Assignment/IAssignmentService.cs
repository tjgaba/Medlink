using HealthcareTriage.Domain.Entities;

namespace HealthcareTriage.Application.Assignment;

public interface IAssignmentService
{
    Task<Staff?> AssignStaffAsync(
        Case incident,
        IReadOnlyCollection<Staff> staffPool,
        CancellationToken cancellationToken = default);
}
