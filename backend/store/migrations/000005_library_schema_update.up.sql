-- Compliance Standards Table
CREATE TABLE IF NOT EXISTS compliance_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    description TEXT,
    version VARCHAR(50),
    issuing_body VARCHAR(255),
    official_link TEXT,
    effective_date DATE,
    expiry_date DATE,
    jurisdiction VARCHAR(100),
    industry VARCHAR(100),
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Requirements Table
CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID NOT NULL REFERENCES compliance_standards(id) ON DELETE CASCADE,
    control_id_reference VARCHAR(255) NOT NULL,
    requirement_text TEXT NOT NULL,
    version VARCHAR(50),
    effective_date DATE,
    expiry_date DATE,
    official_link TEXT,
    priority VARCHAR(50),
    status VARCHAR(50),
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    default_priority VARCHAR(50),
    description TEXT,
    high_level_check_type VARCHAR(50),
    check_type VARCHAR(100),
    target VARCHAR(255),
    parameters JSONB,
    evidence_types_expected JSONB,
    priority VARCHAR(50),
    status VARCHAR(50),
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task-Requirements Join Table
CREATE TABLE IF NOT EXISTS task_requirements (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, requirement_id)
); 


ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version VARCHAR(50);




ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_document_ids TEXT[];
alter table tasks drop column evidence_types_expected;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS evidence_types_expected TEXT[];


ALTER TABLE campaign_task_instances
ADD COLUMN IF NOT EXISTS priority VARCHAR(50);