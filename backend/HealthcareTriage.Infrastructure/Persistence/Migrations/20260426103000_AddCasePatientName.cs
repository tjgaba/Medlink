using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCasePatientName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PatientName",
                table: "Cases",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE "Cases"
                SET "PatientName" = CASE "DisplayCode"
                    WHEN 'CASE-001' THEN 'Sipho Dlamini'
                    WHEN 'CASE-002' THEN 'Ayesha Khan'
                    WHEN 'CASE-003' THEN 'Johan Pretorius'
                    WHEN 'CASE-004' THEN 'Mia Mokoena'
                    WHEN 'CASE-005' THEN 'Nomsa Nkosi'
                    WHEN 'CASE-006' THEN 'Peter van der Merwe'
                    WHEN 'CASE-007' THEN 'Lindiwe Maseko'
                    WHEN 'CASE-008' THEN 'Thandi Jacobs'
                    WHEN 'CASE-009' THEN 'Kabelo Molefe'
                    WHEN 'CASE-010' THEN 'Fatima Hendricks'
                    WHEN 'CASE-011' THEN 'Daniel Naicker'
                    WHEN 'CASE-012' THEN 'Grace Khumalo'
                    ELSE 'Patient ' || COALESCE(NULLIF("DisplayCode", ''), RIGHT("Id"::text, 4))
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PatientName",
                table: "Cases");
        }
    }
}
