-- Delete institutions that were missed due to name mismatches
DELETE FROM "institutions"
WHERE "name" ILIKE ANY (ARRAY[
  'BZMF',
  'Klientet migruar gabim',
  'Klientat e migruar gabim',
  'PADEFIUNUAR',
  'Padefinuar',
  'TIMI INVEST',
  'Timi Invest 2'
]);

-- Renumber remaining institutions sequentially starting from 1
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY code) AS new_code
  FROM "institutions"
)
UPDATE "institutions" i
SET code = r.new_code
FROM ranked r
WHERE i.id = r.id;

-- Reset sequence
SELECT setval(
  pg_get_serial_sequence('"institutions"', 'code'),
  (SELECT MAX(code) FROM "institutions")
);
