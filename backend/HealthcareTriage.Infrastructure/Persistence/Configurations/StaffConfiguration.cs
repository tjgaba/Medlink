using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    public void Configure(EntityTypeBuilder<Staff> builder)
    {
        builder.HasKey(staff => staff.Id);

        builder.Property(staff => staff.Name)
            .HasMaxLength(160)
            .IsRequired();

        builder.Property(staff => staff.Specialization)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(staff => staff.TotalHoursWorked)
            .HasPrecision(7, 2);

        builder.Property(staff => staff.LastShiftEndedAt);

        builder.Property(staff => staff.EmailAddress)
            .HasMaxLength(254);

        builder.Property(staff => staff.PhoneNumber)
            .HasMaxLength(40);

        builder.Property(staff => staff.DepartmentLeadDepartment)
            .HasConversion<string>()
            .HasMaxLength(80);

        builder.HasOne(staff => staff.Zone)
            .WithMany(zone => zone.StaffMembers)
            .HasForeignKey(staff => staff.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
