BEGIN;

WITH lookup AS MATERIALIZED (
    SELECT
        ARRAY[
            'Sipho', 'Thandi', 'Ayesha', 'Johan', 'Nomsa', 'Peter', 'Lindiwe', 'Kabelo',
            'Fatima', 'Daniel', 'Grace', 'Bongani', 'Mia', 'Sibusiso', 'Lerato', 'Nandi',
            'Yusuf', 'Anika', 'Refilwe', 'Themba', 'Naledi', 'Priya', 'Michael', 'Sarah',
            'Zanele', 'Wayne', 'Melissa', 'Lunga', 'Buhle', 'Farah'
        ]::text[] AS first_names,
        ARRAY[
            'Dlamini', 'Khumalo', 'Naidoo', 'Mokoena', 'Khan', 'Jacobs', 'Maseko', 'Nkosi',
            'van der Merwe', 'Molefe', 'Hendricks', 'Naicker', 'Omar', 'Pillay', 'Botha',
            'Govender', 'Radebe', 'Ndlovu', 'Sithole', 'Patel'
        ]::text[] AS surnames,
        ARRAY['', 'Hypertension', 'Diabetes', 'Asthma', 'Epilepsy', 'HIV stable on ART', 'Chronic kidney disease']::text[] AS conditions,
        ARRAY['None', 'Penicillin', 'Sulfa drugs', 'Aspirin', 'Latex', '']::text[] AS allergies,
        ARRAY['', 'Amlodipine', 'Metformin', 'Salbutamol inhaler', 'Enalapril', 'ARV regimen', 'Warfarin']::text[] AS medications
),
patient_pool AS MATERIALIZED (
    SELECT
        seq,
        lookup.first_names[1 + ((seq * 7) % array_length(lookup.first_names, 1))] || ' ' ||
            lookup.surnames[1 + ((seq * 11) % array_length(lookup.surnames, 1))] AS full_name,
        (5000000000000::bigint + ((seq::bigint * 91234567) % 4900000000000::bigint))::text AS id_number,
        1 + ((seq * 17) % 90) AS age,
        CASE WHEN seq % 2 = 0 THEN 'Female' ELSE 'Male' END AS gender,
        '08' || lpad(((seq::bigint * 735113) % 100000000)::text, 8, '0') AS contact_number,
        lookup.conditions[1 + ((seq * 5) % array_length(lookup.conditions, 1))] AS chronic_conditions,
        lookup.allergies[1 + ((seq * 3) % array_length(lookup.allergies, 1))] AS allergies,
        lookup.medications[1 + ((seq * 4) % array_length(lookup.medications, 1))] AS medications
    FROM generate_series(1, 100) AS seq
    CROSS JOIN lookup
),
day_counts AS MATERIALIZED (
    SELECT
        day_offset,
        current_date - day_offset AS case_date,
        greatest(
            5,
            least(
                19,
                9
                + CASE WHEN extract(isodow FROM current_date - day_offset) IN (6, 7) THEN -3 ELSE 3 END
                + floor(random() * 7)::integer - 3
                + CASE WHEN day_offset IN (4, 11, 22) THEN 5 + floor(random() * 5)::integer ELSE 0 END
            )
        ) AS daily_count
    FROM generate_series(29, 0, -1) AS day_offset
),
case_rows AS MATERIALIZED (
    SELECT
        row_number() OVER (ORDER BY day_counts.day_offset DESC, daily_index)::integer AS case_number,
        day_counts.day_offset,
        day_counts.case_date,
        daily_index,
        CASE
            WHEN daily_index % 8 = 0 THEN floor(random() * 360)::integer
            WHEN daily_index % 10 = 0 THEN 1080 + floor(random() * 360)::integer
            ELSE 480 + floor(random() * 600)::integer
        END AS minute_of_day,
        random() AS department_roll,
        random() AS severity_roll,
        random() AS status_roll,
        random() AS patient_roll,
        random() AS vitals_roll
    FROM day_counts
    JOIN LATERAL generate_series(1, day_counts.daily_count) AS daily_index ON true
),
department_rows AS MATERIALIZED (
    SELECT
        case_rows.*,
        (case_rows.case_date::timestamp + (case_rows.minute_of_day || ' minutes')::interval)::timestamptz AS created_at,
        CASE
            WHEN case_rows.day_offset IN (4, 11, 22) AND case_rows.daily_index % 3 = 0 THEN 'Trauma'
            WHEN case_rows.department_roll < 0.23 THEN 'General'
            WHEN case_rows.department_roll < 0.39 THEN 'Trauma'
            WHEN case_rows.department_roll < 0.55 THEN 'Cardiology'
            WHEN case_rows.department_roll < 0.69 THEN 'Pediatrics'
            WHEN case_rows.department_roll < 0.80 THEN 'Neurology'
            WHEN case_rows.department_roll < 0.89 THEN 'Radiology'
            WHEN case_rows.department_roll < 0.95 THEN 'CriticalCare'
            ELSE 'ICU'
        END AS department,
        CASE
            WHEN case_rows.case_number % 7 = 0 THEN 1 + floor(case_rows.patient_roll * 18)::integer
            WHEN case_rows.case_number % 11 = 0 THEN 18 + floor(case_rows.patient_roll * 17)::integer
            ELSE 1 + floor(case_rows.patient_roll * 100)::integer
        END AS patient_seq
    FROM case_rows
),
clinical_rows AS MATERIALIZED (
    SELECT
        department_rows.*,
        CASE department_rows.department
            WHEN 'Cardiology' THEN (ARRAY[
                'Chest pain with sweating and shortness of breath.',
                'Hypertension with severe headache and dizziness.',
                'Palpitations and near-syncope while walking.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 3)]
            WHEN 'Trauma' THEN (ARRAY[
                'Motor vehicle collision with limb pain and abrasions.',
                'Fall with suspected fracture and swelling.',
                'Laceration requiring sutures; bleeding controlled.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 3)]
            WHEN 'Pediatrics' THEN (ARRAY[
                'Child with fever, cough and poor feeding.',
                'Persistent wheeze with moderate respiratory distress.',
                'Vomiting and diarrhoea with dehydration risk.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 3)]
            WHEN 'Neurology' THEN (ARRAY[
                'Sudden weakness on one side with slurred speech.',
                'Confusion after possible seizure episode.',
                'Severe headache with visual disturbance.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 3)]
            WHEN 'CriticalCare' THEN (ARRAY[
                'Sepsis risk with fever, confusion and low oxygen saturation.',
                'Respiratory distress requiring close monitoring.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 2)]
            WHEN 'ICU' THEN (ARRAY[
                'Post-operative instability with rising respiratory effort.',
                'Low oxygen saturation despite supplemental oxygen.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 2)]
            WHEN 'Radiology' THEN (ARRAY[
                'Possible fracture requiring imaging review.',
                'Chest x-ray review for persistent cough.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 2)]
            ELSE (ARRAY[
                'Medication refill and stable chronic disease review.',
                'Gastroenteritis with mild dehydration.',
                'Dizziness and fatigue without focal symptoms.'
            ])[1 + ((department_rows.case_number + department_rows.daily_index) % 3)]
        END AS symptoms,
        CASE department_rows.department
            WHEN 'Cardiology' THEN 'ECG requested; cardiovascular risk reviewed.'
            WHEN 'Trauma' THEN 'Injury assessed; imaging or wound care prepared.'
            WHEN 'Pediatrics' THEN 'Caregiver updated; hydration and fever control reviewed.'
            WHEN 'Neurology' THEN 'Neurological observations started.'
            WHEN 'CriticalCare' THEN 'Critical escalation prepared.'
            WHEN 'ICU' THEN 'ICU review requested.'
            WHEN 'Radiology' THEN 'Radiology slot linked to triage record.'
            ELSE 'Routine observations recorded.'
        END AS notes,
        CASE department_rows.department
            WHEN 'Cardiology' THEN 'Cardiology'
            WHEN 'Trauma' THEN 'Emergency Medicine'
            WHEN 'Pediatrics' THEN 'Pediatrics'
            WHEN 'Neurology' THEN 'Neurology'
            WHEN 'CriticalCare' THEN 'Critical Care'
            WHEN 'ICU' THEN 'ICU'
            WHEN 'Radiology' THEN 'Radiology'
            ELSE 'General Practice'
        END AS required_specialization,
        CASE
            WHEN department_rows.department IN ('ICU', 'CriticalCare')
                OR (department_rows.department = 'Neurology' AND department_rows.case_number % 3 = 0)
                OR (department_rows.department = 'Trauma' AND department_rows.day_offset IN (4, 11, 22))
                THEN CASE WHEN department_rows.severity_roll > 0.35 THEN 'Red' ELSE 'Orange' END
            WHEN department_rows.severity_roll < 0.10 THEN 'Red'
            WHEN department_rows.severity_roll < 0.34 THEN 'Orange'
            WHEN department_rows.severity_roll < 0.76 THEN 'Yellow'
            ELSE 'Green'
        END AS severity
    FROM department_rows
),
status_rows AS MATERIALIZED (
    SELECT
        clinical_rows.*,
        CASE
            WHEN clinical_rows.created_at < now() - interval '2 days'
                THEN CASE WHEN clinical_rows.status_roll > 0.07 THEN 'Completed' ELSE 'Cancelled' END
            WHEN clinical_rows.status_roll < 0.16 THEN 'Pending'
            WHEN clinical_rows.status_roll < 0.52 THEN 'Assigned'
            WHEN clinical_rows.status_roll < 0.84 THEN 'InProgress'
            WHEN clinical_rows.severity = 'Green' THEN 'Completed'
            ELSE 'Assigned'
        END AS status
    FROM clinical_rows
),
final_rows AS MATERIALIZED (
    SELECT
        status_rows.*,
        patient_pool.full_name,
        patient_pool.id_number,
        patient_pool.age,
        patient_pool.gender,
        patient_pool.contact_number,
        patient_pool.chronic_conditions,
        patient_pool.allergies,
        patient_pool.medications,
        zones."Id" AS zone_id,
        assigned_staff."Id" AS assigned_staff_id
    FROM status_rows
    JOIN patient_pool ON patient_pool.seq = status_rows.patient_seq
    JOIN "Zones" zones ON zones."Name" = CASE status_rows.department
        WHEN 'Trauma' THEN 'Trauma Bay'
        WHEN 'Pediatrics' THEN 'Pediatrics'
        WHEN 'Radiology' THEN 'Radiology'
        WHEN 'ICU' THEN 'ICU'
        WHEN 'CriticalCare' THEN 'ICU'
        WHEN 'Neurology' THEN 'ICU'
        WHEN 'General' THEN 'General Ward'
        ELSE 'Emergency Intake'
    END
    LEFT JOIN LATERAL (
        SELECT staff."Id"
        FROM "Staff" staff
        WHERE status_rows.status <> 'Pending'
            AND (
                staff."Specialization" = status_rows.required_specialization
                OR (status_rows.department = 'ICU' AND staff."Specialization" = 'Critical Care')
                OR (status_rows.department = 'Trauma' AND staff."Specialization" = 'Emergency Medicine')
            )
        ORDER BY random()
        LIMIT 1
    ) assigned_staff ON true
)
INSERT INTO "Cases" (
    "Id",
    "DisplayCode",
    "PatientName",
    "PatientIdNumber",
    "Age",
    "Gender",
    "NextOfKinName",
    "NextOfKinRelationship",
    "NextOfKinPhone",
    "Severity",
    "Department",
    "ZoneId",
    "Status",
    "PatientStatus",
    "SymptomsSummary",
    "BloodPressure",
    "HeartRate",
    "RespiratoryRate",
    "Temperature",
    "OxygenSaturation",
    "ConsciousnessLevel",
    "ChronicConditions",
    "CurrentMedications",
    "Allergies",
    "MedicalAidScheme",
    "ParamedicNotes",
    "Prescription",
    "CancellationReason",
    "RequiredSpecialization",
    "AssignedStaffId",
    "ETA",
    "CreatedAt"
)
SELECT
    gen_random_uuid(),
    'CASE-' || lpad(final_rows.case_number::text, 3, '0'),
    final_rows.full_name,
    final_rows.id_number,
    final_rows.age,
    final_rows.gender,
    split_part(final_rows.full_name, ' ', 1) || ' Family',
    CASE WHEN final_rows.age < 18 THEN 'Parent' WHEN random() > 0.5 THEN 'Spouse' ELSE 'Sibling' END,
    final_rows.contact_number,
    final_rows.severity,
    final_rows.department,
    final_rows.zone_id,
    final_rows.status,
    CASE final_rows.status
        WHEN 'Pending' THEN CASE WHEN random() > 0.5 THEN 'Waiting' ELSE 'Arrived' END
        WHEN 'Assigned' THEN 'Arrived'
        WHEN 'InProgress' THEN 'Under Treatment'
        WHEN 'Completed' THEN 'Transferred'
        ELSE 'Waiting'
    END,
    final_rows.symptoms,
    CASE WHEN final_rows.vitals_roll > 0.14 THEN
        (CASE WHEN final_rows.severity = 'Red' THEN 88 + floor(random() * 94)::integer ELSE 108 + floor(random() * 42)::integer END)::text
        || '/' || (58 + floor(random() * 40)::integer)::text
    END,
    CASE WHEN final_rows.vitals_roll > 0.14 THEN
        CASE WHEN final_rows.severity = 'Red' THEN 105 + floor(random() * 36)::integer ELSE 60 + floor(random() * 54)::integer END
    END,
    CASE WHEN final_rows.vitals_roll > 0.14 THEN
        CASE WHEN final_rows.severity = 'Red' THEN 22 + floor(random() * 12)::integer ELSE 12 + floor(random() * 14)::integer END
    END,
    CASE WHEN final_rows.vitals_roll > 0.14 THEN
        round((36 + random() * CASE WHEN final_rows.department = 'Pediatrics' THEN 4.2 ELSE 3.5 END)::numeric, 1)
    END,
    CASE WHEN final_rows.vitals_roll > 0.14 THEN
        CASE WHEN final_rows.severity = 'Red' THEN 85 + floor(random() * 10)::integer ELSE 92 + floor(random() * 9)::integer END
    END,
    CASE WHEN final_rows.vitals_roll > 0.14 THEN
        CASE WHEN final_rows.severity = 'Red' AND random() > 0.5 THEN 'Confused' ELSE 'Alert' END
    END,
    final_rows.chronic_conditions,
    final_rows.medications,
    final_rows.allergies,
    CASE WHEN random() > 0.58 THEN 'Yes' ELSE 'No' END,
    final_rows.notes,
    CASE WHEN final_rows.status = 'Completed' THEN
        CASE final_rows.department
            WHEN 'Cardiology' THEN 'Aspirin administered where appropriate; blood pressure controlled; cardiology follow-up arranged.'
            WHEN 'Trauma' THEN 'Wound care or immobilisation completed; analgesia prescribed; imaging/surgical follow-up advised if needed.'
            WHEN 'Pediatrics' THEN 'Fever or respiratory symptoms treated; caregiver given hydration, medication, and return-warning advice.'
            WHEN 'Neurology' THEN 'Neurological pathway completed; anti-seizure or stroke follow-up plan documented where indicated.'
            WHEN 'CriticalCare' THEN 'Stabilisation completed; antibiotics/oxygen support plan documented; critical-care follow-up arranged.'
            WHEN 'ICU' THEN 'ICU management plan completed; oxygen/monitoring and consultant follow-up documented.'
            WHEN 'Radiology' THEN 'Imaging reviewed; results communicated; treatment or follow-up plan documented.'
            ELSE 'Symptomatic treatment completed; discharge advice and follow-up instructions provided.'
        END
    END,
    CASE WHEN final_rows.status = 'Cancelled' THEN
        CASE final_rows.department
            WHEN 'Trauma' THEN 'Patient redirected to trauma referral pathway before local treatment was completed.'
            WHEN 'Radiology' THEN 'Imaging request cancelled after clinician review showed no immediate radiology need.'
            WHEN 'Pediatrics' THEN 'Caregiver withdrew before full assessment; return-warning advice documented.'
            ELSE 'Cancelled before clinical completion; no treatment plan was issued.'
        END
    END,
    final_rows.required_specialization,
    final_rows.assigned_staff_id,
    ((CASE WHEN final_rows.severity = 'Red' THEN 2 + floor(random() * 10)::integer ELSE 6 + floor(random() * 29)::integer END)::text || ' minutes')::interval,
    final_rows.created_at
FROM final_rows;

INSERT INTO "WorkEvents" (
    "Id",
    "StaffId",
    "EventType",
    "RelatedCaseId",
    "Timestamp",
    "DurationMinutes",
    "Notes"
)
SELECT
    gen_random_uuid(),
    cases."AssignedStaffId",
    'CaseAssigned',
    cases."Id",
    (cases."CreatedAt" + ((2 + floor(random() * 12)::integer)::text || ' minutes')::interval)::timestamp,
    NULL,
    'Assigned to ' || cases."DisplayCode" || '.'
FROM "Cases" cases
WHERE cases."AssignedStaffId" IS NOT NULL;

INSERT INTO "WorkEvents" (
    "Id",
    "StaffId",
    "EventType",
    "RelatedCaseId",
    "Timestamp",
    "DurationMinutes",
    "Notes"
)
SELECT
    gen_random_uuid(),
    cases."AssignedStaffId",
    'CaseCompleted',
    cases."Id",
    (cases."CreatedAt" + (
        CASE cases."Severity"
            WHEN 'Red' THEN 18 + floor(random() * 52)::integer
            WHEN 'Orange' THEN 28 + floor(random() * 72)::integer
            WHEN 'Yellow' THEN 45 + floor(random() * 105)::integer
            ELSE 25 + floor(random() * 85)::integer
        END::text || ' minutes'
    )::interval)::timestamp,
    CASE cases."Severity"
        WHEN 'Red' THEN 18 + floor(random() * 52)::integer
        WHEN 'Orange' THEN 28 + floor(random() * 72)::integer
        WHEN 'Yellow' THEN 45 + floor(random() * 105)::integer
        ELSE 25 + floor(random() * 85)::integer
    END,
    cases."DisplayCode" || ' completed after clinical review.'
FROM "Cases" cases
WHERE cases."AssignedStaffId" IS NOT NULL
    AND cases."Status" = 'Completed';

UPDATE "Staff" staff
SET
    "CurrentCaseCount" = active_counts.active_count,
    "IsBusy" = active_counts.active_count >= 2,
    "IsOnDuty" = staff."IsOnDuty" OR active_counts.active_count > 0
FROM (
    SELECT
        staff_inner."Id",
        count(cases."Id") FILTER (WHERE cases."Status" IN ('Assigned', 'InProgress'))::integer AS active_count
    FROM "Staff" staff_inner
    LEFT JOIN "Cases" cases ON cases."AssignedStaffId" = staff_inner."Id"
    GROUP BY staff_inner."Id"
) active_counts
WHERE staff."Id" = active_counts."Id";

INSERT INTO "AuditLogs" (
    "Id",
    "ActionType",
    "EntityType",
    "EntityId",
    "PerformedBy",
    "Timestamp",
    "Details",
    "Severity"
)
VALUES (
    gen_random_uuid(),
    'RealisticSqlSeedLoaded',
    'System',
    'prompt16-sql-seed',
    'system',
    now()::timestamp,
    jsonb_build_object(
        'source', 'prompt16.md',
        'days', 30,
        'patients', (SELECT count(DISTINCT "PatientIdNumber") FROM "Cases"),
        'staff', (SELECT count(*) FROM "Staff"),
        'cases', (SELECT count(*) FROM "Cases")
    ),
    'Info'
);

COMMIT;

SELECT
    (SELECT count(*) FROM "Staff") AS staff_count,
    (SELECT count(*) FROM "Cases") AS case_count,
    (SELECT count(DISTINCT "PatientIdNumber") FROM "Cases") AS distinct_patient_count,
    (SELECT count(*) FROM "WorkEvents") AS work_event_count,
    (SELECT min("CreatedAt") FROM "Cases") AS first_case_at,
    (SELECT max("CreatedAt") FROM "Cases") AS last_case_at;
