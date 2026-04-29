using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCasePatientProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "Cases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Allergies",
                table: "Cases",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChronicConditions",
                table: "Cases",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentMedications",
                table: "Cases",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Cases",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MedicalAidScheme",
                table: "Cases",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextOfKinName",
                table: "Cases",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextOfKinPhone",
                table: "Cases",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextOfKinRelationship",
                table: "Cases",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ParamedicNotes",
                table: "Cases",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PatientIdNumber",
                table: "Cases",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Age",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "Allergies",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "ChronicConditions",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "CurrentMedications",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "MedicalAidScheme",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "NextOfKinName",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "NextOfKinPhone",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "NextOfKinRelationship",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "ParamedicNotes",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "PatientIdNumber",
                table: "Cases");
        }
    }
}
