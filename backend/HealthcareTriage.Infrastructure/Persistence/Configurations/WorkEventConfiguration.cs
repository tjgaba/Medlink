using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class WorkEventConfiguration : IEntityTypeConfiguration<WorkEvent>
{
    public void Configure(EntityTypeBuilder<WorkEvent> builder)
    {
        builder.HasKey(workEvent => workEvent.Id);

        builder.Property(workEvent => workEvent.EventType)
            .HasMaxLength(80)
            .IsRequired();

        builder.Property(workEvent => workEvent.Notes)
            .HasMaxLength(500)
            .IsRequired();

        builder.HasIndex(workEvent => workEvent.StaffId);
        builder.HasIndex(workEvent => workEvent.Timestamp);
        builder.HasIndex(workEvent => workEvent.RelatedCaseId);

        builder.HasOne(workEvent => workEvent.Staff)
            .WithMany()
            .HasForeignKey(workEvent => workEvent.StaffId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
