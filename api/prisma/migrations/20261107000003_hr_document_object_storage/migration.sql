ALTER TABLE "hr_documents" ADD COLUMN "file_key" VARCHAR(500);
UPDATE "hr_documents" SET "file_key" = 'legacy/' || id::text WHERE "file_key" IS NULL;
ALTER TABLE "hr_documents" ALTER COLUMN "file_key" SET NOT NULL;
ALTER TABLE "hr_documents" DROP COLUMN "file_data";
