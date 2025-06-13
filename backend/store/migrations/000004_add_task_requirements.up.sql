-- Create task_requirements table for many-to-many relationship
CREATE TABLE IF NOT EXISTS task_requirements (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (task_id, requirement_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_requirements_task_id ON task_requirements(task_id);
CREATE INDEX IF NOT EXISTS idx_task_requirements_requirement_id ON task_requirements(requirement_id); 