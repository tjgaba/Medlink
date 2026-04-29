SELECT
    (SELECT count(*) FROM "Staff") AS staff_count,
    (SELECT count(*) FROM "Staff" WHERE "IsDepartmentLead" = true) AS department_lead_count,
    (SELECT count(DISTINCT "DepartmentLeadDepartment") FROM "Staff" WHERE "IsDepartmentLead" = true) AS department_lead_departments,
    (SELECT count(*) FROM "Cases") AS case_count,
    (SELECT count(DISTINCT "PatientIdNumber") FROM "Cases") AS distinct_patient_count,
    (SELECT count(*) FROM "Zones") AS zone_count,
    (SELECT min("CreatedAt") FROM "Cases") AS first_case_at,
    (SELECT max("CreatedAt") FROM "Cases") AS last_case_at;

SELECT
    "Department",
    count(*) AS case_count
FROM "Cases"
GROUP BY "Department"
ORDER BY case_count DESC;

SELECT
    "Status",
    count(*) AS case_count
FROM "Cases"
GROUP BY "Status"
ORDER BY case_count DESC;

SELECT
    count(*) FILTER (WHERE "HeartRate" IS NULL) AS missing_vitals_cases,
    count(*) FILTER (WHERE "HeartRate" IS NOT NULL) AS vitals_recorded_cases
FROM "Cases";

SELECT
    count(*) FILTER (WHERE "Status" = 'Completed') AS completed_cases,
    count(*) FILTER (WHERE "Status" = 'Completed' AND "Prescription" IS NOT NULL AND btrim("Prescription") <> '') AS completed_with_prescription
FROM "Cases";

SELECT
    count(*) FILTER (WHERE "Status" = 'Cancelled') AS cancelled_cases,
    count(*) FILTER (WHERE "Status" = 'Cancelled' AND "CancellationReason" IS NOT NULL AND btrim("CancellationReason") <> '') AS cancelled_with_reason
FROM "Cases";

SELECT
    count(*) AS repeat_patient_count
FROM (
    SELECT "PatientIdNumber"
    FROM "Cases"
    GROUP BY "PatientIdNumber"
    HAVING count(*) > 1
) repeat_patients;
