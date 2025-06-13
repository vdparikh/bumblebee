-- Drop indexes first
DROP INDEX IF EXISTS idx_task_requirements_task_id;
DROP INDEX IF EXISTS idx_task_requirements_requirement_id;

-- Drop the table
DROP TABLE IF EXISTS task_requirements; 