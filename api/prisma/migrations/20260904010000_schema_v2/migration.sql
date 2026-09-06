-- Schema v2: professional database structure
-- Adds: person_phones, promises_to_pay, case_assignments, loan_balance_history,
--        legal_activities, import_jobs, import_errors
-- Modifies: persons (remove phone1/phone2), agreements, legal_proceedings,
--           agreement_installments, cases (add closedAt)

-- ── New enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "PhoneType" AS ENUM ('MOBILE', 'HOME', 'WORK', 'OTHER');
CREATE TYPE "PromiseStatus" AS ENUM ('PENDING', 'KEPT', 'BROKEN', 'PARTIAL', 'CANCELLED');
CREATE TYPE "LegalActivityType" AS ENUM ('HEARING', 'SUBMISSION', 'DEADLINE', 'JUDGMENT', 'APPEAL', 'ENFORCEMENT', 'OTHER');
CREATE TYPE "ImportType" AS ENUM ('PORTFOLIO', 'PAYMENTS', 'BALANCES');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ── person_phones ──────────────────────────────────────────────────────────────

CREATE TABLE "person_phones" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "person_id"    UUID        NOT NULL,
  "phone_number" VARCHAR(30) NOT NULL,
  "phone_type"   "PhoneType" NOT NULL DEFAULT 'MOBILE',
  "is_primary"   BOOLEAN     NOT NULL DEFAULT false,
  "is_active"    BOOLEAN     NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "person_phones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "person_phones_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "person_phones_person_id_idx" ON "person_phones"("person_id");

-- Migrate existing phone1 and phone2 into person_phones
INSERT INTO "person_phones" ("person_id", "phone_number", "phone_type", "is_primary", "created_at")
SELECT "id", "phone1", 'MOBILE', true, "created_at"
FROM "persons"
WHERE "phone1" IS NOT NULL AND trim("phone1") <> '';

INSERT INTO "person_phones" ("person_id", "phone_number", "phone_type", "is_primary", "created_at")
SELECT "id", "phone2", 'MOBILE', false, "created_at"
FROM "persons"
WHERE "phone2" IS NOT NULL AND trim("phone2") <> '';

-- Remove old phone columns from persons
ALTER TABLE "persons" DROP COLUMN IF EXISTS "phone1";
ALTER TABLE "persons" DROP COLUMN IF EXISTS "phone2";

-- ── loan_balance_history ───────────────────────────────────────────────────────

CREATE TABLE "loan_balance_history" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "loan_id"             UUID         NOT NULL,
  "balance_date"        DATE         NOT NULL,
  "outstanding_balance" DECIMAL(18,2) NOT NULL,
  "source"              VARCHAR(20)  NOT NULL,
  "recorded_by_id"      UUID,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "loan_balance_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loan_balance_history_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "loan_balance_history_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "loan_balance_history_loan_id_balance_date_idx" ON "loan_balance_history"("loan_id", "balance_date" DESC);

-- Seed initial balance snapshot from current loan data
INSERT INTO "loan_balance_history" ("loan_id", "balance_date", "outstanding_balance", "source", "created_at")
SELECT "id", CURRENT_DATE, "current_outstanding_balance", 'IMPORT', NOW()
FROM "loans";

-- ── case_assignments ───────────────────────────────────────────────────────────

CREATE TABLE "case_assignments" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "case_id"        UUID        NOT NULL,
  "officer_id"     UUID        NOT NULL,
  "assigned_by_id" UUID        NOT NULL,
  "assigned_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "unassigned_at"  TIMESTAMPTZ,
  CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "case_assignments_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "case_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "case_assignments_case_id_idx" ON "case_assignments"("case_id");
CREATE INDEX "case_assignments_officer_id_idx" ON "case_assignments"("officer_id");

-- Seed current assignments as initial history (assigned_at = case created_at as best approximation)
INSERT INTO "case_assignments" ("case_id", "officer_id", "assigned_by_id", "assigned_at")
SELECT "id", "assigned_officer_id", "assigned_officer_id", "created_at"
FROM "cases"
WHERE "assigned_officer_id" IS NOT NULL;

-- ── promises_to_pay ────────────────────────────────────────────────────────────

CREATE TABLE "promises_to_pay" (
  "id"               UUID           NOT NULL DEFAULT gen_random_uuid(),
  "case_id"          UUID           NOT NULL,
  "activity_id"      UUID           UNIQUE,
  "person_id"        UUID,
  "created_by_id"    UUID           NOT NULL,
  "promised_amount"  DECIMAL(18,2)  NOT NULL,
  "currency"         VARCHAR(3)     NOT NULL DEFAULT 'EUR',
  "promise_date"     DATE           NOT NULL,
  "status"           "PromiseStatus" NOT NULL DEFAULT 'PENDING',
  "fulfilled_amount" DECIMAL(18,2),
  "fulfilled_at"     DATE,
  "notes"            VARCHAR(500),
  "created_at"       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT "promises_to_pay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promises_to_pay_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "promises_to_pay_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "promises_to_pay_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "promises_to_pay_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "promises_to_pay_case_id_idx" ON "promises_to_pay"("case_id");
CREATE INDEX "promises_to_pay_promise_date_idx" ON "promises_to_pay"("promise_date");
CREATE INDEX "promises_to_pay_status_idx" ON "promises_to_pay"("status");

-- Migrate existing PROMISE_TO_PAY activities into promises_to_pay
-- promise_date is derived from nextActionDate (when they promised to pay) or occurredAt as fallback
INSERT INTO "promises_to_pay" (
  "case_id", "activity_id", "created_by_id",
  "promised_amount", "currency", "promise_date", "status", "created_at", "updated_at"
)
SELECT
  a."case_id",
  a."id",
  a."officer_id",
  COALESCE(a."promise_amount", 0),
  COALESCE(a."promise_currency", 'EUR'),
  COALESCE(a."next_action_date"::date, a."occurred_at"::date),
  'PENDING',
  a."created_at",
  a."created_at"
FROM "activities" a
WHERE a."activity_type" = 'PROMISE_TO_PAY'
  AND a."promise_amount" IS NOT NULL
  AND a."promise_amount" > 0;

-- ── legal_activities ───────────────────────────────────────────────────────────

CREATE TABLE "legal_activities" (
  "id"                  UUID               NOT NULL DEFAULT gen_random_uuid(),
  "legal_proceeding_id" UUID               NOT NULL,
  "created_by_id"       UUID               NOT NULL,
  "activity_type"       "LegalActivityType" NOT NULL,
  "activity_date"       DATE               NOT NULL,
  "description"         TEXT,
  "deadline"            DATE,
  "completed_at"        DATE,
  "created_at"          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CONSTRAINT "legal_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "legal_activities_legal_proceeding_id_fkey" FOREIGN KEY ("legal_proceeding_id") REFERENCES "legal_proceedings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "legal_activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "legal_activities_legal_proceeding_id_idx" ON "legal_activities"("legal_proceeding_id");

-- ── import_jobs and import_errors ──────────────────────────────────────────────

CREATE TABLE "import_jobs" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "institution_id"  UUID,
  "uploaded_by_id"  UUID          NOT NULL,
  "import_type"     "ImportType"  NOT NULL,
  "file_name"       VARCHAR(255)  NOT NULL,
  "status"          "ImportStatus" NOT NULL DEFAULT 'PENDING',
  "total_rows"      INTEGER       NOT NULL DEFAULT 0,
  "successful_rows" INTEGER       NOT NULL DEFAULT 0,
  "failed_rows"     INTEGER       NOT NULL DEFAULT 0,
  "started_at"      TIMESTAMPTZ,
  "completed_at"    TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_jobs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "import_jobs_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "import_jobs_uploaded_by_id_idx" ON "import_jobs"("uploaded_by_id");

CREATE TABLE "import_errors" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "import_job_id" UUID        NOT NULL,
  "row_number"    INTEGER     NOT NULL,
  "error_message" TEXT        NOT NULL,
  "raw_data"      TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_errors_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "import_errors_import_job_id_idx" ON "import_errors"("import_job_id");

-- ── Modify existing tables ─────────────────────────────────────────────────────

-- agreements: track who created it
ALTER TABLE "agreements" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- legal_proceedings: track who initiated it
ALTER TABLE "legal_proceedings" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "legal_proceedings" ADD CONSTRAINT "legal_proceedings_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- agreement_installments: add installment_number and updatedAt
ALTER TABLE "agreement_installments"
  ADD COLUMN "installment_number" INTEGER,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill installment_number ordered by due_date within each agreement
UPDATE "agreement_installments" ai
SET "installment_number" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "agreement_id" ORDER BY "due_date") AS rn
  FROM "agreement_installments"
) sub
WHERE ai.id = sub.id;

-- Make installment_number NOT NULL now that it's backfilled
ALTER TABLE "agreement_installments" ALTER COLUMN "installment_number" SET NOT NULL;

-- cases: add closedAt for direct querying without scanning status_history
ALTER TABLE "cases" ADD COLUMN "closed_at" TIMESTAMPTZ;

-- Backfill closedAt from status history where final status is CLOSED
UPDATE "cases" c
SET "closed_at" = sub."changed_at"
FROM (
  SELECT DISTINCT ON ("case_id") "case_id", "changed_at"
  FROM "case_status_history"
  WHERE "new_value" = 'CLOSED'
  ORDER BY "case_id", "changed_at" DESC
) sub
WHERE c.id = sub."case_id" AND c.status = 'CLOSED';
