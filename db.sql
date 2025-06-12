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


CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_task_instance_id UUID NOT NULL,
    uploaded_by_user_id UUID NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(1024),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    review_status VARCHAR(50) DEFAULT 'Pending',
    reviewed_by_user_id UUID,
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,

    CONSTRAINT fk_campaign_task_instance
        FOREIGN KEY(campaign_task_instance_id)
        REFERENCES campaign_task_instances(id)
        ON DELETE CASCADE, -- Or SET NULL, depending on desired behavior
    CONSTRAINT fk_uploaded_by_user
        FOREIGN KEY(uploaded_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT, -- Or SET NULL
    CONSTRAINT fk_reviewed_by_user
        FOREIGN KEY(reviewed_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
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


ALTER TABLE campaign_task_instances
DROP COLUMN IF EXISTS owner_user_id;

-- 2. Create the junction table for multiple owners
CREATE TABLE IF NOT EXISTS campaign_task_instance_owners (
    campaign_task_instance_id UUID NOT NULL REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_task_instance_id, user_id)
);

-- Optional: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cti_owners_instance_id ON campaign_task_instance_owners(campaign_task_instance_id);
CREATE INDEX IF NOT EXISTS idx_cti_owners_user_id ON campaign_task_instance_owners(user_id);


-- Remove columns from the tasks table
ALTER TABLE tasks
DROP COLUMN IF EXISTS owner_user_id,
DROP COLUMN IF EXISTS assignee_user_id,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS due_date;

-- Add new suggested columns for master task templates
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS evidence_types_expected TEXT[], -- Array of strings, e.g., {'screenshot', 'log_file'}
ADD COLUMN IF NOT EXISTS default_priority VARCHAR(50);   -- e.g., 'High', 'Medium', 'Low'


-- Table for Connected Systems / Integration Targets
CREATE TABLE connected_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    system_type VARCHAR(100) NOT NULL, -- e.g., 'aws', 'gcp', 'azure', 'github', 'nessus'
    description TEXT,
    -- IMPORTANT: Configuration data can contain sensitive information like API keys.
    -- In a production environment, this data MUST be encrypted at rest and handled securely.
    -- Consider using a dedicated secrets manager instead of storing raw secrets here.
    configuration JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ,
    last_check_status VARCHAR(100), -- e.g., 'connected', 'error_auth', 'error_timeout'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE campaign_task_instance_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_task_instance_id UUID NOT NULL,
    executed_by_user_id UUID, -- Can be NULL if system executed
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- e.g., 'Success', 'Failed', 'Error'
    output TEXT, -- Can store JSON, plain text, etc.
    FOREIGN KEY (campaign_task_instance_id) REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (executed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE campaign_task_instances
ADD COLUMN last_checked_at TIMESTAMPTZ,
ADD COLUMN last_check_status VARCHAR(50);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(100) NOT NULL,
    source_url TEXT,
    internal_reference VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE task_documents (
    task_id UUID NOT NULL,
    document_id UUID NOT NULL,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, document_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Optional: Index for querying by task_id
CREATE INDEX idx_task_documents_task_id ON task_documents(task_id);



ALTER TABLE evidence
ADD COLUMN IF NOT EXISTS task_id UUID NULL,
ADD CONSTRAINT fk_evidence_task FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL; -- Or CASCADE

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to automatically update 'updated_at' on teams table
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); -- Assuming this function exists from previous setup

-- Create team_members table (join table)
CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role_in_team VARCHAR(50) DEFAULT 'member', -- e.g., 'member', 'lead', 'admin'
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT fk_team_members_team FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add columns to campaign_task_instances for team ownership/assignment
ALTER TABLE campaign_task_instances
ADD COLUMN IF NOT EXISTS owner_team_id UUID NULL,
ADD COLUMN IF NOT EXISTS assignee_team_id UUID NULL,
ADD CONSTRAINT fk_cti_owner_team FOREIGN KEY(owner_team_id) REFERENCES teams(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_cti_assignee_team FOREIGN KEY(assignee_team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Optional: Add columns to tasks (master tasks) if teams can be default owners/assignees
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS default_owner_team_id UUID NULL,
ADD COLUMN IF NOT EXISTS default_assignee_team_id UUID NULL,
ADD CONSTRAINT fk_task_default_owner_team FOREIGN KEY(default_owner_team_id) REFERENCES teams(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_task_default_assignee_team FOREIGN KEY(default_assignee_team_id) REFERENCES teams(id) ON DELETE SET NULL;



ALTER TABLE compliance_standards
ADD COLUMN version TEXT,
ADD COLUMN issuing_body TEXT,
ADD COLUMN official_link TEXT;

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable, as some actions might be system-generated
    action VARCHAR(255) NOT NULL, -- e.g., "create_task", "update_evidence_status", "user_login"
    entity_type VARCHAR(100) NOT NULL, -- e.g., "task", "evidence", "user", "campaign"
    entity_id UUID NOT NULL, -- The ID of the affected entity
    changes JSONB, -- Stores details of the changes, e.g., old and new values for updated fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP -- Optional: if you want a separate creation timestamp from the event timestamp
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_entity_type_entity_id ON audit_logs(entity_type, entity_id);