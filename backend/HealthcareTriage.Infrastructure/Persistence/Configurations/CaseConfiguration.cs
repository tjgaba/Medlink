using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class CaseConfiguration : IEntityTypeConfiguration<Case>
{
    public void Configure(EntityTypeBuilder<Case> builder)
    {
        builder.HasKey(incident => incident.Id);

        builder.Property(incident => incident.DisplayCode)
            .HasMaxLength(30)
            .IsRequired();

        builder.HasIndex(incident => incident.DisplayCode)
            .IsUnique();

        builder.Property(incident => incident.PatientName)
            .HasMaxLength(160)
            .IsRequired();

        builder.Property(incident => incident.PatientIdNumber)
            .HasMaxLength(60);

        builder.Property(incident => incident.Gender)
            .HasMaxLength(40);

        builder.Property(incident => incident.Address)
            .HasMaxLength(240);

        builder.Property(incident => incident.NextOfKinName)
            .HasMaxLength(160);

        builder.Property(incident => incident.NextOfKinRelationship)
            .HasMaxLength(80);

        builder.Property(incident => incident.NextOfKinPhone)
            .HasMaxLength(40);

        builder.Property(incident => incident.Severity)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(incident => incident.Department)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(incident => incident.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(incident => incident.PatientStatus)
            .HasMaxLength(40)
            .IsRequired();

        builder.Property(incident => incident.SymptomsSummary)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(incident => incident.BloodPressure)
            .HasMaxLength(30);

        builder.Property(incident => incident.ConsciousnessLevel)
            .HasMaxLength(80);

        builder.Property(incident => incident.ChronicConditions)
            .HasMaxLength(500);

        builder.Property(incident => incident.CurrentMedications)
            .HasMaxLength(500);

        builder.Property(incident => incident.Allergies)
            .HasMaxLength(500);

        builder.Property(incident => incident.MedicalAidScheme)
            .HasMaxLength(80);

        builder.Property(incident => incident.ParamedicNotes)
            .HasMaxLength(1000);

        builder.Property(incident => incident.Prescription)
            .HasMaxLength(1000);

        builder.Property(incident => incident.CancellationReason)
            .HasMaxLength(1000);

        builder.Property(incident => incident.RequiredSpecialization)
            .HasMaxLength(120);

        builder.HasOne(incident => incident.Zone)
            .WithMany(zone => zone.Cases)
            .HasForeignKey(incident => incident.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(incident => incident.AssignedStaff)
            .WithMany(staff => staff.AssignedCases)
            .HasForeignKey(incident => incident.AssignedStaffId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
