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

CREATE TEMP TABLE seed_patients (
    seq integer PRIMARY KEY,
    full_name text NOT NULL,
    id_number text NOT NULL,
    age integer NOT NULL,
    gender text NOT NULL,
    contact_number text NOT NULL,
    chronic_conditions text,
    allergies text,
    medications text
) ON COMMIT DROP;

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

DO $$
DECLARE
    first_names text[] := ARRAY[
        'Sipho', 'Thandi', 'Ayesha', 'Johan', 'Nomsa', 'Peter', 'Lindiwe', 'Kabelo',
        'Fatima', 'Daniel', 'Grace', 'Bongani', 'Mia', 'Sibusiso', 'Lerato', 'Nandi',
        'Yusuf', 'Anika', 'Refilwe', 'Themba', 'Naledi', 'Priya', 'Michael', 'Sarah',
        'Zanele', 'Wayne', 'Melissa', 'Lunga', 'Buhle', 'Farah'
    ];
    surnames text[] := ARRAY[
        'Dlamini', 'Khumalo', 'Naidoo', 'Mokoena', 'Khan', 'Jacobs', 'Maseko', 'Nkosi',
        'van der Merwe', 'Molefe', 'Hendricks', 'Naicker', 'Omar', 'Pillay', 'Botha',
        'Govender', 'Radebe', 'Ndlovu', 'Sithole', 'Patel'
    ];
    conditions text[] := ARRAY['', 'Hypertension', 'Diabetes', 'Asthma', 'Epilepsy', 'HIV stable on ART', 'Chronic kidney disease'];
    allergies text[] := ARRAY['None', 'Penicillin', 'Sulfa drugs', 'Aspirin', 'Latex', ''];
    medications text[] := ARRAY['', 'Amlodipine', 'Metformin', 'Salbutamol inhaler', 'Enalapril', 'ARV regimen', 'Warfarin'];
    patient_index integer;
BEGIN
    PERFORM setseed(0.428);

    FOR patient_index IN 1..100 LOOP
        INSERT INTO seed_patients (
            seq,
            full_name,
            id_number,
            age,
            gender,
            contact_number,
            chronic_conditions,
            allergies,
            medications
        )
        VALUES (
            patient_index,
            first_names[1 + floor(random() * array_length(first_names, 1))::integer] || ' ' ||
                surnames[1 + floor(random() * array_length(surnames, 1))::integer],
            lpad((floor(5000000000000 + random() * 4900000000000))::text, 13, '0'),
            1 + floor(random() * 90)::integer,
            CASE WHEN patient_index % 2 = 0 THEN 'Female' ELSE 'Male' END,
            '08' || lpad(floor(random() * 100000000)::text, 8, '0'),
            conditions[1 + floor(random() * array_length(conditions, 1))::integer],
            allergies[1 + floor(random() * array_length(allergies, 1))::integer],
            medications[1 + floor(random() * array_length(medications, 1))::integer]
        );
    END LOOP;
END $$;

DO $$
DECLARE
    day_offset integer;
    daily_index integer;
    daily_count integer;
    case_number integer := 1;
    case_id uuid;
    case_date date;
    created_at timestamptz;
    minute_of_day integer;
    department text;
    severity text;
    status text;
    patient_status text;
    symptoms text;
    notes text;
    required_specialization text;
    zone_id uuid;
    assigned_staff_id uuid;
    patient_seq integer;
    selected_patient seed_patients%ROWTYPE;
    has_vitals boolean;
    heart_rate integer;
    respiratory_rate integer;
    oxygen_saturation integer;
    temperature numeric(4,1);
    blood_pressure text;
    consciousness text;
    resolution_minutes integer;
    random_value numeric;
BEGIN
    FOR day_offset IN REVERSE 29..0 LOOP
        case_date := current_date - day_offset;
        daily_count :=
            greatest(
                5,
                least(
                    19,
                    9
                    + CASE WHEN extract(isodow FROM case_date) IN (6, 7) THEN -3 ELSE 3 END
                    + floor(random() * 7)::integer - 3
                    + CASE WHEN day_offset IN (4, 11, 22) THEN 5 + floor(random() * 5)::integer ELSE 0 END
                )
            );

        FOR daily_index IN 1..daily_count LOOP
            IF daily_index % 8 = 0 THEN
                minute_of_day := floor(random() * 360)::integer;
            ELSIF daily_index % 10 = 0 THEN
                minute_of_day := 1080 + floor(random() * 360)::integer;
            ELSE
                minute_of_day := 480 + floor(random() * 600)::integer;
            END IF;

            created_at := case_date::timestamp + (minute_of_day || ' minutes')::interval;
            random_value := random();

            IF day_offset IN (4, 11, 22) AND daily_index % 3 = 0 THEN
                department := 'Trauma';
            ELSIF random_value < 0.23 THEN
                department := 'General';
            ELSIF random_value < 0.39 THEN
                department := 'Trauma';
            ELSIF random_value < 0.55 THEN
                department := 'Cardiology';
            ELSIF random_value < 0.69 THEN
                department := 'Pediatrics';
            ELSIF random_value < 0.80 THEN
                department := 'Neurology';
            ELSIF random_value < 0.89 THEN
                department := 'Radiology';
            ELSIF random_value < 0.95 THEN
                department := 'CriticalCare';
            ELSE
                department := 'ICU';
            END IF;

            CASE department
                WHEN 'Cardiology' THEN
                    symptoms := (ARRAY[
                        'Chest pain with sweating and shortness of breath.',
                        'Hypertension with severe headache and dizziness.',
                        'Palpitations and near-syncope while walking.'
                    ])[1 + floor(random() * 3)::integer];
                    notes := 'ECG requested; cardiovascular risk reviewed.';
                    required_specialization := 'Cardiology';
                WHEN 'Trauma' THEN
                    symptoms := (ARRAY[
                        'Motor vehicle collision with limb pain and abrasions.',
                        'Fall with suspected fracture and swelling.',
                        'Laceration requiring sutures; bleeding controlled.'
                    ])[1 + floor(random() * 3)::integer];
                    notes := 'Injury assessed; imaging or wound care prepared.';
                    required_specialization := 'Emergency Medicine';
                WHEN 'Pediatrics' THEN
                    symptoms := (ARRAY[
                        'Child with fever, cough and poor feeding.',
                        'Persistent wheeze with moderate respiratory distress.',
                        'Vomiting and diarrhoea with dehydration risk.'
                    ])[1 + floor(random() * 3)::integer];
                    notes := 'Caregiver updated; hydration and fever control reviewed.';
                    required_specialization := 'Pediatrics';
                WHEN 'Neurology' THEN
                    symptoms := (ARRAY[
                        'Sudden weakness on one side with slurred speech.',
                        'Confusion after possible seizure episode.',
                        'Severe headache with visual disturbance.'
                    ])[1 + floor(random() * 3)::integer];
                    notes := 'Neurological observations started.';
                    required_specialization := 'Neurology';
                WHEN 'CriticalCare' THEN
                    symptoms := (ARRAY[
                        'Sepsis risk with fever, confusion and low oxygen saturation.',
                        'Respiratory distress requiring close monitoring.'
                    ])[1 + floor(random() * 2)::integer];
                    notes := 'Critical escalation prepared.';
                    required_specialization := 'Critical Care';
                WHEN 'ICU' THEN
                    symptoms := (ARRAY[
                        'Post-operative instability with rising respiratory effort.',
                        'Low oxygen saturation despite supplemental oxygen.'
                    ])[1 + floor(random() * 2)::integer];
                    notes := 'ICU review requested.';
                    required_specialization := 'ICU';
                WHEN 'Radiology' THEN
                    symptoms := (ARRAY[
                        'Possible fracture requiring imaging review.',
                        'Chest x-ray review for persistent cough.'
                    ])[1 + floor(random() * 2)::integer];
                    notes := 'Radiology slot linked to triage record.';
                    required_specialization := 'Radiology';
                ELSE
                    symptoms := (ARRAY[
                        'Medication refill and stable chronic disease review.',
                        'Gastroenteritis with mild dehydration.',
                        'Dizziness and fatigue without focal symptoms.'
                    ])[1 + floor(random() * 3)::integer];
                    notes := 'Routine observations recorded.';
                    required_specialization := 'General Practice';
            END CASE;

            IF department IN ('ICU', 'CriticalCare') OR symptoms ILIKE '%stroke%' OR symptoms ILIKE '%sepsis%' OR symptoms ILIKE '%collision%' THEN
                severity := CASE WHEN random() > 0.35 THEN 'Red' ELSE 'Orange' END;
            ELSE
                random_value := random();
                severity := CASE
                    WHEN random_value < 0.10 THEN 'Red'
                    WHEN random_value < 0.34 THEN 'Orange'
                    WHEN random_value < 0.76 THEN 'Yellow'
                    ELSE 'Green'
                END;
            END IF;

            IF created_at < now() - interval '2 days' THEN
                status := CASE WHEN random() > 0.07 THEN 'Completed' ELSE 'Cancelled' END;
            ELSE
                random_value := random();
                status := CASE
                    WHEN random_value < 0.16 THEN 'Pending'
                    WHEN random_value < 0.52 THEN 'Assigned'
                    WHEN random_value < 0.84 THEN 'InProgress'
                    WHEN severity = 'Green' THEN 'Completed'
                    ELSE 'Assigned'
                END;
            END IF;

            patient_status := CASE status
                WHEN 'Pending' THEN CASE WHEN random() > 0.5 THEN 'Waiting' ELSE 'Arrived' END
                WHEN 'Assigned' THEN 'Arrived'
                WHEN 'InProgress' THEN 'Under Treatment'
                WHEN 'Completed' THEN 'Transferred'
                ELSE 'Waiting'
            END;

            patient_seq := CASE
                WHEN case_number % 7 = 0 THEN 1 + floor(random() * 18)::integer
                WHEN case_number % 11 = 0 THEN 18 + floor(random() * 17)::integer
                ELSE 1 + floor(random() * 100)::integer
            END;

            SELECT *
            INTO selected_patient
            FROM seed_patients
            WHERE seq = patient_seq;

            SELECT "Id"
            INTO zone_id
            FROM "Zones"
            WHERE "Name" = CASE department
                WHEN 'Trauma' THEN 'Trauma Bay'
                WHEN 'Pediatrics' THEN 'Pediatrics'
                WHEN 'Radiology' THEN 'Radiology'
                WHEN 'ICU' THEN 'ICU'
                WHEN 'CriticalCare' THEN 'ICU'
                WHEN 'Neurology' THEN 'ICU'
                WHEN 'General' THEN 'General Ward'
                ELSE 'Emergency Intake'
            END;

            assigned_staff_id := NULL;
            IF status <> 'Pending' THEN
                SELECT "Id"
                INTO assigned_staff_id
                FROM "Staff"
                WHERE "Specialization" = required_specialization
                    OR (department = 'ICU' AND "Specialization" = 'Critical Care')
                    OR (department = 'Trauma' AND "Specialization" = 'Emergency Medicine')
                ORDER BY random()
                LIMIT 1;
            END IF;

            has_vitals := random() > 0.14;
            IF has_vitals THEN
                heart_rate := CASE
                    WHEN severity = 'Red' THEN 105 + floor(random() * 36)::integer
                    ELSE 60 + floor(random() * 54)::integer
                END;
                respiratory_rate := CASE
                    WHEN severity = 'Red' THEN 22 + floor(random() * 12)::integer
                    ELSE 12 + floor(random() * 14)::integer
                END;
                oxygen_saturation := CASE
                    WHEN severity = 'Red' THEN 85 + floor(random() * 10)::integer
                    ELSE 92 + floor(random() * 9)::integer
                END;
                temperature := round((36 + random() * CASE WHEN department = 'Pediatrics' THEN 4.2 ELSE 3.5 END)::numeric, 1);
                blood_pressure := (CASE WHEN severity = 'Red' THEN 88 + floor(random() * 94)::integer ELSE 108 + floor(random() * 42)::integer END)::text
                    || '/' || (58 + floor(random() * 40)::integer)::text;
                consciousness := CASE WHEN severity = 'Red' AND random() > 0.5 THEN 'Confused' ELSE 'Alert' END;
            ELSE
                heart_rate := NULL;
                respiratory_rate := NULL;
                oxygen_saturation := NULL;
                temperature := NULL;
                blood_pressure := NULL;
                consciousness := NULL;
            END IF;

            case_id := gen_random_uuid();
            resolution_minutes := CASE severity
                WHEN 'Red' THEN 18 + floor(random() * 52)::integer
                WHEN 'Orange' THEN 28 + floor(random() * 72)::integer
                WHEN 'Yellow' THEN 45 + floor(random() * 105)::integer
                ELSE 25 + floor(random() * 85)::integer
            END;

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
            VALUES (
                case_id,
                'CASE-' || lpad(case_number::text, 3, '0'),
                selected_patient.full_name,
                selected_patient.id_number,
                selected_patient.age,
                selected_patient.gender,
                split_part(selected_patient.full_name, ' ', 1) || ' Family',
                CASE WHEN selected_patient.age < 18 THEN 'Parent' WHEN random() > 0.5 THEN 'Spouse' ELSE 'Sibling' END,
                selected_patient.contact_number,
                severity,
                department,
                zone_id,
                status,
                patient_status,
                symptoms,
                blood_pressure,
                heart_rate,
                respiratory_rate,
                temperature,
                oxygen_saturation,
                consciousness,
                selected_patient.chronic_conditions,
                selected_patient.medications,
                selected_patient.allergies,
                CASE WHEN random() > 0.58 THEN 'Yes' ELSE 'No' END,
                notes,
                CASE WHEN status = 'Completed' THEN
                    CASE department
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
                CASE WHEN status = 'Cancelled' THEN
                    CASE department
                        WHEN 'Trauma' THEN 'Patient redirected to trauma referral pathway before local treatment was completed.'
                        WHEN 'Radiology' THEN 'Imaging request cancelled after clinician review showed no immediate radiology need.'
                        WHEN 'Pediatrics' THEN 'Caregiver withdrew before full assessment; return-warning advice documented.'
                        ELSE 'Cancelled before clinical completion; no treatment plan was issued.'
                    END
                END,
                required_specialization,
                assigned_staff_id,
                ((CASE WHEN severity = 'Red' THEN 2 + floor(random() * 10)::integer ELSE 6 + floor(random() * 29)::integer END)::text || ' minutes')::interval,
                created_at
            );

            IF assigned_staff_id IS NOT NULL THEN
                INSERT INTO "WorkEvents" (
                    "Id",
                    "StaffId",
                    "EventType",
                    "RelatedCaseId",
                    "Timestamp",
                    "DurationMinutes",
                    "Notes"
                )
                VALUES (
                    gen_random_uuid(),
                    assigned_staff_id,
                    'CaseAssigned',
                    case_id,
                    (created_at + ((2 + floor(random() * 12)::integer)::text || ' minutes')::interval)::timestamp,
                    NULL,
                    'Assigned to ' || ('CASE-' || lpad(case_number::text, 3, '0')) || '.'
                );

                IF status = 'Completed' THEN
                    INSERT INTO "WorkEvents" (
                        "Id",
                        "StaffId",
                        "EventType",
                        "RelatedCaseId",
                        "Timestamp",
                        "DurationMinutes",
                        "Notes"
                    )
                    VALUES (
                        gen_random_uuid(),
                        assigned_staff_id,
                        'CaseCompleted',
                        case_id,
                        (created_at + (resolution_minutes::text || ' minutes')::interval)::timestamp,
                        resolution_minutes,
                        ('CASE-' || lpad(case_number::text, 3, '0')) || ' completed after clinical review.'
                    );
                END IF;
            END IF;

            case_number := case_number + 1;
        END LOOP;
    END LOOP;
END $$;

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
        'patients', 100,
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
    (SELECT min("CreatedAt") FROM "Cases") AS first_case_at,
    (SELECT max("CreatedAt") FROM "Cases") AS last_case_at;
