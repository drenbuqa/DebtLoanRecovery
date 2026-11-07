-- Soft-delete for activities: stamp deleted_at/deleted_by_id/delete_reason instead of hard DELETE
ALTER TABLE "activities" ADD COLUMN "deleted_at" TIMESTAMPTZ;
ALTER TABLE "activities" ADD COLUMN "deleted_by_id" UUID REFERENCES "users"("id");
ALTER TABLE "activities" ADD COLUMN "delete_reason" VARCHAR(500);

CREATE INDEX "activities_deleted_at_idx" ON "activities"("deleted_at");
