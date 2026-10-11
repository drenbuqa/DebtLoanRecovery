ALTER TABLE "loans" DROP COLUMN IF EXISTS "npl_classification";
DROP TABLE IF EXISTS "npl_categories";
DROP TYPE IF EXISTS "NplClass";
