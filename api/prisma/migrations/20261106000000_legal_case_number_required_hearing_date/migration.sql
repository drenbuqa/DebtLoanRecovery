-- Make legalCaseNumber required (set empty string for any nulls first)
UPDATE legal_proceedings SET legal_case_number = '' WHERE legal_case_number IS NULL;
ALTER TABLE legal_proceedings ALTER COLUMN legal_case_number SET NOT NULL;

-- Make initiationDate required (set to created_at date for any nulls)
UPDATE legal_proceedings SET initiation_date = created_at::date WHERE initiation_date IS NULL;
ALTER TABLE legal_proceedings ALTER COLUMN initiation_date SET NOT NULL;

-- Rename filing_date to hearing_date
ALTER TABLE legal_proceedings RENAME COLUMN filing_date TO hearing_date;
