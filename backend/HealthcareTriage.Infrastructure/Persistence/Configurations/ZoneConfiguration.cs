using HealthcareTriage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HealthcareTriage.Infrastructure.Persistence.Configurations;

public sealed class ZoneConfiguration : IEntityTypeConfiguration<Zone>
{
    public void Configure(EntityTypeBuilder<Zone> builder)
    {
        builder.HasKey(zone => zone.Id);

        builder.Property(zone => zone.Name)
            .HasMaxLength(120)
            .IsRequired();

        builder.HasIndex(zone => zone.Name)
            .IsUnique();

        builder.HasMany(zone => zone.AdjacentZones)
            .WithMany(zone => zone.AdjacentToZones)
            .UsingEntity<Dictionary<string, object>>(
                "ZoneAdjacency",
                right => right.HasOne<Zone>()
                    .WithMany()
                    .HasForeignKey("AdjacentZoneId")
                    .OnDelete(DeleteBehavior.Restrict),
                left => left.HasOne<Zone>()
                    .WithMany()
                    .HasForeignKey("ZoneId")
                    .OnDelete(DeleteBehavior.Cascade),
                join =>
                {
                    join.HasKey("ZoneId", "AdjacentZoneId");
                    join.ToTable("ZoneAdjacencies");
                });
    }
}
