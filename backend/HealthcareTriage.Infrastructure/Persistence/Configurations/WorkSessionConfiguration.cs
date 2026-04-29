using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class WorkSessionConfiguration : IEntityTypeConfiguration<WorkSession>
{
    public void Configure(EntityTypeBuilder<WorkSession> builder)
    {
        builder.HasKey(session => session.Id);

        builder.Property(session => session.ScheduledHours)
            .IsRequired();

        builder.Property(session => session.ActualHoursWorked)
            .IsRequired();

        builder.Property(session => session.OvertimeHours)
            .IsRequired();

        builder.HasIndex(session => session.StaffId);
        builder.HasIndex(session => session.ShiftStart);

        builder.HasOne(session => session.Staff)
            .WithMany()
            .HasForeignKey(session => session.StaffId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
