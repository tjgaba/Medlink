using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseVitalSigns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BloodPressure",
                table: "Cases",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConsciousnessLevel",
                table: "Cases",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeartRate",
                table: "Cases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OxygenSaturation",
                table: "Cases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RespiratoryRate",
                table: "Cases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Temperature",
                table: "Cases",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BloodPressure",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "ConsciousnessLevel",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "HeartRate",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "OxygenSaturation",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "RespiratoryRate",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "Temperature",
                table: "Cases");
        }
    }
}
