using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(HealthcareTriageDbContext))]
    [Migration("20260428033000_AddCasePrescription")]
    public partial class AddCasePrescription : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Prescription",
                table: "Cases",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Cases"
                SET "Prescription" = CASE "Department"
                    WHEN 'Cardiology' THEN 'Aspirin administered where appropriate; blood pressure controlled; cardiology follow-up arranged.'
                    WHEN 'Trauma' THEN 'Wound care or immobilisation completed; analgesia prescribed; imaging/surgical follow-up advised if needed.'
                    WHEN 'Pediatrics' THEN 'Fever or respiratory symptoms treated; caregiver given hydration, medication, and return-warning advice.'
                    WHEN 'Neurology' THEN 'Neurological pathway completed; anti-seizure or stroke follow-up plan documented where indicated.'
                    WHEN 'CriticalCare' THEN 'Stabilisation completed; antibiotics/oxygen support plan documented; critical-care follow-up arranged.'
                    WHEN 'ICU' THEN 'ICU management plan completed; oxygen/monitoring and consultant follow-up documented.'
                    WHEN 'Radiology' THEN 'Imaging reviewed; results communicated; treatment or follow-up plan documented.'
                    ELSE 'Symptomatic treatment completed; discharge advice and follow-up instructions provided.'
                END
                WHERE "Status" = 'Completed'
                    AND ("Prescription" IS NULL OR btrim("Prescription") = '');
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Prescription",
                table: "Cases");
        }
    }
}
