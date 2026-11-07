-- Rename deleted_at → archived_at (column was never used, always NULL)
ALTER TABLE "cases" RENAME COLUMN "deleted_at" TO "archived_at";

-- Add who archived it and why
ALTER TABLE "cases" ADD COLUMN "archived_by_id" UUID REFERENCES "users"("id");
ALTER TABLE "cases" ADD COLUMN "archive_reason" VARCHAR(500);

-- Drop old index on deleted_at, create on archived_at
DROP INDEX IF EXISTS "cases_deleted_at_idx";
CREATE INDEX "cases_archived_at_idx" ON "cases"("archived_at");

-- Add missing index on next_action_date (used by follow-up queue)
CREATE INDEX "cases_next_action_date_idx" ON "cases"("next_action_date");
