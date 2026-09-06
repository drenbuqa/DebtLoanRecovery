-- Indexes for audit_log queries (by user and by time) to prevent full table scans
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
