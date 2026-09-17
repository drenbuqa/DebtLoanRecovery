-- Merge first_name + last_name into full_name on the persons table
ALTER TABLE persons ADD COLUMN full_name VARCHAR(200);
UPDATE persons SET full_name = TRIM(first_name || ' ' || last_name);
ALTER TABLE persons ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE persons DROP COLUMN first_name;
ALTER TABLE persons DROP COLUMN last_name;
