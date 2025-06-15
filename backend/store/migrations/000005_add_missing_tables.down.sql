-- Drop indexes
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_entity_type_entity_id;
DROP INDEX IF EXISTS idx_task_executions_task_id;
DROP INDEX IF EXISTS idx_task_executions_status;

-- Drop tables
DROP TABLE IF EXISTS task_executions;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users; 