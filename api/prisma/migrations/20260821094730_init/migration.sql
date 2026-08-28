-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'OFFICER', 'VIEWER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ACTIVE', 'CLOSED', 'SUSPENDED', 'LEGAL');

-- CreateEnum
CREATE TYPE "CollectionStage" AS ENUM ('D1', 'D2', 'D3', 'D4', 'LEGAL', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'VISIT', 'SMS', 'EMAIL', 'LETTER', 'PROMISE_TO_PAY', 'PAYMENT_RECEIVED', 'LEGAL_ACTION', 'NOTE', 'FIELD_VISIT');

-- CreateEnum
CREATE TYPE "ActivityOutcome" AS ENUM ('CONTACTED', 'NO_ANSWER', 'PROMISE_RECEIVED', 'REFUSED', 'PARTIAL_PAYMENT', 'FULL_PAYMENT', 'DISPUTE', 'DECEASED', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CHECK', 'CARD', 'MOBILE', 'OTHER');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'BROKEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "LegalProceedingStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'JUDGMENT', 'ENFORCEMENT', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CONTRACT', 'ID_DOCUMENT', 'COLLATERAL', 'COURT_ORDER', 'PAYMENT_PROOF', 'AGREEMENT', 'CORRESPONDENCE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OFFICER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "office_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "short_name" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "personal_id" VARCHAR(30) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "phone1" VARCHAR(30),
    "phone2" VARCHAR(30),
    "email" VARCHAR(150),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "loan_number" VARCHAR(30) NOT NULL,
    "institution_id" UUID NOT NULL,
    "borrower_id" UUID NOT NULL,
    "original_loan_amount" DECIMAL(18,2) NOT NULL,
    "disbursed_amount" DECIMAL(18,2) NOT NULL,
    "current_outstanding_balance" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "interest_rate" DECIMAL(5,4),
    "product_type" VARCHAR(50),
    "disbursement_date" DATE NOT NULL,
    "maturity_date" DATE,
    "last_payment_date" DATE,
    "days_past_due" INTEGER NOT NULL DEFAULT 0,
    "npl_classification" VARCHAR(10),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_parties" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" VARCHAR(30) NOT NULL,

    CONSTRAINT "loan_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "case_reference" VARCHAR(30) NOT NULL,
    "loan_id" UUID NOT NULL,
    "office_id" UUID,
    "assigned_officer_id" UUID,
    "status" "CaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "collection_stage" "CollectionStage" NOT NULL DEFAULT 'D1',
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "next_action_date" TIMESTAMPTZ,
    "next_action_note" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "officer_id" UUID NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "channel" VARCHAR(30),
    "notes" TEXT,
    "outcome" "ActivityOutcome",
    "promise_amount" DECIMAL(18,2),
    "promise_currency" VARCHAR(3),
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "next_action_date" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "officer_id" UUID NOT NULL,
    "payment_reference" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "payment_date" DATE NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_channel" VARCHAR(30),
    "external_reference" VARCHAR(100),
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "agreement_reference" VARCHAR(30) NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "total_amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "installment_count" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_installments" (
    "id" UUID NOT NULL,
    "agreement_id" UUID NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" DATE,
    "paid_amount" DECIMAL(18,2),

    CONSTRAINT "agreement_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_proceedings" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "proceeding_ref" VARCHAR(30) NOT NULL,
    "status" "LegalProceedingStatus" NOT NULL DEFAULT 'INITIATED',
    "court" VARCHAR(150),
    "filing_date" DATE NOT NULL,
    "next_hearing_date" DATE,
    "judgment_date" DATE,
    "judgment_amount" DECIMAL(18,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "legal_proceedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "storage_path" VARCHAR(500),
    "notes" VARCHAR(500),
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "case_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "due_date" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "offices_code_key" ON "offices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "persons_personal_id_key" ON "persons"("personal_id");

-- CreateIndex
CREATE UNIQUE INDEX "loans_loan_number_key" ON "loans"("loan_number");

-- CreateIndex
CREATE UNIQUE INDEX "loan_parties_loan_id_person_id_role_key" ON "loan_parties"("loan_id", "person_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "cases_case_reference_key" ON "cases"("case_reference");

-- CreateIndex
CREATE UNIQUE INDEX "cases_loan_id_key" ON "cases"("loan_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_office_id_idx" ON "cases"("office_id");

-- CreateIndex
CREATE INDEX "cases_assigned_officer_id_idx" ON "cases"("assigned_officer_id");

-- CreateIndex
CREATE INDEX "activities_case_id_occurred_at_idx" ON "activities"("case_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_reference_key" ON "payments"("payment_reference");

-- CreateIndex
CREATE INDEX "payments_case_id_payment_date_idx" ON "payments"("case_id", "payment_date" DESC);

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "agreements_agreement_reference_key" ON "agreements"("agreement_reference");

-- CreateIndex
CREATE INDEX "agreements_case_id_idx" ON "agreements"("case_id");

-- CreateIndex
CREATE INDEX "agreement_installments_agreement_id_idx" ON "agreement_installments"("agreement_id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_proceedings_proceeding_ref_key" ON "legal_proceedings"("proceeding_ref");

-- CreateIndex
CREATE INDEX "legal_proceedings_case_id_idx" ON "legal_proceedings"("case_id");

-- CreateIndex
CREATE INDEX "documents_case_id_idx" ON "documents"("case_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_parties" ADD CONSTRAINT "loan_parties_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_parties" ADD CONSTRAINT "loan_parties_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_officer_id_fkey" FOREIGN KEY ("assigned_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_installments" ADD CONSTRAINT "agreement_installments_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_proceedings" ADD CONSTRAINT "legal_proceedings_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
