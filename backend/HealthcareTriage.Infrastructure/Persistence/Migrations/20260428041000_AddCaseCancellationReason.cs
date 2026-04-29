using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(HealthcareTriageDbContext))]
    [Migration("20260428041000_AddCaseCancellationReason")]
    public partial class AddCaseCancellationReason : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "Cases",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Cases"
                SET "CancellationReason" = 'Cancelled before clinical completion; no treatment plan was issued.'
                WHERE "Status" = 'Cancelled'
                    AND ("CancellationReason" IS NULL OR btrim("CancellationReason") = '');
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "Cases");
        }
    }
}
