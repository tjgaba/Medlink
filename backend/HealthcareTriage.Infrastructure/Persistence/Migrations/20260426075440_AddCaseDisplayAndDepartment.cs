using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseDisplayAndDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Cases",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DisplayCode",
                table: "Cases",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SymptomsSummary",
                table: "Cases",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE "Cases"
                SET "DisplayCode" = numbered_cases."DisplayCode",
                    "Department" = CASE
                        WHEN "Cases"."RequiredSpecialization" ILIKE '%Emergency%' THEN 'Trauma'
                        WHEN "Cases"."RequiredSpecialization" ILIKE '%Triage%' THEN 'General'
                        WHEN "Cases"."RequiredSpecialization" ILIKE '%Radiology%' THEN 'Radiology'
                        WHEN "Cases"."RequiredSpecialization" ILIKE '%Pediatrics%' THEN 'Pediatrics'
                        WHEN "Cases"."RequiredSpecialization" ILIKE '%Critical%' THEN 'CriticalCare'
                        ELSE 'General'
                    END,
                    "SymptomsSummary" = 'Symptoms pending AI review.'
                FROM (
                    SELECT "Id", 'CASE-' || LPAD(ROW_NUMBER() OVER (ORDER BY "CreatedAt")::text, 3, '0') AS "DisplayCode"
                    FROM "Cases"
                ) AS numbered_cases
                WHERE "Cases"."Id" = numbered_cases."Id";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Cases_DisplayCode",
                table: "Cases",
                column: "DisplayCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Cases_DisplayCode",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "DisplayCode",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "SymptomsSummary",
                table: "Cases");
        }
    }
}
