-- Add LEGAL to CaseStatus enum (was in seed data but missing from the enum definition)
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'LEGAL';
