-- Remove email from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "email";

-- Remove date_of_birth and email from persons
ALTER TABLE "persons" DROP COLUMN IF EXISTS "date_of_birth";
ALTER TABLE "persons" DROP COLUMN IF EXISTS "email";

-- Remove maturity_date, days_past_due, dpd_last_calculated_at from loans
ALTER TABLE "loans" DROP COLUMN IF EXISTS "maturity_date";
ALTER TABLE "loans" DROP COLUMN IF EXISTS "days_past_due";
ALTER TABLE "loans" DROP COLUMN IF EXISTS "dpd_last_calculated_at";

-- Rename CollectionStatus enum values
ALTER TYPE "CollectionStatus" RENAME VALUE 'KONTESTIM' TO 'KONTESTIM_BORGJI';
ALTER TYPE "CollectionStatus" RENAME VALUE 'NUK_PRANON' TO 'NUK_PRANON_MARREVESHJE';

-- Add new CaseStatus values
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'ANKES';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'AKTGJYKIM';

-- Migrate WRITTEN_OFF cases to CLOSED before removing
UPDATE "cases" SET "status" = 'CLOSED' WHERE "status" = 'WRITTEN_OFF';

-- Remove WRITTEN_OFF from CollectionStage (migrate to LEGAL)
UPDATE "cases" SET "collection_stage" = 'LEGAL' WHERE "collection_stage" = 'WRITTEN_OFF';
