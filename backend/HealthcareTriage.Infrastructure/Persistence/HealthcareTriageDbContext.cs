using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HealthcareTriage.Infrastructure.Persistence;

public sealed class HealthcareTriageDbContext : DbContext
{
    public HealthcareTriageDbContext(DbContextOptions<HealthcareTriageDbContext> options)
        : base(options)
    {
    }

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Case> Cases => Set<Case>();
    public DbSet<DelegationAuditLog> DelegationAuditLogs => Set<DelegationAuditLog>();
    public DbSet<DelegationRequest> DelegationRequests => Set<DelegationRequest>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<User> Users => Set<User>();
    public DbSet<WorkEvent> WorkEvents => Set<WorkEvent>();
    public DbSet<WorkSession> WorkSessions => Set<WorkSession>();
    public DbSet<Zone> Zones => Set<Zone>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HealthcareTriageDbContext).Assembly);
    }
}
