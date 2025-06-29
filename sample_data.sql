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

-- Insert system type definitions
INSERT INTO system_type_definitions (value, label, description, icon_name, color, category, configuration_schema) VALUES
('aws', 'AWS', 'Amazon Web Services Cloud Platform', 'FaAws', '#FF9900', 'Cloud', '[
    {"name":"accessKeyId","label":"Access Key ID","type":"text","placeholder":"AKIAIOSFODNN7EXAMPLE","required":true,"sensitive":true,"options":null,"helpText":"AWS Access Key ID for authentication."},
    {"name":"secretAccessKey","label":"Secret Access Key","type":"password","placeholder":"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY","required":true,"sensitive":true,"options":null,"helpText":"AWS Secret Access Key for authentication."},
    {"name":"region","label":"AWS Region","type":"select","placeholder":"us-east-1","required":true,"sensitive":false,"options":["us-east-1","us-east-2","us-west-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","ap-southeast-2"],"helpText":"AWS region where resources are located."}
]'::jsonb),
('azure', 'Azure', 'Microsoft Azure Cloud Platform', 'FaMicrosoft', '#0078D4', 'Cloud', '[
    {"name":"tenantId","label":"Tenant ID","type":"text","placeholder":"12345678-1234-1234-1234-123456789012","required":true,"sensitive":false,"options":null,"helpText":"Azure Active Directory Tenant ID."},
    {"name":"clientId","label":"Client ID","type":"text","placeholder":"12345678-1234-1234-1234-123456789012","required":true,"sensitive":false,"options":null,"helpText":"Azure Application (Service Principal) Client ID."},
    {"name":"clientSecret","label":"Client Secret","type":"password","placeholder":"your-client-secret","required":true,"sensitive":true,"options":null,"helpText":"Azure Application (Service Principal) Client Secret."},
    {"name":"subscriptionId","label":"Subscription ID","type":"text","placeholder":"12345678-1234-1234-1234-123456789012","required":true,"sensitive":false,"options":null,"helpText":"Azure Subscription ID."}
]'::jsonb),
('gcp', 'Google Cloud Platform', 'Google Cloud Platform', 'FaGoogle', '#4285F4', 'Cloud', '[
    {"name":"projectId","label":"Project ID","type":"text","placeholder":"my-gcp-project","required":true,"sensitive":false,"options":null,"helpText":"Google Cloud Project ID."},
    {"name":"serviceAccountKey","label":"Service Account Key (JSON)","type":"textarea","placeholder":"{\"type\": \"service_account\", ...}","required":true,"sensitive":true,"options":null,"helpText":"Service account key JSON content for authentication."}
]'::jsonb),
('http', 'HTTP/API', 'HTTP API or Web Service', 'FaGlobe', '#4CAF50', 'API', '[
    {"name":"baseUrl","label":"Base URL","type":"url","placeholder":"https://api.example.com","required":true,"sensitive":false,"options":null,"helpText":"Base URL for the HTTP API or web service."},
    {"name":"apiKey","label":"API Key (Optional)","type":"password","placeholder":"your-api-key","required":false,"sensitive":true,"options":null,"helpText":"API key for authentication (if required)."},
    {"name":"username","label":"Username (Optional)","type":"text","placeholder":"username","required":false,"sensitive":false,"options":null,"helpText":"Username for basic authentication (if required)."},
    {"name":"password","label":"Password (Optional)","type":"password","placeholder":"password","required":false,"sensitive":true,"options":null,"helpText":"Password for basic authentication (if required)."}
]'::jsonb),
('database', 'Database', 'Database Connection', 'FaDatabase', '#FF5722', 'Database', '[
    {"name":"host","label":"Host","type":"text","placeholder":"localhost","required":true,"sensitive":false,"options":null,"helpText":"Database host address."},
    {"name":"port","label":"Port","type":"number","placeholder":"5432","required":true,"sensitive":false,"options":null,"helpText":"Database port number."},
    {"name":"database","label":"Database Name","type":"text","placeholder":"mydb","required":true,"sensitive":false,"options":null,"helpText":"Database name to connect to."},
    {"name":"username","label":"Username","type":"text","placeholder":"dbuser","required":true,"sensitive":false,"options":null,"helpText":"Database username."},
    {"name":"password","label":"Password","type":"password","placeholder":"dbpassword","required":true,"sensitive":true,"options":null,"helpText":"Database password."},
    {"name":"sslMode","label":"SSL Mode","type":"select","placeholder":"require","required":false,"sensitive":false,"options":["disable","require","verify-ca","verify-full"],"helpText":"SSL mode for database connection."}
]'::jsonb),
('n8n', 'n8n', 'Workflow Automation Platform', 'FaCogs', '#FF6B6B', 'Automation', '[
    {"name":"baseUrl","label":"n8n Base URL","type":"url","placeholder":"http://localhost:5678","required":true,"sensitive":false,"options":null,"helpText":"The URL where your n8n instance is running."},
    {"name":"apiKey","label":"API Key (Optional)","type":"password","placeholder":"your-n8n-api-key","required":false,"sensitive":true,"options":null,"helpText":"API key for authentication (if enabled in n8n)."}
]'::jsonb),
('temporal', 'Temporal', 'Temporal Workflow Platform', 'FaClock', '#6366F1', 'Automation', '[
    {"name":"serverUrl","label":"Temporal Server URL","type":"url","placeholder":"http://localhost:8080","required":true,"sensitive":false,"options":null,"helpText":"The URL where your Temporal REST API is running (typically port 8080, not 7233)."},
    {"name":"namespace","label":"Namespace","type":"text","placeholder":"default","required":true,"sensitive":false,"options":null,"helpText":"Temporal namespace for workflow execution."}
]'::jsonb)
ON CONFLICT (value) DO NOTHING;
