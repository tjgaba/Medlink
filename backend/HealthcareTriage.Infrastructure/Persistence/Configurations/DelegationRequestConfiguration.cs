using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class DelegationRequestConfiguration : IEntityTypeConfiguration<DelegationRequest>
{
    public void Configure(EntityTypeBuilder<DelegationRequest> builder)
    {
        builder.HasKey(request => request.Id);

        builder.Property(request => request.Type)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(request => request.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(request => request.Reason)
            .HasMaxLength(500)
            .IsRequired();

        builder.HasOne(request => request.FromStaff)
            .WithMany(staff => staff.SentDelegationRequests)
            .HasForeignKey(request => request.FromStaffId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(request => request.ToStaff)
            .WithMany(staff => staff.ReceivedDelegationRequests)
            .HasForeignKey(request => request.ToStaffId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(request => request.Case)
            .WithMany(incident => incident.DelegationRequests)
            .HasForeignKey(request => request.CaseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
