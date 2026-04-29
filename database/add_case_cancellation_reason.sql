ALTER TABLE "Cases"
ADD COLUMN IF NOT EXISTS "CancellationReason" character varying(1000);

UPDATE "Cases"
SET "CancellationReason" = 'Cancelled before clinical completion; no treatment plan was issued.'
WHERE "Status" = 'Cancelled'
    AND ("CancellationReason" IS NULL OR btrim("CancellationReason") = '');

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260428041000_AddCaseCancellationReason', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;

SELECT
    count(*) FILTER (WHERE "Status" = 'Cancelled') AS cancelled_cases,
    count(*) FILTER (WHERE "Status" = 'Cancelled' AND "CancellationReason" IS NOT NULL AND btrim("CancellationReason") <> '') AS cancelled_with_reason
FROM "Cases";
