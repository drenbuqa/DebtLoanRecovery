-- Add secondary officer and registration date to cases
ALTER TABLE "cases" ADD COLUMN "secondary_officer_id" UUID;
ALTER TABLE "cases" ADD COLUMN "registration_date" DATE;

ALTER TABLE "cases" ADD CONSTRAINT "cases_secondary_officer_id_fkey"
  FOREIGN KEY ("secondary_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new fields to activities
ALTER TABLE "activities" ADD COLUMN "updated_address" VARCHAR(500);
ALTER TABLE "activities" ADD COLUMN "updated_phone" VARCHAR(50);
ALTER TABLE "activities" ADD COLUMN "case_category" VARCHAR(100);

-- Add new fields to legal_proceedings
ALTER TABLE "legal_proceedings" ADD COLUMN "legal_case_number" VARCHAR(100);
ALTER TABLE "legal_proceedings" ADD COLUMN "initiation_date" DATE;

-- Add new ActivityType enum values
ALTER TYPE "ActivityType" ADD VALUE 'CALL_BORROWER';
ALTER TYPE "ActivityType" ADD VALUE 'CALL_GUARANTOR';
ALTER TYPE "ActivityType" ADD VALUE 'VISIT_BORROWER';
ALTER TYPE "ActivityType" ADD VALUE 'VISIT_GUARANTOR';
ALTER TYPE "ActivityType" ADD VALUE 'WARNING_LETTER';
ALTER TYPE "ActivityType" ADD VALUE 'MEETING_BORROWER';
ALTER TYPE "ActivityType" ADD VALUE 'MEETING_GUARANTOR';
