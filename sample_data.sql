-- Sample Data for Compliance Automation

-- -------------------------------
-- compliance_standards
-- -------------------------------
INSERT INTO compliance_standards (id, name, short_name, description) VALUES
('f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS Critical Security Controls v8', 'CIS v8', 'A prioritized set of safeguards to mitigate the most prevalent cyber-attacks against systems and networks.'),
('c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'General Data Protection Regulation', 'GDPR', 'A regulation in EU law on data protection and privacy for all individuals within the European Union and the European Economic Area.');

-- -------------------------------
-- requirements
-- -------------------------------
INSERT INTO requirements (id, standard_id, control_id_reference, requirement_text) VALUES
('11111111-aaaa-bbbb-cccc-111111111111', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.1', 'Establish and Maintain Detailed Enterprise Asset Inventory. Actively manage (inventory, track, and correct) all enterprise assets (end-user devices, including portable and mobile; network devices; non-computing/IoT devices; and servers) connected to the infrastructure physically, virtually, remotely, and those within cloud environments, to accurately know the totality of assets that need to be monitored and protected within the enterprise.'),
('22222222-aaaa-bbbb-cccc-222222222222', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 4.1', 'Establish and Maintain a Secure Configuration Process. Establish and maintain a secure configuration process for enterprise assets (end-user devices, including portable and mobile; network devices; non-computing/IoT devices; and servers) and software (operating systems and applications).'),
('33333333-aaaa-bbbb-cccc-333333333333', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 5(1)(f)', 'Personal data shall be processed in a manner that ensures appropriate security of the personal data, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, using appropriate technical or organisational measures (‘integrity and confidentiality’).'),
('44444444-aaaa-bbbb-cccc-444444444444', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 32', 'Security of processing. Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.');

-- -------------------------------
-- tasks
-- (Assuming tasks are master tasks not yet part of a campaign instance)
-- -------------------------------
INSERT INTO tasks (requirement_id, title, description, category, owner_user_id, assignee_user_id, status, due_date, created_at, updated_at, check_type, target, parameters) VALUES
(
    '11111111-aaaa-bbbb-cccc-111111111111', -- requirement_id (CIS 1.1)
    'Implement Asset Inventory System', -- title
    'Deploy and configure a centralized asset inventory system to track all enterprise hardware and software assets.', -- description
    'Asset Management', -- category
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- owner_user_id
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- assignee_user_id
    'Open', -- status
    '2024-08-31', -- due_date
    NOW(), -- created_at
    NOW(), -- updated_at
    NULL, -- check_type (manual task)
    NULL, -- target
    '{}' -- parameters (empty for manual)
),
(
    '22222222-aaaa-bbbb-cccc-222222222222', -- requirement_id (CIS 4.1)
    'Develop Server Hardening Guidelines', -- title
    'Create and document server hardening guidelines based on CIS benchmarks for Windows and Linux servers.', -- description
    'Configuration Management', -- category
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- owner_user_id
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- assignee_user_id
    'In Progress', -- status
    '2024-07-15', -- due_date
    NOW(), -- created_at
    NOW(), -- updated_at
    NULL, -- check_type
    NULL, -- target
    '{}' -- parameters
),
(
    '33333333-aaaa-bbbb-cccc-333333333333', -- requirement_id (GDPR Art. 5(1)(f))
    'Review Data Encryption Policies', -- title
    'Review and update policies for encryption of personal data at rest and in transit. Ensure all PII databases are encrypted.', -- description
    'Data Security', -- category
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- owner_user_id
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- assignee_user_id
    'Pending Review', -- status
    '2024-06-30', -- due_date
    NOW(), -- created_at
    NOW(), -- updated_at
    NULL, -- check_type
    NULL, -- target
    '{}' -- parameters
),
(
    '44444444-aaaa-bbbb-cccc-444444444444', -- requirement_id (GDPR Art. 32)
    'Automated Vulnerability Scan of PII Systems', -- title
    'Perform a weekly automated vulnerability scan on all systems processing PII.', -- description
    'Vulnerability Management', -- category
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- owner_user_id
    'c8aae66e-976f-4c12-a62f-f590d4a741de', -- assignee_user_id
    'Open', -- status
    '2024-09-15', -- due_date
    NOW(), -- created_at
    NOW(), -- updated_at
    'nessus_scan', -- check_type
    '10.0.0.0/24,pii-db.internal.corp', -- target
    '{"policy_name": "GDPR Compliance Scan", "frequency": "weekly", "notify_email": "soc@example.com"}' -- parameters (JSONB)
);
