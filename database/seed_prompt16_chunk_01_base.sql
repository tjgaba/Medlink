CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

TRUNCATE TABLE
    "DelegationAuditLogs",
    "DelegationRequests",
    "WorkEvents",
    "WorkSessions",
    "AuditLogs",
    "Cases",
    "Staff",
    "ZoneAdjacencies",
    "Zones"
RESTART IDENTITY CASCADE;

INSERT INTO "Zones" ("Id", "Name")
VALUES
    (gen_random_uuid(), 'Emergency Intake'),
    (gen_random_uuid(), 'Triage Bay'),
    (gen_random_uuid(), 'Trauma Bay'),
    (gen_random_uuid(), 'Observation Area'),
    (gen_random_uuid(), 'General Ward'),
    (gen_random_uuid(), 'Pediatrics'),
    (gen_random_uuid(), 'Radiology'),
    (gen_random_uuid(), 'ICU'),
    (gen_random_uuid(), 'Critical Care');

WITH pairs AS (
    SELECT * FROM (VALUES
        ('Emergency Intake', 'Triage Bay'),
        ('Triage Bay', 'Observation Area'),
        ('Triage Bay', 'Trauma Bay'),
        ('Trauma Bay', 'Radiology'),
        ('Trauma Bay', 'ICU'),
        ('Observation Area', 'General Ward'),
        ('Observation Area', 'Pediatrics'),
        ('ICU', 'Critical Care')
    ) AS value("Zone", "AdjacentZone")
)
INSERT INTO "ZoneAdjacencies" ("ZoneId", "AdjacentZoneId")
SELECT zone_from."Id", zone_to."Id"
FROM pairs
JOIN "Zones" zone_from ON zone_from."Name" = pairs."Zone"
JOIN "Zones" zone_to ON zone_to."Name" = pairs."AdjacentZone"
UNION ALL
SELECT zone_to."Id", zone_from."Id"
FROM pairs
JOIN "Zones" zone_from ON zone_from."Name" = pairs."Zone"
JOIN "Zones" zone_to ON zone_to."Name" = pairs."AdjacentZone";

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
    gen_random_uuid(),
    staff_data.name,
    zones."Id",
    staff_data.specialization,
    staff_data.is_on_duty,
    false,
    0,
    NULL,
    staff_data.opt_in_override,
    staff_data.hours_worked,
    now() - (staff_data.shift_gap_hours || ' hours')::interval,
    NULL,
    NULL,
    false,
    NULL
FROM (VALUES
    ('Dr Amina Naidoo', 'Emergency Medicine', 'Trauma Bay', true, true, 92.5, 11),
    ('Nurse Zanele Dlamini', 'Critical Care', 'ICU', true, false, 84.0, 9),
    ('Dr Nadia Ebrahim', 'Neurology', 'ICU', true, false, 76.0, 18),
    ('Nurse Thabo Mokoena', 'Triage Nurse', 'Triage Bay', true, true, 64.0, 10),
    ('Dr Michael Jacobs', 'Cardiology', 'Emergency Intake', true, false, 88.0, 12),
    ('Nurse Karen Botha', 'Cardiology', 'Observation Area', true, false, 73.0, 8),
    ('Dr Sibusiso Dube', 'Cardiology', 'Emergency Intake', false, true, 56.0, 20),
    ('Dr Priya Govender', 'Emergency Medicine', 'Trauma Bay', true, false, 91.0, 7),
    ('Paramedic Wayne Adams', 'Emergency Medicine', 'Emergency Intake', true, true, 70.5, 13),
    ('Nurse Themba Radebe', 'Neurology', 'Observation Area', true, false, 66.0, 16),
    ('Dr Elena Maseko', 'Neurology', 'ICU', false, false, 49.0, 24),
    ('Dr Farah Patel', 'Critical Care', 'Critical Care', true, true, 96.5, 6),
    ('Nurse Johan Nel', 'Critical Care', 'ICU', true, false, 82.0, 12),
    ('Dr Naledi Sithole', 'General Practice', 'General Ward', true, false, 61.0, 17),
    ('Nurse Buhle Mkhize', 'General Practice', 'Observation Area', true, false, 78.0, 9),
    ('Nurse Nandi Molefe', 'Pediatrics', 'Pediatrics', true, true, 74.0, 15),
    ('Dr Yusuf Omar', 'Pediatrics', 'Pediatrics', true, false, 69.5, 11),
    ('Radiographer Lunga Ndlovu', 'Radiology', 'Radiology', true, false, 55.0, 8),
    ('Radiologist Melissa Singh', 'Radiology', 'Radiology', false, false, 48.0, 29),
    ('Dr Refilwe Mokoena', 'ICU', 'ICU', true, true, 94.0, 7),
    ('Nurse Anika Pillay', 'ICU', 'ICU', true, false, 87.0, 14),
    ('Dr Lerato Khumalo', 'General Practice', 'General Ward', false, false, 44.0, 31),
    ('Nurse Samkelo Mthembu', 'Triage Nurse', 'Triage Bay', true, false, 63.5, 10),
    ('Dr Peter van Wyk', 'Emergency Medicine', 'Trauma Bay', true, false, 72.0, 19)
) AS staff_data(name, specialization, zone_name, is_on_duty, opt_in_override, hours_worked, shift_gap_hours)
JOIN "Zones" zones ON zones."Name" = staff_data.zone_name;

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
    gen_random_uuid(),
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
    ('Dr Lindiwe Maseko', 'Department Lead - General', 'General Ward', '+27 10 555 0101', 'General'),
    ('Dr Kian Pillay', 'Department Lead - Cardiology', 'Emergency Intake', '+27 10 555 0102', 'Cardiology'),
    ('Dr Amogelang Khumalo', 'Department Lead - Trauma', 'Trauma Bay', '+27 10 555 0103', 'Trauma'),
    ('Dr Reneilwe Molefe', 'Department Lead - Neurology', 'ICU', '+27 10 555 0104', 'Neurology'),
    ('Dr Yasmin Khan', 'Department Lead - Pediatrics', 'Pediatrics', '+27 10 555 0105', 'Pediatrics'),
    ('Dr Martin Botha', 'Department Lead - Radiology', 'Radiology', '+27 10 555 0106', 'Radiology'),
    ('Dr Sanele Mthembu', 'Department Lead - Critical Care', 'ICU', '+27 10 555 0107', 'CriticalCare'),
    ('Dr Nisha Reddy', 'Department Lead - ICU', 'ICU', '+27 10 555 0108', 'ICU')
) AS lead_data(name, specialization, zone_name, phone_number, department)
JOIN "Zones" zones ON zones."Name" = lead_data.zone_name;

COMMIT;

SELECT
    (SELECT count(*) FROM "Zones") AS zones,
    (SELECT count(*) FROM "ZoneAdjacencies") AS zone_links,
    (SELECT count(*) FROM "Staff") AS staff;
