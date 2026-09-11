-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: schema_v3
-- Professional schema hardening:
--   1. CaseStatus: replace LEGAL with WRITTEN_OFF (LEGAL belongs in CollectionStage only)
--   2. BalanceSource enum: typed source for LoanBalanceHistory
--   3. Payment voiding: voidedAt / voidedById / voidReason (never hard-delete payments)
--   4. Missing updatedAt: offices, institutions, import_jobs
--   5. Missing createdAt: loan_parties
--   6. Missing indexes: loans(institution_id), loans(borrower_id),
--      cases(collection_stage), cases(status,office_id),
--      agreements(case_id,status), agreement_installments(status,due_date),
--      promises_to_pay(status,promise_date), payments(voided_at)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. CaseStatus enum ───────────────────────────────────────────────────────

-- Migrate cases with status=LEGAL → status=ACTIVE with collectionStage=LEGAL
-- (LEGAL is a collection stage, not a status — it was redundant and could desync)
UPDATE cases
SET status = 'ACTIVE',
    collection_stage = 'LEGAL'
WHERE status = 'LEGAL'
  AND collection_stage != 'LEGAL';

-- Also update CaseStatusHistory records that referenced 'LEGAL' as a status value
UPDATE case_status_history
SET old_value = 'ACTIVE'
WHERE field = 'status' AND old_value = 'LEGAL';

UPDATE case_status_history
SET new_value = 'ACTIVE'
WHERE field = 'status' AND new_value = 'LEGAL';

-- Add WRITTEN_OFF to CaseStatus enum
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'WRITTEN_OFF';

-- ── 2. BalanceSource enum ─────────────────────────────────────────────────────

CREATE TYPE "BalanceSource" AS ENUM ('PAYMENT', 'IMPORT', 'MANUAL', 'VOID');

-- Migrate existing source column from text to enum
-- Normalise any existing values first
UPDATE loan_balance_history SET source = 'PAYMENT' WHERE UPPER(source) = 'PAYMENT';
UPDATE loan_balance_history SET source = 'IMPORT'  WHERE UPPER(source) = 'IMPORT';
UPDATE loan_balance_history SET source = 'MANUAL'  WHERE UPPER(source) = 'MANUAL';
-- Unknown values fall back to MANUAL
UPDATE loan_balance_history SET source = 'MANUAL'
WHERE source NOT IN ('PAYMENT', 'IMPORT', 'MANUAL', 'VOID');

ALTER TABLE loan_balance_history
  ALTER COLUMN source TYPE "BalanceSource" USING source::"BalanceSource";

-- ── 3. Payment voiding ────────────────────────────────────────────────────────

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS voided_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by_id  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS void_reason   VARCHAR(500);

-- ── 4. updatedAt on offices, institutions, import_jobs ───────────────────────

ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 5. createdAt on loan_parties ─────────────────────────────────────────────

ALTER TABLE loan_parties
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 6. Missing indexes ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_loans_institution_id
  ON loans(institution_id);

CREATE INDEX IF NOT EXISTS idx_loans_borrower_id
  ON loans(borrower_id);

CREATE INDEX IF NOT EXISTS idx_cases_collection_stage
  ON cases(collection_stage);

CREATE INDEX IF NOT EXISTS idx_cases_status_office_id
  ON cases(status, office_id);

CREATE INDEX IF NOT EXISTS idx_agreements_case_id_status
  ON agreements(case_id, status);

CREATE INDEX IF NOT EXISTS idx_installments_status_due_date
  ON agreement_installments(status, due_date);

CREATE INDEX IF NOT EXISTS idx_promises_status_promise_date
  ON promises_to_pay(status, promise_date);

CREATE INDEX IF NOT EXISTS idx_payments_voided_at
  ON payments(voided_at);
