ALTER TABLE "Cases"
ADD COLUMN IF NOT EXISTS "Prescription" character varying(1000);

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

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260428033000_AddCasePrescription', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;

SELECT
    count(*) FILTER (WHERE "Status" = 'Completed') AS completed_cases,
    count(*) FILTER (WHERE "Status" = 'Completed' AND "Prescription" IS NOT NULL AND btrim("Prescription") <> '') AS completed_with_prescription
FROM "Cases";
