using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class DelegationAuditLogConfiguration : IEntityTypeConfiguration<DelegationAuditLog>
{
    public void Configure(EntityTypeBuilder<DelegationAuditLog> builder)
    {
        builder.HasKey(log => log.Id);

        builder.Property(log => log.Type)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(log => log.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(log => log.Action)
            .HasMaxLength(80)
            .IsRequired();
    }
}
