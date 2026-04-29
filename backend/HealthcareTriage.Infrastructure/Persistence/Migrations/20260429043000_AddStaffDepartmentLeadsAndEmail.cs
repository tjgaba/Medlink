using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthcareTriage.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(HealthcareTriageDbContext))]
    [Migration("20260429043000_AddStaffDepartmentLeadsAndEmail")]
    public partial class AddStaffDepartmentLeadsAndEmail : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DepartmentLeadDepartment",
                table: "Staff",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailAddress",
                table: "Staff",
                type: "character varying(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDepartmentLead",
                table: "Staff",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "Staff",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.Sql(
                """
                INSERT INTO "Staff" (
                    "Id",
                    "Name",
                    "ZoneId",
                    "Specialization",
                    "IsOnDuty",
                    "IsBusy",
                    "CurrentCaseCount",
                    "CooldownUntil",
                    "OptInOverride",
                    "TotalHoursWorked",
                    "LastShiftEndedAt",
                    "EmailAddress",
                    "PhoneNumber",
                    "IsDepartmentLead",
                    "DepartmentLeadDepartment"
                )
                SELECT
                    lead_data.id::uuid,
                    lead_data.name,
                    zones."Id",
                    lead_data.specialization,
                    true,
                    false,
                    0,
                    NULL,
                    true,
                    80,
                    now() - interval '12 hours',
                    'tjgaba777@gmail.com',
                    lead_data.phone_number,
                    true,
                    lead_data.department
                FROM (VALUES
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0101', 'Dr Lindiwe Maseko', 'Department Lead - General', 'General Ward', '+27 10 555 0101', 'General'),
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0102', 'Dr Kian Pillay', 'Department Lead - Cardiology', 'Emergency Intake', '+27 10 555 0102', 'Cardiology'),
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0103', 'Dr Amogelang Khumalo', 'Department Lead - Trauma', 'Trauma Bay', '+27 10 555 0103', 'Trauma'),
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0104', 'Dr Reneilwe Molefe', 'Department Lead - Neurology', 'ICU', '+27 10 555 0104', 'Neurology'),
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0105', 'Dr Yasmin Khan', 'Department Lead - Pediatrics', 'Pediatrics', '+27 10 555 0105', 'Pediatrics'),
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0106', 'Dr Martin Botha', 'Department Lead - Radiology', 'Radiology', '+27 10 555 0106', 'Radiology'),
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0107', 'Dr Sanele Mthembu', 'Department Lead - Critical Care', 'ICU', '+27 10 555 0107', 'CriticalCare'),
                    ('2f33323d-fcc3-4d10-9c48-1f2e8f4d0108', 'Dr Nisha Reddy', 'Department Lead - ICU', 'ICU', '+27 10 555 0108', 'ICU')
                ) AS lead_data(id, name, specialization, zone_name, phone_number, department)
                JOIN "Zones" zones ON zones."Name" = lead_data.zone_name
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "Staff" existing_staff
                    WHERE existing_staff."IsDepartmentLead" = true
                        AND existing_staff."DepartmentLeadDepartment" = lead_data.department
                );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM "Staff"
                WHERE "IsDepartmentLead" = true
                    AND "EmailAddress" = 'tjgaba777@gmail.com';
                """);

            migrationBuilder.DropColumn(
                name: "DepartmentLeadDepartment",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "EmailAddress",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "IsDepartmentLead",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "Staff");
        }
    }
}
