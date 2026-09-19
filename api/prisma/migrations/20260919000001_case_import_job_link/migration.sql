-- Link cases to the import job that created them
ALTER TABLE "cases" ADD COLUMN "import_job_id" UUID;
ALTER TABLE "cases" ADD CONSTRAINT "cases_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE SET NULL;
CREATE INDEX "cases_import_job_id_idx" ON "cases"("import_job_id");
