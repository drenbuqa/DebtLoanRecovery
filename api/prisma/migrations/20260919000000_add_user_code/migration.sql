-- Add user_code: auto-incrementing sequential integer for officer identification
CREATE SEQUENCE IF NOT EXISTS users_user_code_seq;

ALTER TABLE "users" ADD COLUMN "user_code" INTEGER NOT NULL DEFAULT nextval('users_user_code_seq');

-- Backfill existing users with sequential codes ordered by creation date
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM users
)
UPDATE users SET user_code = ordered.rn
FROM ordered WHERE users.id = ordered.id;

-- Sync the sequence to the current max so future inserts continue from there
SELECT setval('users_user_code_seq', COALESCE((SELECT MAX(user_code) FROM users), 0) + 1, false);

ALTER TABLE "users" ADD CONSTRAINT "users_user_code_key" UNIQUE ("user_code");
