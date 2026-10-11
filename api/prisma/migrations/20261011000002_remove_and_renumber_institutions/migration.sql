-- Remove unwanted institutions
DELETE FROM "institutions"
WHERE "name" ILIKE ANY (ARRAY[
  'BKS',
  'NZMF',
  'Cia Berto',
  'Crimson Finance Fund',
  'Crimson Finance found',
  'klientat e migruar gabim',
  'Mca',
  'Kosinvest',
  'Padefinuar',
  'Timi Invest 2'
]);

-- Renumber remaining institutions sequentially starting from 1 (ordered by current code)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY code) AS new_code
  FROM "institutions"
)
UPDATE "institutions" i
SET code = r.new_code
FROM ranked r
WHERE i.id = r.id;

-- Reset the sequence so next insert continues from the right value
SELECT setval(
  pg_get_serial_sequence('"institutions"', 'code'),
  (SELECT MAX(code) FROM "institutions")
);
