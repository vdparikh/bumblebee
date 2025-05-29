# Bumblebee

![alt text](image.png)

**Start Database**
```sh
# Pull and start postgres container
docker pull postgres
docker run --name mypostgres -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres

# Exec into the container
docker exec -it mypostgres psql -U postgres

# Create Database Cryptkeeper
create database compliance;
\c compliance;
```
```sql
-- Connect to your PostgreSQL instance and then connect to the 'compliance' database:
-- psql -U postgres -h localhost
-- \c compliance;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For uuid_generate_v4()

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

-- Optional: Indexes for frequently queried columns
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_user_id);
CREATE INDEX idx_tasks_owner ON tasks(owner_user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_requirements_standard_id ON requirements(standard_id);
CREATE INDEX idx_evidence_task_id ON evidence(task_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_task_execution_results_task_id ON task_execution_results(task_id);

-- Function to update 'updated_at' column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update 'updated_at'
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



-- Table for Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Assuming you have a users table
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster querying by task_id
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);


-- Table for Task Evidence
CREATE TABLE IF NOT EXISTS task_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploader_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- User who uploaded
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL, -- Path on server or URL to cloud storage
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster querying by task_id
CREATE INDEX IF NOT EXISTS idx_task_evidence_task_id ON task_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_task_evidence_uploader_user_id ON task_evidence(uploader_user_id);



-- Campaigns Table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    standard_id UUID REFERENCES compliance_standards(id) ON DELETE SET NULL, -- Or RESTRICT if a standard must always exist
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- e.g., Draft, Active, In Progress, Completed, Archived
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for Requirements selected for a Campaign
-- This stores which master requirements are part of this campaign scope.
CREATE TABLE campaign_selected_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Own ID for easier reference by campaign_task_instances
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    is_applicable BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_campaign_requirement UNIQUE (campaign_id, requirement_id)
);

-- Campaign Task Instances Table
-- These are the actual, actionable tasks for a specific campaign.
-- They are derived from master tasks but have their own lifecycle within the campaign.
CREATE TABLE campaign_task_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    master_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Link to the "template" task in the main tasks table
    campaign_selected_requirement_id UUID REFERENCES campaign_selected_requirements(id) ON DELETE SET NULL, -- Links to the specific requirement scoped for this campaign
    title VARCHAR(255) NOT NULL, -- Can be inherited from master_task_id or overridden
    description TEXT,             -- Can be inherited or overridden
    category VARCHAR(100),        -- Can be inherited or overridden
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,    -- Specific owner for this campaign task
    assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Specific assignee for this campaign task
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- Status within the campaign
    due_date TIMESTAMPTZ NULL,                  -- Due date within the campaign
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Fields for automated checks, potentially inherited or overridden from master_task_id
    check_type VARCHAR(255) NULL,
    target VARCHAR(255) NULL,
    parameters JSONB NULL
);

-- Modify existing task_comments table to link to campaign_task_instances
-- We'll add a new column and make the old task_id nullable.
-- A check constraint ensures a comment belongs to one or the other.
ALTER TABLE task_comments
    ADD COLUMN campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    ALTER COLUMN task_id DROP NOT NULL, 
    ADD CONSTRAINT chk_comment_target CHECK (
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR 
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL)
    );
-- Note: You'll need a data migration strategy if you want old comments linked to master tasks
-- to be somehow associated with new campaign task instances, or decide they remain separate.
-- For new comments related to campaigns, they MUST use campaign_task_instance_id.

-- Modify existing task_evidence table similarly
ALTER TABLE task_evidence
    ADD COLUMN campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    ALTER COLUMN task_id DROP NOT NULL,
    ADD CONSTRAINT chk_evidence_target CHECK (
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR 
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL)
    );

-- Modify existing task_execution_results table similarly
ALTER TABLE task_execution_results
    ADD COLUMN campaign_task_instance_id UUID REFERENCES campaign_task_instances(id) ON DELETE CASCADE,
    ALTER COLUMN task_id DROP NOT NULL,
    ADD CONSTRAINT chk_result_target CHECK (
        (task_id IS NOT NULL AND campaign_task_instance_id IS NULL) OR 
        (task_id IS NULL AND campaign_task_instance_id IS NOT NULL)
    );

-- Function and Triggers to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    ON DELETE CASCADE; -- Or ON DELETE SET NULL, depending on desired behavior

```


TODO
- Only add tasks to the user when the campaign goes into active state.
- Why is overdue tasks not showing?
- 