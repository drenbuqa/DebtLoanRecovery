-- Add import_job_id to activities for rollback tracking
ALTER TABLE "activities" ADD COLUMN "import_job_id" UUID;
ALTER TABLE "activities" ADD CONSTRAINT "activities_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "activities_import_job_id_idx" ON "activities"("import_job_id");

-- Add import_job_id to payments for rollback tracking
ALTER TABLE "payments" ADD COLUMN "import_job_id" UUID;
ALTER TABLE "payments" ADD CONSTRAINT "payments_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "payments_import_job_id_idx" ON "payments"("import_job_id");

-- Add ROLLED_BACK to ImportStatus enum
ALTER TYPE "ImportStatus" ADD VALUE 'ROLLED_BACK';
