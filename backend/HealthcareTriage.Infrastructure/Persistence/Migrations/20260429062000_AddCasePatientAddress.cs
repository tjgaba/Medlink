using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(HealthcareTriageDbContext))]
    [Migration("20260429062000_AddCasePatientAddress")]
    public partial class AddCasePatientAddress : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Cases",
                type: "character varying(240)",
                maxLength: 240,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Cases");
        }
    }
}
