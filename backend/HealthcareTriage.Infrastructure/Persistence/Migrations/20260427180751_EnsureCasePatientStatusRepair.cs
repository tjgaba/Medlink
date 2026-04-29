using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnsureCasePatientStatusRepair : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Cases"
                ADD COLUMN IF NOT EXISTS "PatientStatus" character varying(40) NOT NULL DEFAULT 'Arrived';
                """);

            migrationBuilder.Sql("""
                UPDATE "Cases"
                SET "PatientStatus" = CASE "Status"
                    WHEN 'InProgress' THEN 'Under Treatment'
                    WHEN 'Pending' THEN 'Waiting'
                    WHEN 'Completed' THEN 'Transferred'
                    ELSE COALESCE("PatientStatus", 'Arrived')
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
