using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(log => log.Id);

        builder.Property(log => log.ActionType)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(log => log.EntityType)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(log => log.EntityId)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(log => log.PerformedBy)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(log => log.Details)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(log => log.Severity)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(log => log.ActionType);
        builder.HasIndex(log => log.EntityId);
        builder.HasIndex(log => log.PerformedBy);
        builder.HasIndex(log => log.Timestamp);
    }
}
