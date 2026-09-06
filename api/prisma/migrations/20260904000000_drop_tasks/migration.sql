-- Tasks feature has been removed from the platform.
-- Drop the tasks table and its enum.

DROP TABLE IF EXISTS "tasks";
DROP TYPE IF EXISTS "TaskPriority";
