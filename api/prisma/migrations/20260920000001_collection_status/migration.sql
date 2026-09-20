-- Add CollectionStatus enum and column on cases
CREATE TYPE "CollectionStatus" AS ENUM (
  'PAKONTAKTUAR',
  'ZOTIM_PAGESE',
  'ME_MARREVESHJE',
  'KONTESTIM',
  'NUK_PRANON',
  'TJERA'
);

ALTER TABLE "cases" ADD COLUMN "collection_status" "CollectionStatus";
CREATE INDEX "cases_collection_status_idx" ON "cases"("collection_status");
