CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL, -- e.g., 'auditor', 'admin', 'owner'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compliance_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) UNIQUE NOT NULL, -- e.g., NYDFS, SOX, PCI
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard_id UUID NOT NULL REFERENCES compliance_standards(id) ON DELETE CASCADE,
    control_id_reference VARCHAR(100) NOT NULL, -- e.g., "NYDFS 500.02", "PCI DSS 3.2.1"
    requirement_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (standard_id, control_id_reference)
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL, -- Task might exist without a direct requirement initially
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- e.g., Open, In Progress, Pending Review, Closed, Failed
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Fields for automated checks (if applicable)
    check_type VARCHAR(100), -- e.g., 'automated_script', 'manual_review', 'api_check'
    target TEXT,
    parameters JSONB -- Store as JSONB for flexibility
);

CREATE TABLE task_execution_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    executed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- PASS, FAIL, ERROR, PENDING
    output TEXT, -- Details, error message, or path to simple evidence
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- URL to S3, GCS, or a secured local path
    description TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    mime_type VARCHAR(100)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_user_id);
CREATE INDEX idx_tasks_owner ON tasks(owner_user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_requirements_standard_id ON requirements(standard_id);
CREATE INDEX idx_evidence_task_id ON evidence(task_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_task_execution_results_task_id ON task_execution_results(task_id);

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_compliance_standards
BEFORE UPDATE ON compliance_standards
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_requirements
BEFORE UPDATE ON requirements
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_comments
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, 
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

CREATE TABLE IF NOT EXISTS task_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploader_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, 
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL, 
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_evidence_task_id ON task_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_task_evidence_uploader_user_id ON task_evidence(uploader_user_id);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    standard_id UUID REFERENCES compliance_standards(id) ON DELETE SET NULL, 
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_selected_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    is_applicable BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_campaign_requirement UNIQUE (campaign_id, requirement_id)
);

CREATE TABLE campaign_task_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    master_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, 
    campaign_selected_requirement_id UUID REFERENCES campaign_selected_requirements(id) ON DELETE SET NULL, 
    title VARCHAR(255) NOT NULL, 
    description TEXT,             
    category VARCHAR(100),        
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,    
    assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL, 
    status VARCHAR(50) NOT NULL DEFAULT 'Open', 
    due_date TIMESTAMPTZ NULL,                  
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    check_type VARCHAR(255) NULL,
    target VARCHAR(255) NULL,
    parameters JSONB NULL
);

ALTER TABLE task_comments
    ADD COLUMN campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    ALTER COLUMN task_id DROP NOT NULL, 
    ADD CONSTRAINT chk_comment_target CHECK (
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR 
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL)
    );

ALTER TABLE task_evidence
    ADD COLUMN campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    ALTER COLUMN task_id DROP NOT NULL,
    ADD CONSTRAINT chk_evidence_target CHECK (
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR 
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL)
    );

ALTER TABLE task_execution_results
    ADD COLUMN campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    ALTER COLUMN task_id DROP NOT NULL,
    ADD CONSTRAINT chk_result_target CHECK (
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR 
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL)
    );

CREATE TRIGGER set_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_campaign_task_instances_updated_at
BEFORE UPDATE ON campaign_task_instances
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE task_evidence
ADD COLUMN campaign_task_instance_id UUID NULL,
ADD CONSTRAINT fk_campaign_task_instance_evidence
    FOREIGN KEY (campaign_task_instance_id)
    REFERENCES campaign_task_instances (id)
    ON DELETE CASCADE;

ALTER TABLE users
ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'auditor', 'user'));

ALTER TABLE users
ADD COLUMN hashed_password VARCHAR(255) NOT NULL DEFAULT '';
