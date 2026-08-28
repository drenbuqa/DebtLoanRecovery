-- ============================================================
-- Schema improvements migration
-- ============================================================

-- 1. New enums
CREATE TYPE "TaskPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "LoanPartyRole" AS ENUM ('BORROWER', 'CO_BORROWER', 'GUARANTOR', 'SPOUSE', 'EMPLOYER', 'OTHER');
CREATE TYPE "NplClass" AS ENUM ('PERFORMING', 'WATCH', 'SUBSTANDARD', 'DOUBTFUL', 'LOSS');

-- 2. Task.priority: VARCHAR → TaskPriority enum
--    Drop default first (PostgreSQL cannot auto-cast a VARCHAR default to enum)
ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT;
UPDATE "tasks" SET "priority" = 'MEDIUM' WHERE "priority" NOT IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
ALTER TABLE "tasks"
  ALTER COLUMN "priority" TYPE "TaskPriority"
  USING "priority"::"TaskPriority";
ALTER TABLE "tasks"
  ALTER COLUMN "priority" SET DEFAULT 'MEDIUM'::"TaskPriority";

-- 3. LoanParty.role: VARCHAR → LoanPartyRole enum
--    Normalise values (seed uses plain strings like 'BORROWER', 'GUARANTOR', etc.)
UPDATE "loan_parties" SET "role" = 'OTHER' WHERE "role" NOT IN ('BORROWER', 'CO_BORROWER', 'GUARANTOR', 'SPOUSE', 'EMPLOYER', 'OTHER');
ALTER TABLE "loan_parties"
  ALTER COLUMN "role" TYPE "LoanPartyRole"
  USING "role"::"LoanPartyRole";

-- 4. Loan.npl_classification: VARCHAR(10) → NplClass enum (nullable)
--    Normalise any non-matching values to NULL before casting
UPDATE "loans"
  SET "npl_classification" = NULL
  WHERE "npl_classification" IS NOT NULL
    AND "npl_classification" NOT IN ('PERFORMING', 'WATCH', 'SUBSTANDARD', 'DOUBTFUL', 'LOSS');
ALTER TABLE "loans"
  ALTER COLUMN "npl_classification" TYPE "NplClass"
  USING "npl_classification"::"NplClass";

-- 5. Loan.dpd_last_calculated_at — tracks when DPD was last recalculated
ALTER TABLE "loans"
  ADD COLUMN "dpd_last_calculated_at" TIMESTAMPTZ;

-- 6. Loan: index on days_past_due for priority queuing
CREATE INDEX "loans_days_past_due_idx" ON "loans" ("days_past_due" DESC);

-- 7. Case.deleted_at — soft-delete support
ALTER TABLE "cases"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;
CREATE INDEX "cases_deleted_at_idx" ON "cases" ("deleted_at");

-- 8. Document: make storage_path, file_size, mime_type non-nullable
--    Set safe defaults for any existing NULLs (should not exist in practice)
UPDATE "documents" SET "storage_path" = '' WHERE "storage_path" IS NULL;
UPDATE "documents" SET "file_size" = 0   WHERE "file_size" IS NULL;
UPDATE "documents" SET "mime_type" = 'application/octet-stream' WHERE "mime_type" IS NULL;
ALTER TABLE "documents"
  ALTER COLUMN "storage_path" SET NOT NULL,
  ALTER COLUMN "file_size"    SET NOT NULL,
  ALTER COLUMN "mime_type"    SET NOT NULL;

-- 9. Task: index on due_date for deadline queries
CREATE INDEX "tasks_due_date_idx" ON "tasks" ("due_date");

-- 10. DB-level CHECK constraints — prevent negative or zero monetary amounts
ALTER TABLE "loans"
  ADD CONSTRAINT "chk_loans_amounts_non_negative"
  CHECK (
    "original_loan_amount" >= 0 AND
    "disbursed_amount" >= 0 AND
    "current_outstanding_balance" >= 0
  );

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_amount_positive"
  CHECK ("amount" > 0);

ALTER TABLE "agreements"
  ADD CONSTRAINT "chk_agreements_amount_positive"
  CHECK ("total_amount" > 0);

ALTER TABLE "agreement_installments"
  ADD CONSTRAINT "chk_installments_amount_positive"
  CHECK ("amount" > 0);

-- Activities: promise amounts must be positive when present
ALTER TABLE "activities"
  ADD CONSTRAINT "chk_activities_promise_amount_positive"
  CHECK ("promise_amount" IS NULL OR "promise_amount" > 0);

-- Legal judgments must be positive when present
ALTER TABLE "legal_proceedings"
  ADD CONSTRAINT "chk_legal_judgment_amount_positive"
  CHECK ("judgment_amount" IS NULL OR "judgment_amount" > 0);
