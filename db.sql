-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'auditor', 'user')),
    hashed_password VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_team VARCHAR(50) DEFAULT 'member', -- e.g., 'member', 'lead', 'admin'
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE compliance_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    version TEXT,
    issuing_body TEXT,
    official_link TEXT,
    effective_date DATE, -- These were in sample_data but not in the final schema from db.sql
    expiry_date DATE,    -- These were in sample_data but not in the final schema from db.sql
    jurisdiction TEXT,   -- These were in sample_data but not in the final schema from db.sql
    industry TEXT,       -- These were in sample_data but not in the final schema from db.sql
    tags JSONB,          -- These were in sample_data but not in the final schema from db.sql
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard_id UUID NOT NULL REFERENCES compliance_standards(id) ON DELETE CASCADE,
    control_id_reference VARCHAR(100) NOT NULL,
    requirement_text TEXT NOT NULL,
    version TEXT,
    effective_date DATE,
    expiry_date DATE,
    official_link TEXT,
    priority VARCHAR(50),
    status VARCHAR(50),
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (standard_id, control_id_reference)
);

CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id VARCHAR(100) UNIQUE NOT NULL, -- User-defined or system-generated readable ID
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., Financial, Operational, Security, Compliance
    likelihood VARCHAR(50), -- e.g., Low, Medium, High, Very High
    impact VARCHAR(50),     -- e.g., Low, Medium, High, Very High
    status VARCHAR(50) DEFAULT 'Open', -- e.g., Open, Mitigated, Accepted, Closed
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(100) NOT NULL, -- e.g., policy, procedure, guide, evidence_link
    source_url TEXT, -- URL for external documents or links
    internal_reference VARCHAR(255), -- Internal tracking ID or path for uploaded files
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE connected_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    system_type VARCHAR(100) NOT NULL, -- e.g., 'aws', 'gcp', 'azure', 'github', 'nessus'
    description TEXT,
    configuration JSONB NOT NULL, -- Store sensitive data securely (e.g., use a secrets manager)
    is_enabled BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ,
    last_check_status VARCHAR(100), -- e.g., 'connected', 'error_auth', 'error_timeout'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_type_definitions (
    value TEXT PRIMARY KEY, -- e.g., 'aws', 'azure'
    label TEXT NOT NULL,    -- e.g., 'AWS', 'Azure'
    description TEXT,
    icon_name TEXT,         -- Store the string name of the icon, e.g., 'FaAws'
    color TEXT,             -- e.g., '#FF9900'
    category TEXT,          -- e.g., 'Cloud', 'API'
    configuration_schema JSONB, -- Stores the array of field definitions
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE registered_plugins (
    id TEXT PRIMARY KEY, -- Corresponds to plugin.ID()
    name TEXT NOT NULL,
    check_type_configurations JSONB NOT NULL, -- Stores the map[string]CheckTypeConfiguration
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks ( -- Master Task Templates
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    version TEXT, -- Version of the master task template itself
    tags JSONB,
    high_level_check_type VARCHAR(100), -- Broader category like "Configuration Review", "Log Analysis"
    check_type VARCHAR(100),      -- Specific type, e.g., 'http_get_check', 'aws_s3_public_access'
    target TEXT,                  -- Default target for the check (can be overridden in CTI)
    parameters JSONB,             -- Default parameters (can be overridden in CTI)
    evidence_types_expected TEXT[], -- Array of strings, e.g., {'screenshot', 'log_file'}
    default_priority VARCHAR(50),   -- e.g., 'High', 'Medium', 'Low'
    priority VARCHAR(50),
    status VARCHAR(50),
    linked_document_ids TEXT[],
    
    default_owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    default_assignee_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_requirements ( -- Junction table for Tasks and Requirements (Many-to-Many)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, requirement_id)
);

CREATE TABLE risk_requirements ( -- Junction table for Risks and Requirements (Many-to-Many)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(risk_id, requirement_id)
);

CREATE TABLE task_documents ( -- Junction table for Tasks and Documents (Many-to-Many)
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, document_id)
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    standard_id UUID REFERENCES compliance_standards(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- e.g., Draft, Active, In Progress, Pending Review, Completed, Archived
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_selected_requirements ( -- Requirements scoped for a specific Campaign
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    is_applicable BOOLEAN DEFAULT TRUE,
    UNIQUE (campaign_id, requirement_id)
);

CREATE TABLE campaign_task_instances ( -- Instances of Tasks for a specific Campaign
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    master_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Link to the master task template
    campaign_selected_requirement_id UUID REFERENCES campaign_selected_requirements(id) ON DELETE SET NULL, -- Link to the specific scoped requirement
    title VARCHAR(255) NOT NULL, -- Can be inherited from master_task or overridden
    description TEXT,
    category VARCHAR(100),
    assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    assignee_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- e.g., Open, In Progress, Pending Review, Closed, Failed
    priority VARCHAR(50), -- Inherited from master_task.default_priority or set individually
    due_date TIMESTAMPTZ,
    check_type VARCHAR(255), -- Inherited or specific for this instance
    target TEXT,             -- Inherited or specific (e.g. connected_system_id or URL)
    parameters JSONB,        -- Inherited or specific
    last_checked_at TIMESTAMPTZ,
    last_check_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_task_instance_owners ( -- Junction for multiple owners of a CampaignTaskInstance
    campaign_task_instance_id UUID NOT NULL REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_task_instance_id, user_id)
);

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- For evidence linked to a master task template
    campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE, -- For evidence linked to a campaign task
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_name VARCHAR(255), -- For uploaded files
    file_path VARCHAR(1024), -- For uploaded files
    mime_type VARCHAR(100),  -- For uploaded files
    file_size BIGINT,        -- For uploaded files
    description TEXT,        -- General description or content for text/link evidence
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    review_status VARCHAR(50) DEFAULT 'Pending', -- e.g., Pending, Approved, Rejected
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_evidence_target CHECK ( -- Evidence must be linked to either a master task or a campaign task instance, but not both. Or allow both if needed.
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL) OR
        (task_id IS NULL AND campaign_task_instance_id IS NULL AND file_path IS NOT NULL) -- For generic document links not tied to a task yet
        -- If evidence can be linked to both, remove this constraint or adjust logic.
        -- For now, assuming it's one or the other for specific task-related evidence.
    )
);

CREATE TABLE task_comments ( -- Consolidated comments table
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- For comments on a master task template
    campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE, -- For comments on a campaign task
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Added updated_at
    CONSTRAINT chk_comment_target CHECK (
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL)
    )
);

CREATE TABLE campaign_task_instance_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_task_instance_id UUID NOT NULL REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    task_execution_id UUID, -- ID from the queueing system if applicable
    executed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Can be NULL if system executed
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- e.g., 'Success', 'Failed', 'Error', 'queued', 'running'
    output TEXT, -- Can store JSON, plain text, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL, -- Changed from TEXT to UUID for consistency if most entity IDs are UUIDs
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_teams
BEFORE UPDATE ON teams
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

CREATE TRIGGER set_timestamp_risks
BEFORE UPDATE ON risks
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_documents
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_connected_systems
BEFORE UPDATE ON connected_systems
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_system_type_definitions
BEFORE UPDATE ON system_type_definitions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_registered_plugins
BEFORE UPDATE ON registered_plugins
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_campaign_task_instances_updated_at
BEFORE UPDATE ON campaign_task_instances
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_evidence
BEFORE UPDATE ON evidence
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_task_comments
BEFORE UPDATE ON task_comments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_campaign_task_instance_results
BEFORE UPDATE ON campaign_task_instance_results
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- teams
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- team_members
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- compliance_standards
CREATE INDEX IF NOT EXISTS idx_compliance_standards_short_name ON compliance_standards(short_name);

-- requirements
CREATE INDEX IF NOT EXISTS idx_requirements_standard_id ON requirements(standard_id);
CREATE INDEX IF NOT EXISTS idx_requirements_control_id_reference ON requirements(control_id_reference);

-- risks
CREATE INDEX IF NOT EXISTS idx_risks_risk_id ON risks(risk_id);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

-- connected_systems
CREATE INDEX IF NOT EXISTS idx_connected_systems_system_type ON connected_systems(system_type);

-- tasks (master tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_check_type ON tasks(check_type);
CREATE INDEX IF NOT EXISTS idx_tasks_default_owner_team_id ON tasks(default_owner_team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_default_assignee_team_id ON tasks(default_assignee_team_id);


-- task_requirements
CREATE INDEX IF NOT EXISTS idx_task_requirements_task_id ON task_requirements(task_id);
CREATE INDEX IF NOT EXISTS idx_task_requirements_requirement_id ON task_requirements(requirement_id);

-- risk_requirements
CREATE INDEX IF NOT EXISTS idx_risk_requirements_risk_id ON risk_requirements(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_requirements_requirement_id ON risk_requirements(requirement_id);

-- task_documents
CREATE INDEX IF NOT EXISTS idx_task_documents_task_id ON task_documents(task_id);
CREATE INDEX IF NOT EXISTS idx_task_documents_document_id ON task_documents(document_id);

-- campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_standard_id ON campaigns(standard_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- campaign_selected_requirements
CREATE INDEX IF NOT EXISTS idx_csr_campaign_id ON campaign_selected_requirements(campaign_id);
CREATE INDEX IF NOT EXISTS idx_csr_requirement_id ON campaign_selected_requirements(requirement_id);

-- campaign_task_instances
CREATE INDEX IF NOT EXISTS idx_cti_campaign_id ON campaign_task_instances(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cti_master_task_id ON campaign_task_instances(master_task_id);
CREATE INDEX IF NOT EXISTS idx_cti_csr_id ON campaign_task_instances(campaign_selected_requirement_id);
CREATE INDEX IF NOT EXISTS idx_cti_assignee_user_id ON campaign_task_instances(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_cti_owner_team_id ON campaign_task_instances(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_cti_assignee_team_id ON campaign_task_instances(assignee_team_id);
CREATE INDEX IF NOT EXISTS idx_cti_status ON campaign_task_instances(status);
CREATE INDEX IF NOT EXISTS idx_cti_due_date ON campaign_task_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_cti_check_type ON campaign_task_instances(check_type);

-- campaign_task_instance_owners
CREATE INDEX IF NOT EXISTS idx_cti_owners_instance_id ON campaign_task_instance_owners(campaign_task_instance_id);
CREATE INDEX IF NOT EXISTS idx_cti_owners_user_id ON campaign_task_instance_owners(user_id);

-- evidence
CREATE INDEX IF NOT EXISTS idx_evidence_task_id ON evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_evidence_cti_id ON evidence(campaign_task_instance_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploader_user_id ON evidence(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_review_status ON evidence(review_status);

-- task_comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_cti_id ON task_comments(campaign_task_instance_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- campaign_task_instance_results
CREATE INDEX IF NOT EXISTS idx_ctir_cti_id ON campaign_task_instance_results(campaign_task_instance_id);
CREATE INDEX IF NOT EXISTS idx_ctir_status ON campaign_task_instance_results(status);
CREATE INDEX IF NOT EXISTS idx_ctir_timestamp ON campaign_task_instance_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_ctir_task_execution_id ON campaign_task_instance_results(task_execution_id);


-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id ON audit_logs(entity_type, entity_id);






-- Sample Data for Compliance Automation

-- Clear existing data to prevent duplicate key errors and ensure idempotency
-- Order matters due to foreign key constraints
DELETE FROM campaign_task_instance_results;
DELETE FROM task_comments;
DELETE FROM evidence;
DELETE FROM campaign_task_instance_owners;
DELETE FROM campaign_task_instances;
DELETE FROM campaign_selected_requirements;
DELETE FROM campaigns;
DELETE FROM task_documents;
DELETE FROM task_requirements;
DELETE FROM tasks;
DELETE FROM requirements;
DELETE FROM compliance_standards;
DELETE FROM connected_systems;
DELETE FROM system_type_definitions; -- Added this
DELETE FROM registered_plugins; -- Added this
DELETE FROM documents;
DELETE FROM team_members; -- Added this
DELETE FROM teams; -- Added this
DELETE FROM users; -- Clear users before adding new ones

-- -------------------------------
-- compliance_standards
-- -------------------------------
INSERT INTO compliance_standards (
    id, name, short_name, description, version, issuing_body, official_link, effective_date, expiry_date, jurisdiction, industry, tags, created_at, updated_at
) VALUES
('f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS Critical Security Controls v8', 'CIS v8', 'A prioritized set of safeguards to mitigate the most prevalent cyber-attacks against systems and networks.', '8.0', 'Center for Internet Security', 'https://www.cisecurity.org/controls/v8', '2021-05-18', NULL, 'Global', 'All Industries', '["cybersecurity","best practices"]', NOW(), NOW()),
('a0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c6', 'ISO 27001:2022', 'ISO 27001', 'Information security, cybersecurity and privacy protection — Information security management systems — Requirements.', '2022', 'ISO/IEC', 'https://www.iso.org/standard/82875.html', '2022-10-25', NULL, 'Global', 'All Industries', '["information security","isms"]', NOW(), NOW()),
('c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'General Data Protection Regulation', 'GDPR', 'A regulation in EU law on data protection and privacy for all individuals within the European Union and the European Economic Area.', '2016/679', 'European Union', 'https://gdpr.eu/', '2018-05-25', NULL, 'EU', 'Financial Services', '["privacy","data protection"]', NOW(), NOW());

-- -------------------------------
-- requirements
-- -------------------------------
INSERT INTO requirements (
    id, standard_id, control_id_reference, requirement_text, version, effective_date, expiry_date, official_link, priority, status, tags, created_at, updated_at
) VALUES
('11111111-aaaa-bbbb-cccc-000000000001', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.1', 'Establish and Maintain Detailed Enterprise Asset Inventory.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'High', 'Active', '["asset management"]', NOW(), NOW()),
('11111111-aaaa-bbbb-cccc-000000000002', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.2', 'Address Unauthorized Assets.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'Medium', 'Active', '["asset management","unauthorized assets"]', NOW(), NOW()),
('22222222-bbbb-cccc-dddd-000000000001', 'a0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c6', 'ISO 5.1', 'Policies for information security', '2022', '2022-10-25', NULL, 'https://www.iso.org/standard/82875.html', 'High', 'Active', '["policy"]', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-333333333333', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 5(1)(f)', 'Personal data shall be processed in a manner that ensures appropriate security of the personal data.', '2016/679', '2018-05-25', NULL, 'https://gdpr.eu/article-5-how-to-process-personal-data/', 'Critical', 'Active', '["privacy","security"]', NOW(), NOW());

-- -------------------------------
-- users
-- -------------------------------
INSERT INTO users (id, name, email, role, hashed_password, created_at, updated_at) VALUES
('11111111-aaaa-bbbb-cccc-000000000001', 'Admin User', 'admin@bumblebee.com', 'admin', '$2a$10$6tDq.nToQBZPTvEAjcGvM.LuUx0FlJKFvAqMEliJFrf2wkwgu7/VW', NOW(), NOW()),
('11111111-aaaa-bbbb-cccc-000000000002', 'Auditor User', 'auditor@bumblebee.com', 'auditor', '$2a$10$6tDq.nToQBZPTvEAjcGvM.LuUx0FlJKFvAqMEliJFrf2wkwgu7/VW', NOW(), NOW()),
('11111111-aaaa-bbbb-cccc-000000000003', 'Regular User', 'user@bumblebee.com', 'user', '$2a$10$6tDq.nToQBZPTvEAjcGvM.LuUx0FlJKFvAqMEliJFrf2wkwgu7/VW', NOW(), NOW());

-- -------------------------------
-- teams
-- -------------------------------
INSERT INTO teams (id, name, description, created_at, updated_at) VALUES
('77777777-aaaa-bbbb-cccc-000000000001', 'Security Operations', 'Team responsible for security monitoring and incident response.', NOW(), NOW()),
('77777777-aaaa-bbbb-cccc-000000000002', 'IT Infrastructure', 'Team managing IT hardware and networks.', NOW(), NOW());

-- -------------------------------
-- team_members
-- -------------------------------
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
('77777777-aaaa-bbbb-cccc-000000000001', '11111111-aaaa-bbbb-cccc-000000000001', 'lead'), -- Admin User is lead of SecOps
('77777777-aaaa-bbbb-cccc-000000000001', '11111111-aaaa-bbbb-cccc-000000000002', 'member'), -- Auditor User is member of SecOps
('77777777-aaaa-bbbb-cccc-000000000002', '11111111-aaaa-bbbb-cccc-000000000003', 'member'); -- Regular User is member of IT Infra

-- -------------------------------
-- connected_systems
-- -------------------------------
INSERT INTO connected_systems (
    id, name, system_type, description, configuration, is_enabled, created_at, updated_at
) VALUES
('22222222-aaaa-bbbb-cccc-000000000001', 'Main API', 'generic_api', 'Generic REST API for health checks', '{"baseUrl": "https://api.example.com/v1", "apiKey": "samplekey123"}', true, NOW(), NOW()),
('22222222-aaaa-bbbb-cccc-000000000002', 'Production Database', 'database', 'PostgreSQL production DB', '{"dbType": "postgresql", "host": "db.example.com", "port": 5432, "databaseName": "prod", "username": "admin", "password": "secret"}', true, NOW(), NOW()),
('22222222-aaaa-bbbb-cccc-000000000003', 'AWS Account', 'aws', 'AWS account for cloud checks', '{"accessKeyId": "AKIA...", "secretAccessKey": "...", "region": "us-west-2"}', true, NOW(), NOW());

-- -------------------------------
-- documents
-- -------------------------------
INSERT INTO documents (
    id, name, description, document_type, source_url, internal_reference, created_at, updated_at
) VALUES
('33333333-aaaa-bbbb-cccc-000000000001', 'Asset Inventory Policy', 'Policy for asset inventory management', 'policy', 'https://docs.example.com/asset-inventory-policy.pdf', 'POL-001', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000002', 'API Health Spec', 'API health check specification', 'specification', 'https://docs.example.com/api-health-spec.pdf', 'SPEC-API-01', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000003', 'GDPR Compliance Guide', 'Guide for GDPR compliance', 'guide', 'https://docs.example.com/gdpr-guide.pdf', 'GDPR-GUIDE', NOW(), NOW());

-- -------------------------------
-- tasks
-- These are master task templates. Owner, Assignee, Status, DueDate are managed in campaign_task_instances.
-- -------------------------------
INSERT INTO tasks (
    id, title, description, category, version, created_at, updated_at, check_type, target, parameters, evidence_types_expected, default_priority, default_owner_team_id, default_assignee_team_id, priority, status
) VALUES
('44444444-aaaa-bbbb-cccc-000000000101', 'Implement Asset Inventory System', 'Deploy and configure a centralized asset inventory system.', 'Asset Management', '1.0', NOW(), NOW(), NULL, NULL, '{}', '{"System Design Document","Deployment Confirmation Screenshot","Inventory Report Sample"}', 'High', '77777777-aaaa-bbbb-cccc-000000000002', '77777777-aaaa-bbbb-cccc-000000000002', 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000102', 'API Health Check', 'Automated health check for main API.', 'Monitoring', '1.1', NOW(), NOW(), 'http_get_check', '22222222-aaaa-bbbb-cccc-000000000001', '{"apiPath": "/health", "expected_status_code": 200}', '{"API Health Report"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL,'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000103', 'Database User Audit', 'Audit database users and permissions.', 'Audit', '1.0', NOW(), NOW(), 'database_query_check', '22222222-aaaa-bbbb-cccc-000000000002', '{"query": "SELECT * FROM pg_user;"}', '{"Audit Report"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000104', 'GDPR Data Review', 'Review data handling for GDPR compliance.', 'Compliance', '2.0', NOW(), NOW(), NULL, NULL, '{}', '{"GDPR Compliance Report"}', 'Critical', NULL, NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000105', 'Review Information Security Policies', 'Ensure all information security policies are up-to-date and approved.', 'Policy Management', '1.0', NOW(), NOW(), NULL, NULL, '{}', '{"Policy Document","Approval Record"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active');

-- -------------------------------
-- task_requirements
-- -------------------------------
INSERT INTO task_requirements (task_id, requirement_id) VALUES
('44444444-aaaa-bbbb-cccc-000000000101', '11111111-aaaa-bbbb-cccc-000000000001'),
('44444444-aaaa-bbbb-cccc-000000000102', '11111111-aaaa-bbbb-cccc-000000000002'),
('44444444-aaaa-bbbb-cccc-000000000103', '11111111-aaaa-bbbb-cccc-000000000002'),
('44444444-aaaa-bbbb-cccc-000000000104', '33333333-aaaa-bbbb-cccc-333333333333'),
('44444444-aaaa-bbbb-cccc-000000000105', '22222222-bbbb-cccc-dddd-000000000001');

-- -------------------------------
-- task_documents (linking documents to tasks)
-- -------------------------------
INSERT INTO task_documents (task_id, document_id) VALUES
('44444444-aaaa-bbbb-cccc-000000000101', '33333333-aaaa-bbbb-cccc-000000000001'),
('44444444-aaaa-bbbb-cccc-000000000102', '33333333-aaaa-bbbb-cccc-000000000002'),
('44444444-aaaa-bbbb-cccc-000000000104', '33333333-aaaa-bbbb-cccc-000000000003');

-- Note: User data (owner_user_id, assignee_user_id) is not included here as it's managed in campaign_task_instances.
-- Status and due_date are also managed at the campaign_task_instance level.



INSERT INTO system_type_definitions (value, label, description, icon_name, color, category, configuration_schema) VALUES
('aws', 'AWS', 'Amazon Web Services', 'FaAws', '#FF9900', 'Cloud', '[
    {"name":"accessKeyId","label":"Access Key ID","type":"text","placeholder":"AKIAIOSFODNN7EXAMPLE","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"secretAccessKey","label":"Secret Access Key","type":"password","placeholder":"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY","required":true,"sensitive":true,"options":null,"helpText":null},
    {"name":"defaultRegion","label":"Default Region","type":"text","placeholder":"us-west-2","required":true,"sensitive":false,"options":null,"helpText":null}
]'::jsonb),

('azure', 'Azure', 'Microsoft Azure', 'FaMicrosoft', '#0078D4', 'Cloud', '[
    {"name":"subscriptionId","label":"Subscription ID","type":"text","placeholder":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"tenantId","label":"Tenant ID","type":"text","placeholder":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientId","label":"Client ID (App ID)","type":"text","placeholder":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientSecret","label":"Client Secret","type":"password","placeholder":"YourAppClientSecret","required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('gcp', 'GCP', 'Google Cloud Platform', 'FaGoogle', '#4285F4', 'Cloud', '[
    {"name":"projectId","label":"Project ID","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"privateKey","label":"Private Key (JSON)","type":"textarea","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":"Paste the content of the JSON service account key file."},
    {"name":"clientEmail","label":"Client Email","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null}
]'::jsonb),

('generic_api', 'Generic API', 'Any HTTP/REST API endpoint', 'FaLink', '#1976D2', 'API', '[
    {"name":"baseUrl","label":"Base URL","type":"url","placeholder":"https://api.example.com/v1","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiKey","label":"API Key (Optional)","type":"password","placeholder":"your_api_key","required":false,"sensitive":true,"options":null,"helpText":null},
    {"name":"authHeader","label":"Auth Header Name (Optional)","type":"text","placeholder":"Authorization","required":false,"sensitive":false,"options":null,"helpText":"e.g., ''Authorization'' or ''X-API-Key''"},
    {"name":"authValuePrefix","label":"Auth Value Prefix (Optional)","type":"text","placeholder":"Bearer ","required":false,"sensitive":false,"options":null,"helpText":"e.g., ''Bearer '' or ''Token ''"}
]'::jsonb),

('splunk', 'Splunk', 'Log Management & Analytics', 'FaSearch', '#000000', 'Security', '[
    {"name":"host","label":"Splunk Host","type":"text","placeholder":"splunk.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"port","label":"Management Port","type":"number","placeholder":"8089","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"password","label":"Password","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('grafana', 'Grafana', 'Monitoring & Visualization', 'FaChartLine', '#F46800', 'Security', '[
    {"name":"baseUrl","label":"Grafana URL","type":"url","placeholder":"https://grafana.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiKey","label":"API Key (Viewer or Editor)","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('nessus', 'Nessus', 'Vulnerability Scanner', 'FaShieldAlt', '#00A8E8', 'Security', '[
    {"name":"baseUrl","label":"Nessus URL","type":"url","placeholder":"https://nessus.example.com:8834","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"accessKey","label":"Access Key","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"secretKey","label":"Secret Key","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('qualys', 'Qualys', 'Qualys Guard', 'FaShieldAlt', '#FF4B4B', 'Security', '[
    {"name":"apiUrl","label":"API URL","type":"url","placeholder":"https://qualysapi.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"password","label":"Password","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('crowdstrike', 'CrowdStrike', 'Endpoint Security', 'FaUserShield', '#FF0000', 'Security', '[
    {"name":"baseUrl","label":"API Base URL","type":"url","placeholder":"https://api.crowdstrike.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientId","label":"Client ID","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientSecret","label":"Client Secret","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('palo_alto', 'Palo Alto', 'Network Security (Panorama/Firewall)', 'FaNetworkWired', '#7D0000', 'Security', '[
    {"name":"hostname","label":"Hostname or IP","type":"text","placeholder":"firewall.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiKey","label":"API Key","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('arcsight', 'ArcSight', 'Security Information & Event Management', 'FaFileAlt', '#00A0E3', 'Compliance', '[
    {"name":"managerHost","label":"Manager Host","type":"text","placeholder":"arcsight-esm.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"password","label":"Password","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('servicenow', 'ServiceNow', 'IT Service Management', 'FaFileContract', '#81B5A1', 'Compliance', '[
    {"name":"instanceUrl","label":"Instance URL","type":"url","placeholder":"https://yourinstance.service-now.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"password","label":"Password","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('jira', 'Jira', 'Project Management & Tracking', 'FaClipboardCheck', '#0052CC', 'Compliance', '[
    {"name":"url","label":"Jira URL","type":"url","placeholder":"https://yourcompany.atlassian.net","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username (Email)","type":"text","placeholder":"user@example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiToken","label":"API Token","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('confluence', 'Confluence', 'Documentation & Knowledge Base', 'FaFileWord', '#172B4D', 'Compliance', '[
    {"name":"baseUrl","label":"Confluence URL","type":"url","placeholder":"https://yourcompany.atlassian.net/wiki","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username (Email)","type":"text","placeholder":"user@example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiToken","label":"API Token","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('okta', 'Okta', 'Identity & Access Management', 'FaUserLock', '#007DC1', 'Identity', '[
    {"name":"domain","label":"Okta Domain","type":"url","placeholder":"yourcompany.okta.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiToken","label":"API Token","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('azure_ad', 'Azure AD', 'Microsoft Identity Platform', 'FaUserLock', '#0078D4', 'Identity', '[
    {"name":"tenantId","label":"Tenant ID","type":"text","placeholder":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientId","label":"Client ID (App ID)","type":"text","placeholder":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientSecret","label":"Client Secret","type":"password","placeholder":"YourAppClientSecret","required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('pam', 'PAM', 'Privileged Access Management', 'FaLock', '#6C757D', 'Identity', '[
    {"name":"serverUrl","label":"PAM Server URL","type":"url","placeholder":"https://pam.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiKey","label":"API Key","type":"password","placeholder":null,"required":false,"sensitive":true,"options":null,"helpText":"API Key for authentication (if used)."},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":false,"sensitive":false,"options":null,"helpText":"Username for authentication (if API key not used)."},
    {"name":"password","label":"Password","type":"password","placeholder":null,"required":false,"sensitive":true,"options":null,"helpText":"Password for authentication (if API key not used)."}
]'::jsonb),

('database', 'Database', 'Database Connection', 'FaDatabase', '#0D6EFD', 'Data', '[
    {"name":"dbType","label":"Database Type","type":"select","placeholder":"postgresql","required":true,"sensitive":false,"options":["postgresql","mysql","sqlserver","oracle"],"helpText":null},
    {"name":"host","label":"Host","type":"text","placeholder":"localhost or db.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"port","label":"Port","type":"number","placeholder":"5432","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"databaseName","label":"Database Name","type":"text","placeholder":"mydatabase","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":"db_user","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"password","label":"Password","type":"password","placeholder":"db_password","required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('s3', 'S3', 'Object Storage (AWS S3 or compatible)', 'FaFileArchive', '#FF9900', 'Data', '[
    {"name":"accessKeyId","label":"Access Key ID","type":"text","placeholder":"AKIA...","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"secretAccessKey","label":"Secret Access Key","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null},
    {"name":"region","label":"Region","type":"text","placeholder":"us-east-1","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"endpointUrl","label":"Endpoint URL (Optional)","type":"url","placeholder":"https://s3.custom.example.com","required":false,"sensitive":false,"options":null,"helpText":"For S3-compatible storage."}
]'::jsonb),

('sharepoint', 'SharePoint', 'Document Management', 'FaFilePdf', '#0078D4', 'Data', '[
    {"name":"siteUrl","label":"SharePoint Site URL","type":"url","placeholder":"https://yourtenant.sharepoint.com/sites/YourSite","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientId","label":"Client ID (App Registration)","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"clientSecret","label":"Client Secret (App Registration)","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null},
    {"name":"tenantId","label":"Tenant ID","type":"text","placeholder":"Optional, if different from app registration tenant.","required":false,"sensitive":false,"options":null,"helpText":null}
]'::jsonb),

('github', 'GitHub', 'GitHub Integration', 'FaGithub', '#181717', 'Development', '[
    {"name":"personalAccessToken","label":"Personal Access Token","type":"password","placeholder":"ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","required":true,"sensitive":true,"options":null,"helpText":null},
    {"name":"organization","label":"Organization (Optional)","type":"text","placeholder":"your-org-name","required":false,"sensitive":false,"options":null,"helpText":null}
]'::jsonb),

('gitlab', 'GitLab', 'GitLab Integration', 'FaGitlab', '#FC6D26', 'Development', '[
    {"name":"url","label":"GitLab URL","type":"url","placeholder":"https://gitlab.com","required":true,"sensitive":false,"options":null,"helpText":"Your GitLab instance URL."},
    {"name":"token","label":"Personal Access Token","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('jenkins', 'Jenkins', 'CI/CD Pipeline', 'FaCode', '#D24939', 'Development', '[
    {"name":"jenkinsUrl","label":"Jenkins URL","type":"url","placeholder":"http://jenkins.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"apiToken","label":"API Token","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('sap', 'SAP', 'Enterprise Resource Planning', 'FaFileInvoiceDollar', '#003366', 'Financial', '[
    {"name":"applicationServer","label":"Application Server Host","type":"text","placeholder":"sap.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"systemNumber","label":"System Number","type":"text","placeholder":"00","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"client","label":"Client","type":"text","placeholder":"800","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"password","label":"Password","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb),

('oracle_erp', 'Oracle ERP', 'Enterprise Resource Planning', 'FaFileInvoice', '#F80000', 'Financial', '[
    {"name":"instanceUrl","label":"Instance URL","type":"url","placeholder":"https://erp.example.com","required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"username","label":"Username","type":"text","placeholder":null,"required":true,"sensitive":false,"options":null,"helpText":null},
    {"name":"password","label":"Password","type":"password","placeholder":null,"required":true,"sensitive":true,"options":null,"helpText":null}
]'::jsonb)
ON CONFLICT (value) DO NOTHING;
-- Use ON CONFLICT (value) DO NOTHING to prevent errors if you run this script multiple times.
-- If you want to update existing entries, you would use ON CONFLICT (value) DO UPDATE SET ...
