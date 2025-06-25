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
('c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'General Data Protection Regulation', 'GDPR', 'A regulation in EU law on data protection and privacy for all individuals within the European Union and the European Economic Area.', '2016/679', 'European Union', 'https://gdpr.eu/', '2018-05-25', NULL, 'EU', 'All Industries', '["privacy","data protection"]', NOW(), NOW()),
('d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6', 'NYDFS Cybersecurity Regulation', 'NYDFS', 'Cybersecurity requirements for financial services companies operating in New York State.', '23 NYCRR 500', 'New York Department of Financial Services', 'https://www.dfs.ny.gov/cybersecurity', '2017-03-01', NULL, 'New York', 'Financial Services', '["cybersecurity","financial services"]', NOW(), NOW()),
('e2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7', 'Payment Card Industry Data Security Standard', 'PCI DSS', 'Information security standard for organizations that handle branded credit cards.', '4.0', 'PCI Security Standards Council', 'https://www.pcisecuritystandards.org/', '2022-03-31', NULL, 'Global', 'Financial Services', '["payment security","card data"]', NOW(), NOW()),
('f3a4b5c6-d7e8-f9a0-b1c2-d3e4f5a6b7c8', 'Sarbanes-Oxley Act', 'SOX', 'Federal law that sets standards for all U.S. public company boards, management, and public accounting firms.', '2002', 'U.S. Congress', 'https://www.sec.gov/sox', '2002-07-30', NULL, 'United States', 'Public Companies', '["financial reporting","internal controls"]', NOW(), NOW()),
('a4b5c6d7-e8f9-a0b1-c2d3-e4f5a6b7c8d9', 'NIST Cybersecurity Framework', 'NIST CSF', 'A framework for improving critical infrastructure cybersecurity.', '2.0', 'National Institute of Standards and Technology', 'https://www.nist.gov/cyberframework', '2024-02-06', NULL, 'United States', 'Critical Infrastructure', '["cybersecurity","risk management"]', NOW(), NOW()),
('b5c6d7e8-f9a0-b1c2-d3e4-f5a6b7c8d9e0', 'Health Insurance Portability and Accountability Act', 'HIPAA', 'Federal law that requires the creation of national standards to protect sensitive patient health information.', '1996', 'U.S. Department of Health and Human Services', 'https://www.hhs.gov/hipaa', '1996-08-21', NULL, 'United States', 'Healthcare', '["healthcare","privacy","security"]', NOW(), NOW()),
('c6d7e8f9-a0b1-c2d3-e4f5-a6b7c8d9e0f1', 'SOC 2 Type II', 'SOC 2', 'A voluntary compliance standard for service organizations developed by the AICPA.', '2017', 'AICPA', 'https://www.aicpa.org/soc2', '2017-01-01', NULL, 'United States', 'Technology Services', '["security","availability","processing integrity"]', NOW(), NOW()),
('d7e8f9a0-b1c2-d3e4-f5a6-b7c8d9e0f1a2', 'FedRAMP', 'FedRAMP', 'Federal Risk and Authorization Management Program for cloud service providers.', '2023', 'GSA', 'https://www.fedramp.gov/', '2011-12-08', NULL, 'United States', 'Government', '["cloud security","government"]', NOW(), NOW());

-- -------------------------------
-- requirements
-- -------------------------------
INSERT INTO requirements (
    id, standard_id, control_id_reference, requirement_text, version, effective_date, expiry_date, official_link, priority, status, tags, created_at, updated_at
) VALUES
-- CIS Controls
('11111111-aaaa-bbbb-cccc-000000000001', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.1', 'Establish and Maintain Detailed Enterprise Asset Inventory.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'High', 'Active', '["asset management"]', NOW(), NOW()),
('11111111-aaaa-bbbb-cccc-000000000002', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.2', 'Address Unauthorized Assets.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'Medium', 'Active', '["asset management","unauthorized assets"]', NOW(), NOW()),
('11111111-aaaa-bbbb-cccc-000000000003', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 2.1', 'Establish and Maintain a Software Inventory.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'High', 'Active', '["software inventory"]', NOW(), NOW()),
('11111111-aaaa-bbbb-cccc-000000000004', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 3.1', 'Establish and Maintain a Vulnerability Management Process.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'Critical', 'Active', '["vulnerability management"]', NOW(), NOW()),

-- ISO 27001
('22222222-bbbb-cccc-dddd-000000000001', 'a0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c6', 'ISO 5.1', 'Policies for information security', '2022', '2022-10-25', NULL, 'https://www.iso.org/standard/82875.html', 'High', 'Active', '["policy"]', NOW(), NOW()),
('22222222-bbbb-cccc-dddd-000000000002', 'a0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c6', 'ISO 6.1', 'Information security roles and responsibilities', '2022', '2022-10-25', NULL, 'https://www.iso.org/standard/82875.html', 'High', 'Active', '["roles","responsibilities"]', NOW(), NOW()),
('22222222-bbbb-cccc-dddd-000000000003', 'a0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c6', 'ISO 7.1', 'Screening', '2022', '2022-10-25', NULL, 'https://www.iso.org/standard/82875.html', 'Medium', 'Active', '["personnel","screening"]', NOW(), NOW()),
('22222222-bbbb-cccc-dddd-000000000004', 'a0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c6', 'ISO 8.1', 'Inventory of information and other associated assets', '2022', '2022-10-25', NULL, 'https://www.iso.org/standard/82875.html', 'High', 'Active', '["asset management"]', NOW(), NOW()),

-- GDPR
('33333333-aaaa-bbbb-cccc-333333333333', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 5(1)(f)', 'Personal data shall be processed in a manner that ensures appropriate security of the personal data.', '2016/679', '2018-05-25', NULL, 'https://gdpr.eu/article-5-how-to-process-personal-data/', 'Critical', 'Active', '["privacy","security"]', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-333333333334', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 25', 'Data protection by design and by default', '2016/679', '2018-05-25', NULL, 'https://gdpr.eu/article-25-data-protection-by-design/', 'Critical', 'Active', '["privacy by design"]', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-333333333335', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 32', 'Security of processing', '2016/679', '2018-05-25', NULL, 'https://gdpr.eu/article-32-security-of-processing/', 'Critical', 'Active', '["security","encryption"]', NOW(), NOW()),

-- NYDFS
('44444444-cccc-dddd-eeee-444444444444', 'd1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6', 'NYDFS 500.02', 'Cybersecurity Program', '23 NYCRR 500', '2017-03-01', NULL, 'https://www.dfs.ny.gov/cybersecurity', 'Critical', 'Active', '["cybersecurity program"]', NOW(), NOW()),
('44444444-cccc-dddd-eeee-444444444445', 'd1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6', 'NYDFS 500.03', 'Cybersecurity Policy', '23 NYCRR 500', '2017-03-01', NULL, 'https://www.dfs.ny.gov/cybersecurity', 'High', 'Active', '["policy"]', NOW(), NOW()),
('44444444-cccc-dddd-eeee-444444444446', 'd1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6', 'NYDFS 500.04', 'Chief Information Security Officer', '23 NYCRR 500', '2017-03-01', NULL, 'https://www.dfs.ny.gov/cybersecurity', 'High', 'Active', '["ciso","leadership"]', NOW(), NOW()),
('44444444-cccc-dddd-eeee-444444444447', 'd1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6', 'NYDFS 500.05', 'Penetration Testing and Vulnerability Assessments', '23 NYCRR 500', '2017-03-01', NULL, 'https://www.dfs.ny.gov/cybersecurity', 'Critical', 'Active', '["penetration testing","vulnerability assessment"]', NOW(), NOW()),

-- PCI DSS
('55555555-dddd-eeee-ffff-555555555555', 'e2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7', 'PCI DSS 1.1', 'Install and maintain a firewall configuration to protect cardholder data', '4.0', '2022-03-31', NULL, 'https://www.pcisecuritystandards.org/', 'Critical', 'Active', '["firewall","network security"]', NOW(), NOW()),
('55555555-dddd-eeee-ffff-555555555556', 'e2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7', 'PCI DSS 2.1', 'Do not use vendor-supplied defaults for system passwords and other security parameters', '4.0', '2022-03-31', NULL, 'https://www.pcisecuritystandards.org/', 'Critical', 'Active', '["default passwords","system hardening"]', NOW(), NOW()),
('55555555-dddd-eeee-ffff-555555555557', 'e2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7', 'PCI DSS 3.1', 'Protect stored cardholder data', '4.0', '2022-03-31', NULL, 'https://www.pcisecuritystandards.org/', 'Critical', 'Active', '["data protection","encryption"]', NOW(), NOW()),
('55555555-dddd-eeee-ffff-555555555558', 'e2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7', 'PCI DSS 4.1', 'Encrypt transmission of cardholder data across open, public networks', '4.0', '2022-03-31', NULL, 'https://www.pcisecuritystandards.org/', 'Critical', 'Active', '["encryption","transmission security"]', NOW(), NOW()),

-- SOX
('66666666-eeee-ffff-aaaa-666666666666', 'f3a4b5c6-d7e8-f9a0-b1c2-d3e4f5a6b7c8', 'SOX 302', 'Corporate responsibility for financial reports', '2002', '2002-07-30', NULL, 'https://www.sec.gov/sox', 'Critical', 'Active', '["financial reporting","certification"]', NOW(), NOW()),
('66666666-eeee-ffff-bbbb-666666666667', 'f3a4b5c6-d7e8-f9a0-b1c2-d3e4f5a6b7c8', 'SOX 404', 'Management assessment of internal controls', '2002', '2002-07-30', NULL, 'https://www.sec.gov/sox', 'Critical', 'Active', '["internal controls","assessment"]', NOW(), NOW()),
('66666666-eeee-ffff-cccc-666666666668', 'f3a4b5c6-d7e8-f9a0-b1c2-d3e4f5a6b7c8', 'SOX 409', 'Real-time disclosure', '2002', '2002-07-30', NULL, 'https://www.sec.gov/sox', 'High', 'Active', '["disclosure","real-time"]', NOW(), NOW()),

-- NIST CSF
('77777777-ffff-aaaa-bbbb-777777777777', 'a4b5c6d7-e8f9-a0b1-c2d3-e4f5a6b7c8d9', 'NIST ID.AM-1', 'Physical devices and systems within the organization are inventoried', '2.0', '2024-02-06', NULL, 'https://www.nist.gov/cyberframework', 'High', 'Active', '["asset management","inventory"]', NOW(), NOW()),
('77777777-ffff-aaaa-cccc-777777777778', 'a4b5c6d7-e8f9-a0b1-c2d3-e4f5a6b7c8d9', 'NIST ID.AM-2', 'Software platforms and applications within the organization are inventoried', '2.0', '2024-02-06', NULL, 'https://www.nist.gov/cyberframework', 'High', 'Active', '["software inventory"]', NOW(), NOW()),
('77777777-ffff-aaaa-dddd-777777777779', 'a4b5c6d7-e8f9-a0b1-c2d3-e4f5a6b7c8d9', 'NIST PR.AC-1', 'Identities and credentials are issued, managed, verified, revoked, and audited for authorized devices, users and processes', '2.0', '2024-02-06', NULL, 'https://www.nist.gov/cyberframework', 'Critical', 'Active', '["identity management","access control"]', NOW(), NOW()),

-- HIPAA
('88888888-aaaa-bbbb-cccc-888888888888', 'b5c6d7e8-f9a0-b1c2-d3e4-f5a6b7c8d9e0', 'HIPAA 164.308(a)(1)', 'Security Management Process', '1996', '1996-08-21', NULL, 'https://www.hhs.gov/hipaa', 'Critical', 'Active', '["security management"]', NOW(), NOW()),
('88888888-aaaa-bbbb-dddd-888888888889', 'b5c6d7e8-f9a0-b1c2-d3e4-f5a6b7c8d9e0', 'HIPAA 164.308(a)(2)', 'Assigned Security Responsibility', '1996', '1996-08-21', NULL, 'https://www.hhs.gov/hipaa', 'High', 'Active', '["security responsibility"]', NOW(), NOW()),
('88888888-aaaa-bbbb-eeee-888888888890', 'b5c6d7e8-f9a0-b1c2-d3e4-f5a6b7c8d9e0', 'HIPAA 164.312(a)(1)', 'Access Control', '1996', '1996-08-21', NULL, 'https://www.hhs.gov/hipaa', 'Critical', 'Active', '["access control"]', NOW(), NOW()),

-- SOC 2
('2287a396-092d-438e-a2f1-8fe15e348b40', 'c6d7e8f9-a0b1-c2d3-e4f5-a6b7c8d9e0f1', 'SOC 2 CC6.1', 'The entity develops and maintains security policies that establish security requirements', '2017', '2017-01-01', NULL, 'https://www.aicpa.org/soc2', 'High', 'Active', '["security policies"]', NOW(), NOW()),
('e912e99e-e280-41e4-9afd-bd090519c3a1', 'c6d7e8f9-a0b1-c2d3-e4f5-a6b7c8d9e0f1', 'SOC 2 CC7.1', 'The entity selects and develops security configurations for information and technology infrastructure', '2017', '2017-01-01', NULL, 'https://www.aicpa.org/soc2', 'High', 'Active', '["security configuration"]', NOW(), NOW()),

-- FedRAMP
('e2051746-3b9f-41c0-8dcc-4df1f2fe5780', 'd7e8f9a0-b1c2-d3e4-f5a6-b7c8d9e0f1a2', 'FedRAMP AC-1', 'Access Control Policy and Procedures', '2023', '2011-12-08', NULL, 'https://www.fedramp.gov/', 'High', 'Active', '["access control","policy"]', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd7e8f9a0-b1c2-d3e4-f5a6-b7c8d9e0f1a2', 'FedRAMP AC-2', 'Account Management', '2023', '2011-12-08', NULL, 'https://www.fedramp.gov/', 'Critical', 'Active', '["account management"]', NOW(), NOW());

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
('33333333-aaaa-bbbb-cccc-000000000003', 'GDPR Compliance Guide', 'Guide for GDPR compliance', 'guide', 'https://docs.example.com/gdpr-guide.pdf', 'GDPR-GUIDE', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000004', 'Information Security Policy', 'Comprehensive information security policy', 'policy', 'https://docs.example.com/info-security-policy.pdf', 'POL-002', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000005', 'Incident Response Plan', 'Security incident response procedures', 'procedure', 'https://docs.example.com/incident-response-plan.pdf', 'PROC-001', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000006', 'Business Continuity Plan', 'Business continuity and disaster recovery plan', 'procedure', 'https://docs.example.com/business-continuity-plan.pdf', 'PROC-002', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000007', 'PCI DSS Compliance Manual', 'PCI DSS compliance procedures and controls', 'manual', 'https://docs.example.com/pci-dss-manual.pdf', 'MANUAL-001', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000008', 'SOX Internal Controls Framework', 'SOX internal controls documentation', 'framework', 'https://docs.example.com/sox-controls-framework.pdf', 'FRAMEWORK-001', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000009', 'HIPAA Security Rule Implementation', 'HIPAA security rule implementation guide', 'guide', 'https://docs.example.com/hipaa-security-guide.pdf', 'HIPAA-GUIDE', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000010', 'NYDFS Cybersecurity Program', 'NYDFS cybersecurity program documentation', 'program', 'https://docs.example.com/nydfs-cyber-program.pdf', 'PROGRAM-001', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000011', 'NIST CSF Implementation Guide', 'NIST Cybersecurity Framework implementation', 'guide', 'https://docs.example.com/nist-csf-guide.pdf', 'NIST-GUIDE', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000012', 'Access Control Policy', 'User access control and management policy', 'policy', 'https://docs.example.com/access-control-policy.pdf', 'POL-003', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000013', 'Data Protection Policy', 'Data protection and privacy policy', 'policy', 'https://docs.example.com/data-protection-policy.pdf', 'POL-004', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000014', 'Network Security Policy', 'Network security and segmentation policy', 'policy', 'https://docs.example.com/network-security-policy.pdf', 'POL-005', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000015', 'Cloud Security Policy', 'Cloud security and governance policy', 'policy', 'https://docs.example.com/cloud-security-policy.pdf', 'POL-006', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000016', 'Application Security Standards', 'Application security development standards', 'standard', 'https://docs.example.com/app-security-standards.pdf', 'STD-001', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000017', 'Vendor Management Policy', 'Third-party vendor security requirements', 'policy', 'https://docs.example.com/vendor-management-policy.pdf', 'POL-007', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000018', 'Security Awareness Training Program', 'Employee security awareness training materials', 'program', 'https://docs.example.com/security-training-program.pdf', 'PROGRAM-002', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000019', 'SOC 2 Type II Controls', 'SOC 2 Type II control documentation', 'controls', 'https://docs.example.com/soc2-controls.pdf', 'CONTROLS-001', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-000000000020', 'FedRAMP Security Controls', 'FedRAMP security controls implementation', 'controls', 'https://docs.example.com/fedramp-controls.pdf', 'CONTROLS-002', NOW(), NOW());

-- -------------------------------
-- tasks
-- These are master task templates. Owner, Assignee, Status, DueDate are managed in campaign_task_instances.
-- -------------------------------
INSERT INTO tasks (
    id, title, description, category, version, created_at, updated_at, check_type, target, parameters, evidence_types_expected, default_priority, default_owner_team_id, default_assignee_team_id, priority, status
) VALUES
-- Asset Management Tasks
('44444444-aaaa-bbbb-cccc-000000000101', 'Implement Asset Inventory System', 'Deploy and configure a centralized asset inventory system.', 'Asset Management', '1.0', NOW(), NOW(), NULL, NULL, '{}', '{"System Design Document","Deployment Confirmation Screenshot","Inventory Report Sample"}', 'High', '77777777-aaaa-bbbb-cccc-000000000002', '77777777-aaaa-bbbb-cccc-000000000002', 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000102', 'Conduct Asset Discovery Scan', 'Perform automated discovery of all network assets.', 'Asset Management', '1.1', NOW(), NOW(), 'network_discovery_scan', NULL, '{"scan_range": "10.0.0.0/8", "scan_type": "comprehensive"}', '{"Scan Report","Asset List","Network Map"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000103', 'Software License Audit', 'Audit software licenses and ensure compliance.', 'Asset Management', '1.0', NOW(), NOW(), 'software_license_check', NULL, '{"audit_scope": "all_software"}', '{"License Audit Report","Compliance Status"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000002', NULL, 'Medium', 'Active'),

-- Security Monitoring Tasks
('44444444-aaaa-bbbb-cccc-000000000201', 'API Health Check', 'Automated health check for main API.', 'Monitoring', '1.1', NOW(), NOW(), 'http_get_check', '22222222-aaaa-bbbb-cccc-000000000001', '{"apiPath": "/health", "expected_status_code": 200}', '{"API Health Report"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL,'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000202', 'Security Log Monitoring Setup', 'Configure centralized security log monitoring.', 'Monitoring', '1.0', NOW(), NOW(), 'log_monitoring_setup', NULL, '{"log_sources": ["firewall", "ids", "servers"]}', '{"Monitoring Configuration","Alert Rules"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000203', 'Vulnerability Scan', 'Perform automated vulnerability assessment.', 'Security Assessment', '1.0', NOW(), NOW(), 'vulnerability_scan', NULL, '{"scan_type": "comprehensive", "targets": "all_assets"}', '{"Vulnerability Report","Remediation Plan"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),

-- Access Control Tasks
('44444444-aaaa-bbbb-cccc-000000000301', 'Database User Audit', 'Audit database users and permissions.', 'Access Control', '1.0', NOW(), NOW(), 'database_query_check', '22222222-aaaa-bbbb-cccc-000000000002', '{"query": "SELECT * FROM pg_user;"}', '{"Audit Report"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000302', 'Privileged Access Review', 'Review and document privileged access accounts.', 'Access Control', '1.0', NOW(), NOW(), 'privileged_access_review', NULL, '{"review_scope": "all_privileged_accounts"}', '{"Access Review Report","Account List"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000303', 'Multi-Factor Authentication Implementation', 'Implement MFA for all critical systems.', 'Access Control', '1.0', NOW(), NOW(), 'mfa_implementation', NULL, '{"systems": ["vpn", "admin_portals", "critical_apps"]}', '{"MFA Configuration","User Training Materials"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),

-- Data Protection Tasks
('44444444-aaaa-bbbb-cccc-000000000401', 'Data Encryption Assessment', 'Assess encryption status of sensitive data.', 'Data Protection', '1.0', NOW(), NOW(), 'encryption_assessment', NULL, '{"data_types": ["pii", "phi", "financial"]}', '{"Encryption Assessment Report"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000402', 'Backup Encryption Verification', 'Verify that all backups are properly encrypted.', 'Data Protection', '1.0', NOW(), NOW(), 'backup_encryption_check', NULL, '{"backup_locations": ["local", "cloud", "offsite"]}', '{"Backup Encryption Report"}', 'High', '77777777-aaaa-bbbb-cccc-000000000002', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000403', 'Data Loss Prevention Implementation', 'Implement DLP controls for sensitive data.', 'Data Protection', '1.0', NOW(), NOW(), 'dlp_implementation', NULL, '{"data_types": ["credit_cards", "ssn", "health_records"]}', '{"DLP Configuration","Policy Documentation"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),

-- Network Security Tasks
('44444444-aaaa-bbbb-cccc-000000000501', 'Firewall Rule Review', 'Review and document firewall rules.', 'Network Security', '1.0', NOW(), NOW(), 'firewall_rule_audit', NULL, '{"firewalls": ["perimeter", "internal", "dmz"]}', '{"Firewall Rule Report","Rule Documentation"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000502', 'Network Segmentation Assessment', 'Assess network segmentation effectiveness.', 'Network Security', '1.0', NOW(), NOW(), 'network_segmentation_check', NULL, '{"segments": ["production", "development", "dmz"]}', '{"Segmentation Assessment","Network Diagram"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000503', 'VPN Security Review', 'Review VPN configuration and security.', 'Network Security', '1.0', NOW(), NOW(), 'vpn_security_audit', NULL, '{"vpn_types": ["ssl", "ipsec"]}', '{"VPN Security Report","Configuration Review"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),

-- Compliance Tasks
('44444444-aaaa-bbbb-cccc-000000000601', 'GDPR Data Review', 'Review data handling for GDPR compliance.', 'Compliance', '2.0', NOW(), NOW(), NULL, NULL, '{}', '{"GDPR Compliance Report"}', 'Critical', NULL, NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000602', 'PCI DSS Compliance Assessment', 'Assess compliance with PCI DSS requirements.', 'Compliance', '1.0', NOW(), NOW(), 'pci_compliance_check', NULL, '{"pci_scope": "cardholder_data_environment"}', '{"PCI Compliance Report","Scope Documentation"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000603', 'SOX Internal Controls Review', 'Review internal controls for SOX compliance.', 'Compliance', '1.0', NOW(), NOW(), 'sox_controls_review', NULL, '{"control_categories": ["financial", "it_general", "application"]}', '{"SOX Controls Report","Control Matrix"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000604', 'HIPAA Security Assessment', 'Assess security controls for HIPAA compliance.', 'Compliance', '1.0', NOW(), NOW(), 'hipaa_security_check', NULL, '{"hipaa_scope": "covered_entities"}', '{"HIPAA Security Report","Risk Assessment"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),

-- Policy Management Tasks
('44444444-aaaa-bbbb-cccc-000000000701', 'Review Information Security Policies', 'Ensure all information security policies are up-to-date and approved.', 'Policy Management', '1.0', NOW(), NOW(), NULL, NULL, '{}', '{"Policy Document","Approval Record"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000702', 'Incident Response Plan Review', 'Review and update incident response procedures.', 'Policy Management', '1.0', NOW(), NOW(), NULL, NULL, '{}', '{"Incident Response Plan","Testing Results"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000703', 'Business Continuity Plan Assessment', 'Assess business continuity and disaster recovery plans.', 'Policy Management', '1.0', NOW(), NOW(), 'bcm_assessment', NULL, '{"assessment_scope": "critical_business_functions"}', '{"BCM Assessment Report","Recovery Procedures"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),

-- Cloud Security Tasks
('44444444-aaaa-bbbb-cccc-000000000801', 'AWS Security Configuration Review', 'Review AWS security configurations and settings.', 'Cloud Security', '1.0', NOW(), NOW(), 'aws_security_audit', '22222222-aaaa-bbbb-cccc-000000000003', '{"services": ["ec2", "s3", "iam", "vpc"]}', '{"AWS Security Report","Configuration Review"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000802', 'Cloud Access Control Review', 'Review cloud access controls and permissions.', 'Cloud Security', '1.0', NOW(), NOW(), 'cloud_access_review', NULL, '{"cloud_providers": ["aws", "azure", "gcp"]}', '{"Cloud Access Report","Permission Matrix"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000803', 'Cloud Data Protection Assessment', 'Assess data protection controls in cloud environments.', 'Cloud Security', '1.0', NOW(), NOW(), 'cloud_data_protection', NULL, '{"data_types": ["pii", "confidential", "regulated"]}', '{"Cloud Data Protection Report"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),

-- Application Security Tasks
('44444444-aaaa-bbbb-cccc-000000000901', 'Application Security Testing', 'Perform security testing on critical applications.', 'Application Security', '1.0', NOW(), NOW(), 'app_security_test', NULL, '{"testing_type": "penetration_testing", "applications": "critical_apps"}', '{"Security Test Report","Vulnerability Assessment"}', 'Critical', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Critical', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000902', 'Code Security Review', 'Review application code for security vulnerabilities.', 'Application Security', '1.0', NOW(), NOW(), 'code_security_scan', NULL, '{"scan_type": "static_analysis", "languages": ["java", "python", "javascript"]}', '{"Code Security Report","Vulnerability List"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000000903', 'API Security Assessment', 'Assess security of internal and external APIs.', 'Application Security', '1.0', NOW(), NOW(), 'api_security_test', NULL, '{"api_endpoints": "all_apis", "testing_scope": "authentication,authorization,data_validation"}', '{"API Security Report","Test Results"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),

-- Incident Response Tasks
('44444444-aaaa-bbbb-cccc-000000001001', 'Security Incident Response Exercise', 'Conduct tabletop exercise for security incident response.', 'Incident Response', '1.0', NOW(), NOW(), 'incident_response_exercise', NULL, '{"scenario": "data_breach", "participants": "security_team"}', '{"Exercise Report","Lessons Learned"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000001002', 'Forensic Readiness Assessment', 'Assess forensic readiness and capabilities.', 'Incident Response', '1.0', NOW(), NOW(), 'forensic_readiness_check', NULL, '{"capabilities": ["logging", "evidence_collection", "analysis_tools"]}', '{"Forensic Readiness Report","Capability Assessment"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),

-- Training and Awareness Tasks
('44444444-aaaa-bbbb-cccc-000000001101', 'Security Awareness Training', 'Conduct security awareness training for all employees.', 'Training and Awareness', '1.0', NOW(), NOW(), 'security_training', NULL, '{"training_type": "annual", "topics": ["phishing", "password_security", "data_protection"]}', '{"Training Materials","Completion Records"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),
('44444444-aaaa-bbbb-cccc-000000001102', 'Phishing Simulation Exercise', 'Conduct phishing simulation to test employee awareness.', 'Training and Awareness', '1.0', NOW(), NOW(), 'phishing_simulation', NULL, '{"simulation_type": "targeted", "frequency": "quarterly"}', '{"Simulation Report","Response Analysis"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active'),

-- Third Party Risk Management Tasks
('44444444-aaaa-bbbb-cccc-000000001201', 'Third Party Security Assessment', 'Assess security posture of critical third-party vendors.', 'Third Party Risk', '1.0', NOW(), NOW(), 'vendor_security_assessment', NULL, '{"vendor_tier": "critical", "assessment_type": "comprehensive"}', '{"Vendor Assessment Report","Risk Matrix"}', 'High', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'High', 'Active'),
('44444444-aaaa-bbbb-cccc-000000001202', 'Vendor Contract Security Review', 'Review security requirements in vendor contracts.', 'Third Party Risk', '1.0', NOW(), NOW(), 'contract_security_review', NULL, '{"contract_types": ["service_providers", "cloud_providers"]}', '{"Contract Review Report","Security Requirements"}', 'Medium', '77777777-aaaa-bbbb-cccc-000000000001', NULL, 'Medium', 'Active');

-- -------------------------------
-- task_requirements
-- -------------------------------
INSERT INTO task_requirements (task_id, requirement_id) VALUES
-- CIS Controls Mappings
('44444444-aaaa-bbbb-cccc-000000000101', '11111111-aaaa-bbbb-cccc-000000000001'), -- Asset Inventory System -> CIS 1.1
('44444444-aaaa-bbbb-cccc-000000000102', '11111111-aaaa-bbbb-cccc-000000000001'), -- Asset Discovery Scan -> CIS 1.1
('44444444-aaaa-bbbb-cccc-000000000102', '11111111-aaaa-bbbb-cccc-000000000002'), -- Asset Discovery Scan -> CIS 1.2
('44444444-aaaa-bbbb-cccc-000000000103', '11111111-aaaa-bbbb-cccc-000000000003'), -- Software License Audit -> CIS 2.1
('44444444-aaaa-bbbb-cccc-000000000203', '11111111-aaaa-bbbb-cccc-000000000004'), -- Vulnerability Scan -> CIS 3.1

-- ISO 27001 Mappings
('44444444-aaaa-bbbb-cccc-000000000701', '22222222-bbbb-cccc-dddd-000000000001'), -- Security Policies -> ISO 5.1
('44444444-aaaa-bbbb-cccc-000000000701', '22222222-bbbb-cccc-dddd-000000000002'), -- Security Policies -> ISO 6.1
('44444444-aaaa-bbbb-cccc-000000000101', '22222222-bbbb-cccc-dddd-000000000004'), -- Asset Inventory -> ISO 8.1

-- GDPR Mappings
('44444444-aaaa-bbbb-cccc-000000000601', '33333333-aaaa-bbbb-cccc-333333333333'), -- GDPR Data Review -> GDPR Art. 5(1)(f)
('44444444-aaaa-bbbb-cccc-000000000601', '33333333-aaaa-bbbb-cccc-333333333334'), -- GDPR Data Review -> GDPR Art. 25
('44444444-aaaa-bbbb-cccc-000000000401', '33333333-aaaa-bbbb-cccc-333333333335'), -- Data Encryption -> GDPR Art. 32
('44444444-aaaa-bbbb-cccc-000000000403', '33333333-aaaa-bbbb-cccc-333333333335'), -- DLP Implementation -> GDPR Art. 32

-- NYDFS Mappings
('44444444-aaaa-bbbb-cccc-000000000701', '44444444-cccc-dddd-eeee-444444444445'), -- Security Policies -> NYDFS 500.03
('44444444-aaaa-bbbb-cccc-000000000203', '44444444-cccc-dddd-eeee-444444444447'), -- Vulnerability Scan -> NYDFS 500.05
('44444444-aaaa-bbbb-cccc-000000000401', '44444444-cccc-dddd-eeee-444444444444'), -- Data Encryption -> NYDFS 500.02

-- PCI DSS Mappings
('44444444-aaaa-bbbb-cccc-000000000602', '55555555-dddd-eeee-ffff-555555555555'), -- PCI Assessment -> PCI DSS 1.1
('44444444-aaaa-bbbb-cccc-000000000602', '55555555-dddd-eeee-ffff-555555555556'), -- PCI Assessment -> PCI DSS 2.1
('44444444-aaaa-bbbb-cccc-000000000602', '55555555-dddd-eeee-ffff-555555555557'), -- PCI Assessment -> PCI DSS 3.1
('44444444-aaaa-bbbb-cccc-000000000602', '55555555-dddd-eeee-ffff-555555555558'), -- PCI Assessment -> PCI DSS 4.1
('44444444-aaaa-bbbb-cccc-000000000401', '55555555-dddd-eeee-ffff-555555555557'), -- Data Encryption -> PCI DSS 3.1
('44444444-aaaa-bbbb-cccc-000000000501', '55555555-dddd-eeee-ffff-555555555555'), -- Firewall Review -> PCI DSS 1.1

-- SOX Mappings
('44444444-aaaa-bbbb-cccc-000000000603', '66666666-eeee-ffff-aaaa-666666666666'), -- SOX Controls -> SOX 302
('44444444-aaaa-bbbb-cccc-000000000603', '66666666-eeee-ffff-bbbb-666666666667'), -- SOX Controls -> SOX 404
('44444444-aaaa-bbbb-cccc-000000000603', '66666666-eeee-ffff-cccc-666666666668'), -- SOX Controls -> SOX 409

-- NIST CSF Mappings
('44444444-aaaa-bbbb-cccc-000000000101', '77777777-ffff-aaaa-bbbb-777777777777'), -- Asset Inventory -> NIST ID.AM-1
('44444444-aaaa-bbbb-cccc-000000000103', '77777777-ffff-aaaa-cccc-777777777778'), -- Software Audit -> NIST ID.AM-2
('44444444-aaaa-bbbb-cccc-000000000302', '77777777-ffff-aaaa-dddd-777777777779'), -- Privileged Access -> NIST PR.AC-1
('44444444-aaaa-bbbb-cccc-000000000303', '77777777-ffff-aaaa-dddd-777777777779'), -- MFA Implementation -> NIST PR.AC-1

-- HIPAA Mappings
('44444444-aaaa-bbbb-cccc-000000000604', '88888888-aaaa-bbbb-cccc-888888888888'), -- HIPAA Assessment -> HIPAA 164.308(a)(1)
('44444444-aaaa-bbbb-cccc-000000000604', '88888888-aaaa-bbbb-dddd-888888888889'), -- HIPAA Assessment -> HIPAA 164.308(a)(2)
('44444444-aaaa-bbbb-cccc-000000000604', '88888888-aaaa-bbbb-eeee-888888888890'), -- HIPAA Assessment -> HIPAA 164.312(a)(1)
('44444444-aaaa-bbbb-cccc-000000000301', '88888888-aaaa-bbbb-eeee-888888888890'), -- Database Audit -> HIPAA 164.312(a)(1)
('44444444-aaaa-bbbb-cccc-000000000401', '88888888-aaaa-bbbb-cccc-888888888888'), -- Data Encryption -> HIPAA 164.308(a)(1)

-- SOC 2 Mappings
('44444444-aaaa-bbbb-cccc-000000000701', '2287a396-092d-438e-a2f1-8fe15e348b40'), -- Security Policies -> SOC 2 CC6.1
('44444444-aaaa-bbbb-cccc-000000000701', 'e912e99e-e280-41e4-9afd-bd090519c3a1'), -- Security Policies -> SOC 2 CC7.1

-- FedRAMP Mappings
('44444444-aaaa-bbbb-cccc-000000000301', 'e2051746-3b9f-41c0-8dcc-4df1f2fe5780'), -- Database Audit -> FedRAMP AC-1
('44444444-aaaa-bbbb-cccc-000000000302', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'), -- Privileged Access -> FedRAMP AC-2
('44444444-aaaa-bbbb-cccc-000000000303', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'); -- MFA Implementation -> FedRAMP AC-2

-- -------------------------------
-- task_documents (linking documents to tasks)
-- -------------------------------
INSERT INTO task_documents (task_id, document_id) VALUES
-- Asset Management Tasks
('44444444-aaaa-bbbb-cccc-000000000101', '33333333-aaaa-bbbb-cccc-000000000001'), -- Asset Inventory System -> Asset Inventory Policy
('44444444-aaaa-bbbb-cccc-000000000101', '33333333-aaaa-bbbb-cccc-000000000011'), -- Asset Inventory System -> NIST CSF Guide

-- Monitoring Tasks
('44444444-aaaa-bbbb-cccc-000000000201', '33333333-aaaa-bbbb-cccc-000000000002'), -- API Health Check -> API Health Spec

-- Access Control Tasks
('44444444-aaaa-bbbb-cccc-000000000301', '33333333-aaaa-bbbb-cccc-000000000012'), -- Database User Audit -> Access Control Policy
('44444444-aaaa-bbbb-cccc-000000000302', '33333333-aaaa-bbbb-cccc-000000000012'), -- Privileged Access Review -> Access Control Policy
('44444444-aaaa-bbbb-cccc-000000000303', '33333333-aaaa-bbbb-cccc-000000000012'), -- MFA Implementation -> Access Control Policy

-- Data Protection Tasks
('44444444-aaaa-bbbb-cccc-000000000401', '33333333-aaaa-bbbb-cccc-000000000013'), -- Data Encryption Assessment -> Data Protection Policy
('44444444-aaaa-bbbb-cccc-000000000402', '33333333-aaaa-bbbb-cccc-000000000013'), -- Backup Encryption -> Data Protection Policy
('44444444-aaaa-bbbb-cccc-000000000403', '33333333-aaaa-bbbb-cccc-000000000013'), -- DLP Implementation -> Data Protection Policy

-- Network Security Tasks
('44444444-aaaa-bbbb-cccc-000000000501', '33333333-aaaa-bbbb-cccc-000000000014'), -- Firewall Rule Review -> Network Security Policy
('44444444-aaaa-bbbb-cccc-000000000502', '33333333-aaaa-bbbb-cccc-000000000014'), -- Network Segmentation -> Network Security Policy
('44444444-aaaa-bbbb-cccc-000000000503', '33333333-aaaa-bbbb-cccc-000000000014'), -- VPN Security Review -> Network Security Policy

-- Compliance Tasks
('44444444-aaaa-bbbb-cccc-000000000601', '33333333-aaaa-bbbb-cccc-000000000003'), -- GDPR Data Review -> GDPR Guide
('44444444-aaaa-bbbb-cccc-000000000602', '33333333-aaaa-bbbb-cccc-000000000007'), -- PCI Assessment -> PCI DSS Manual
('44444444-aaaa-bbbb-cccc-000000000603', '33333333-aaaa-bbbb-cccc-000000000008'), -- SOX Controls -> SOX Framework
('44444444-aaaa-bbbb-cccc-000000000604', '33333333-aaaa-bbbb-cccc-000000000009'), -- HIPAA Assessment -> HIPAA Guide

-- Policy Management Tasks
('44444444-aaaa-bbbb-cccc-000000000701', '33333333-aaaa-bbbb-cccc-000000000004'), -- Security Policies -> Info Security Policy
('44444444-aaaa-bbbb-cccc-000000000702', '33333333-aaaa-bbbb-cccc-000000000005'), -- Incident Response -> Incident Response Plan
('44444444-aaaa-bbbb-cccc-000000000703', '33333333-aaaa-bbbb-cccc-000000000006'), -- Business Continuity -> Business Continuity Plan

-- Cloud Security Tasks
('44444444-aaaa-bbbb-cccc-000000000801', '33333333-aaaa-bbbb-cccc-000000000015'), -- AWS Security Review -> Cloud Security Policy
('44444444-aaaa-bbbb-cccc-000000000802', '33333333-aaaa-bbbb-cccc-000000000015'), -- Cloud Access Control -> Cloud Security Policy
('44444444-aaaa-bbbb-cccc-000000000803', '33333333-aaaa-bbbb-cccc-000000000015'), -- Cloud Data Protection -> Cloud Security Policy

-- Application Security Tasks
('44444444-aaaa-bbbb-cccc-000000000901', '33333333-aaaa-bbbb-cccc-000000000016'), -- App Security Testing -> App Security Standards
('44444444-aaaa-bbbb-cccc-000000000902', '33333333-aaaa-bbbb-cccc-000000000016'), -- Code Security Review -> App Security Standards
('44444444-aaaa-bbbb-cccc-000000000903', '33333333-aaaa-bbbb-cccc-000000000016'), -- API Security Assessment -> App Security Standards

-- Training and Awareness Tasks
('44444444-aaaa-bbbb-cccc-000000001101', '33333333-aaaa-bbbb-cccc-000000000018'), -- Security Training -> Training Program
('44444444-aaaa-bbbb-cccc-000000001102', '33333333-aaaa-bbbb-cccc-000000000018'), -- Phishing Simulation -> Training Program

-- Third Party Risk Tasks
('44444444-aaaa-bbbb-cccc-000000001201', '33333333-aaaa-bbbb-cccc-000000000017'), -- Vendor Assessment -> Vendor Management Policy
('44444444-aaaa-bbbb-cccc-000000001202', '33333333-aaaa-bbbb-cccc-000000000017'); -- Vendor Contract Review -> Vendor Management Policy

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
