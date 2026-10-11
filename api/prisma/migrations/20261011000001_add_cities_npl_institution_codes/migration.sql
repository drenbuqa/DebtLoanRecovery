-- Add code column to institutions (auto-increment for existing and new rows)
ALTER TABLE "institutions" ADD COLUMN "code" SERIAL;
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_code_key" UNIQUE ("code");

-- Cities reference table
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" SERIAL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "cities" ADD CONSTRAINT "cities_code_key" UNIQUE ("code");
ALTER TABLE "cities" ADD CONSTRAINT "cities_name_key" UNIQUE ("name");

-- NPL categories reference table
CREATE TABLE "npl_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" INTEGER NOT NULL,
    "value" "NplClass" NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    CONSTRAINT "npl_categories_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "npl_categories" ADD CONSTRAINT "npl_categories_code_key" UNIQUE ("code");
ALTER TABLE "npl_categories" ADD CONSTRAINT "npl_categories_value_key" UNIQUE ("value");

-- Seed Kosovo cities (preserving existing numeric codes)
INSERT INTO "cities" ("id", "code", "name") OVERRIDING SYSTEM VALUE VALUES
(gen_random_uuid(), 1,  'Decan'),
(gen_random_uuid(), 2,  'Drenas'),
(gen_random_uuid(), 3,  'Ferizaj'),
(gen_random_uuid(), 4,  'Fushë Kosovë'),
(gen_random_uuid(), 5,  'Gjilan'),
(gen_random_uuid(), 6,  'Gllogovc/Drenas'),
(gen_random_uuid(), 7,  'Gracanica'),
(gen_random_uuid(), 8,  'Istog'),
(gen_random_uuid(), 9,  'Kamenicë'),
(gen_random_uuid(), 10, 'Klina'),
(gen_random_uuid(), 11, 'Klinë'),
(gen_random_uuid(), 12, 'Leposavic'),
(gen_random_uuid(), 13, 'Lipjan'),
(gen_random_uuid(), 14, 'Malishevë'),
(gen_random_uuid(), 15, 'Mitrovicë'),
(gen_random_uuid(), 16, 'Obilic'),
(gen_random_uuid(), 17, 'Pejë'),
(gen_random_uuid(), 18, 'Podujevë'),
(gen_random_uuid(), 19, 'Prishtinë'),
(gen_random_uuid(), 20, 'Prizren'),
(gen_random_uuid(), 21, 'Shtime'),
(gen_random_uuid(), 22, 'Skënderaj'),
(gen_random_uuid(), 23, 'Suharekë'),
(gen_random_uuid(), 24, 'Unknown'),
(gen_random_uuid(), 25, 'Viti'),
(gen_random_uuid(), 26, 'Vushtrri'),
(gen_random_uuid(), 27, 'Zubin Potok'),
(gen_random_uuid(), 28, 'Zvecan'),
(gen_random_uuid(), 29, 'Novo Berdo'),
(gen_random_uuid(), 30, 'Kacanik'),
(gen_random_uuid(), 31, 'Gjakovë'),
(gen_random_uuid(), 32, 'Dragash'),
(gen_random_uuid(), 33, 'Rahovec');

-- Keep sequence in sync after manual inserts
SELECT setval(pg_get_serial_sequence('"cities"', 'code'), 33);

-- Seed NPL categories
INSERT INTO "npl_categories" ("id", "code", "value", "label") VALUES
(gen_random_uuid(), 1, 'PERFORMING',  'Performues'),
(gen_random_uuid(), 2, 'WATCH',       'Nën Vëzhgim'),
(gen_random_uuid(), 3, 'SUBSTANDARD', 'Nënstandard'),
(gen_random_uuid(), 4, 'DOUBTFUL',    'I Dyshimtë'),
(gen_random_uuid(), 5, 'LOSS',        'Humbje');
