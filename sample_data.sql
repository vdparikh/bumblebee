-- Sample Data for Compliance Automation

-- Clear existing data to prevent duplicate key errors and ensure idempotency
DELETE FROM task_documents;
DELETE FROM task_requirements;
DELETE FROM tasks;
DELETE FROM requirements;
DELETE FROM compliance_standards;
DELETE FROM connected_systems;
DELETE FROM documents;

-- -------------------------------
-- compliance_standards
-- -------------------------------
INSERT INTO compliance_standards (
    id, name, short_name, description, version, issuing_body, official_link, effective_date, expiry_date, jurisdiction, industry, tags, created_at, updated_at
) VALUES
('f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS Critical Security Controls v8', 'CIS v8', 'A prioritized set of safeguards to mitigate the most prevalent cyber-attacks against systems and networks.', '8.0', 'Center for Internet Security', 'https://www.cisecurity.org/controls/v8', '2021-05-18', NULL, 'Global', 'All Industries', '["cybersecurity","best practices"]', NOW(), NOW()),
('c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'General Data Protection Regulation', 'GDPR', 'A regulation in EU law on data protection and privacy for all individuals within the European Union and the European Economic Area.', '2016/679', 'European Union', 'https://gdpr.eu/', '2018-05-25', NULL, 'EU', 'Financial Services', '["privacy","data protection"]', NOW(), NOW());

-- -------------------------------
-- requirements
-- -------------------------------
INSERT INTO requirements (
    id, standard_id, control_id_reference, requirement_text, version, effective_date, expiry_date, official_link, priority, status, tags, created_at, updated_at
) VALUES
('11111111-aaaa-bbbb-cccc-000000000001', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.1', 'Establish and Maintain Detailed Enterprise Asset Inventory.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'High', 'Active', '["asset management"]', NOW(), NOW()),
('11111111-aaaa-bbbb-cccc-000000000002', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.2', 'Address Unauthorized Assets.', '8.0', '2021-05-18', NULL, 'https://www.cisecurity.org/controls/v8', 'Medium', 'Active', '["asset management","unauthorized assets"]', NOW(), NOW()),
('33333333-aaaa-bbbb-cccc-333333333333', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 5(1)(f)', 'Personal data shall be processed in a manner that ensures appropriate security of the personal data.', '2016/679', '2018-05-25', NULL, 'https://gdpr.eu/article-5-how-to-process-personal-data/', 'Critical', 'Active', '["privacy","security"]', NOW(), NOW());

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
    id, title, description, category, version, created_at, updated_at, check_type, target, parameters, evidence_types_expected, default_priority
) VALUES
('44444444-aaaa-bbbb-cccc-000000000101', 'Implement Asset Inventory System', 'Deploy and configure a centralized asset inventory system.', 'Asset Management', '1.0', NOW(), NOW(), NULL, NULL, '{}', '{"System Design Document","Deployment Confirmation Screenshot","Inventory Report Sample"}', 'High'),
('44444444-aaaa-bbbb-cccc-000000000102', 'API Health Check', 'Automated health check for main API.', 'Monitoring', '1.1', NOW(), NOW(), 'http_get_check', '22222222-aaaa-bbbb-cccc-000000000001', '{"apiPath": "/health", "expected_status_code": 200}', '{"API Health Report"}', 'Medium'),
('44444444-aaaa-bbbb-cccc-000000000103', 'Database User Audit', 'Audit database users and permissions.', 'Audit', '1.0', NOW(), NOW(), 'database_query_check', '22222222-aaaa-bbbb-cccc-000000000002', '{"query": "SELECT * FROM pg_user;"}', '{"Audit Report"}', 'High'),
('44444444-aaaa-bbbb-cccc-000000000104', 'GDPR Data Review', 'Review data handling for GDPR compliance.', 'Compliance', '2.0', NOW(), NOW(), NULL, NULL, '{}', '{"GDPR Compliance Report"}', 'Critical');

-- -------------------------------
-- task_requirements
-- -------------------------------
INSERT INTO task_requirements (task_id, requirement_id) VALUES
('44444444-aaaa-bbbb-cccc-000000000101', '11111111-aaaa-bbbb-cccc-000000000001'),
('44444444-aaaa-bbbb-cccc-000000000102', '11111111-aaaa-bbbb-cccc-000000000002'),
('44444444-aaaa-bbbb-cccc-000000000103', '11111111-aaaa-bbbb-cccc-000000000002'),
('44444444-aaaa-bbbb-cccc-000000000104', '33333333-aaaa-bbbb-cccc-333333333333');

-- -------------------------------
-- task_documents (linking documents to tasks)
-- -------------------------------
INSERT INTO task_documents (task_id, document_id) VALUES
('44444444-aaaa-bbbb-cccc-000000000101', '33333333-aaaa-bbbb-cccc-000000000001'),
('44444444-aaaa-bbbb-cccc-000000000102', '33333333-aaaa-bbbb-cccc-000000000002'),
('44444444-aaaa-bbbb-cccc-000000000104', '33333333-aaaa-bbbb-cccc-000000000003');

-- Note: User data (owner_user_id, assignee_user_id) is not included here as it's managed in campaign_task_instances.
-- Status and due_date are also managed at the campaign_task_instance level.
