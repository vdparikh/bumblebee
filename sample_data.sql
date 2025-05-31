-- Sample Data for Compliance Automation

-- Clear existing data to prevent duplicate key errors and ensure idempotency
-- Order matters due to foreign key constraints
DELETE FROM tasks;
DELETE FROM requirements;
DELETE FROM compliance_standards;
-- Add DELETE FROM statements for other tables like users, campaigns, etc., if you populate them here.

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
('11111111-aaaa-bbbb-cccc-000000000001', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.1', 'Establish and Maintain Detailed Enterprise Asset Inventory. Actively manage (inventory, track, and correct) all enterprise assets connected to the infrastructure physically, virtually, remotely, and those within cloud environments, to accurately know the totality of assets that need to be monitored and protected.'),
('11111111-aaaa-bbbb-cccc-000000000002', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 1.2', 'Address Unauthorized Assets. Ensure that a process exists to address unauthorized assets on a weekly basis. The enterprise must either remove the asset from the network, deny the asset network access, or quarantine the asset.'),
('11111111-aaaa-bbbb-cccc-000000000003', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 2.1', 'Establish and Maintain a Software Inventory. Actively manage (inventory, track, and correct) all software (operating systems and applications) on the network so that only authorized software is installed and can execute, and that all unauthorized and unmanaged software is found and prevented from installation or execution.'),
('11111111-aaaa-bbbb-cccc-000000000004', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 2.2', 'Ensure Software is Supported by Vendor. Ensure that only currently supported software is designated as authorized in the software inventory for enterprise assets. If software is unsupported, yet required for a business purpose, document an exception and implement mitigating controls.'),
('11111111-aaaa-bbbb-cccc-000000000005', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 3.1', 'Establish and Maintain a Data Management Process. Establish and maintain a data management process. In this process, address data sensitivity, data owner, data handling requirements, data retention limits, and disposal requirements, based on sensitivity and retention limits.'),
('11111111-aaaa-bbbb-cccc-000000000006', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 3.5', 'Protect Data-at-Rest. Protect data-at-rest. For sensitive data stored on enterprise assets, this includes encryption, integrity protection, and data loss prevention techniques.'),
('11111111-aaaa-bbbb-cccc-000000000007', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 4.1', 'Establish and Maintain a Secure Configuration Process. Establish and maintain a secure configuration process for enterprise assets and software.'),
('11111111-aaaa-bbbb-cccc-000000000008', 'f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'CIS 4.2', 'Establish and Maintain a Secure Configuration Process for Network Devices. Establish and maintain a secure configuration process for network devices.'),
('33333333-aaaa-bbbb-cccc-333333333333', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 5(1)(f)', 'Personal data shall be processed in a manner that ensures appropriate security of the personal data, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, using appropriate technical or organisational measures (‘integrity and confidentiality’).'),
('44444444-aaaa-bbbb-cccc-444444444444', 'c5b4a3f2-e1d0-c9b8-a7f6-e5d4c3b2a1f0', 'GDPR Art. 32', 'Security of processing. Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.');

-- -------------------------------
-- tasks
-- These are master task templates. Owner, Assignee, Status, DueDate are managed in campaign_task_instances.
-- -------------------------------
INSERT INTO tasks (requirement_id, title, description, category, created_at, updated_at, check_type, target, parameters, evidence_types_expected, default_priority) VALUES
(
    '11111111-aaaa-bbbb-cccc-000000000001', -- CIS 1.1
    'Implement Asset Inventory System', -- title
    'Deploy and configure a centralized asset inventory system to track all enterprise hardware and software assets.', -- description
    'Asset Management', -- category
    NOW(), -- created_at
    NOW(), -- updated_at
    NULL, -- check_type (manual task)
    NULL, -- target
    '{}', -- parameters (empty for manual)
    '{"System Design Document", "Deployment Confirmation Screenshot", "Inventory Report Sample"}', -- evidence_types_expected
    'High' -- default_priority
),
(
    '11111111-aaaa-bbbb-cccc-000000000001', -- CIS 1.1
    'Verify Asset Inventory Accuracy',
    'Conduct a quarterly audit to verify the accuracy and completeness of the asset inventory system against physical checks and network scans.',
    'Asset Management',
    NOW(), NOW(),
    'manual_audit',
    'All Network Segments',
    '{"audit_checklist_template": "Q1_asset_audit.xlsx", "sampling_method": "random_10_percent"}',
    '{"Audit Report", "Discrepancy Log", "Remediation Plan"}',
    'Medium'
),
(
    '11111111-aaaa-bbbb-cccc-000000000002', -- CIS 1.2
    'Establish Unauthorized Asset Detection Process',
    'Define and document a process for detecting and addressing unauthorized assets found on the network, including weekly network scans and NAC integration.',
    'Asset Management',
    NOW(), NOW(),
    NULL, NULL, '{}',
    '{"Process Document", "Network Scan Configuration", "NAC Policy Screenshot"}',
    'High'
),
(
    '11111111-aaaa-bbbb-cccc-000000000002', -- CIS 1.2
    'Weekly Unauthorized Asset Review Meeting',
    'Conduct a weekly meeting with IT and Security teams to review unauthorized asset reports and assign remediation actions.',
    'Asset Management',
    NOW(), NOW(),
    NULL, NULL, '{}',
    '{"Meeting Minutes", "Action Item Tracker"}',
    'Medium'
),
(
    '11111111-aaaa-bbbb-cccc-000000000003', -- CIS 2.1
    'Deploy Software Inventory Tool',
    'Implement a software inventory tool across all enterprise assets to track installed applications and versions.',
    'Software Management',
    NOW(), NOW(),
    NULL, NULL, '{}',
    '{"Tool Deployment Plan", "Agent Installation Report", "Sample Software Inventory Report"}',
    'High'
),
(
    '11111111-aaaa-bbbb-cccc-000000000004', -- CIS 2.2
    'Review and Update Authorized Software List',
    'Quarterly review and update the list of authorized software, ensuring all listed software is currently supported by vendors. Document exceptions for unsupported but required software.',
    'Software Management',
    NOW(), NOW(),
    NULL, NULL, '{}',
    '{"Updated Authorized Software List", "Exception Approval Forms"}',
    'Medium'
),
(
    '11111111-aaaa-bbbb-cccc-000000000005', -- CIS 3.1
    'Develop Data Classification Policy',
    'Create and approve a data classification policy that defines sensitivity levels, data owners, handling procedures, retention, and disposal requirements.',
    'Data Management',
    NOW(), NOW(),
    NULL, NULL, '{}',
    '{"Data Classification Policy Document", "Approval Sign-off"}',
    'Critical'
),
(
    '11111111-aaaa-bbbb-cccc-000000000006', -- CIS 3.5
    'Implement Full Disk Encryption on Laptops',
    'Ensure all company-issued laptops are configured with full disk encryption using an approved solution.',
    'Data Security',
    NOW(), NOW(),
    'configuration_check',
    'All Laptops',
    '{"encryption_tool": "BitLocker/FileVault", "policy_link": "doc/encryption_policy.pdf"}',
    '{"Encryption Policy Document", "Configuration Screenshots", "Compliance Report from MDM"}',
    'High'
),
(
    '11111111-aaaa-bbbb-cccc-000000000007', -- CIS 4.1
    'Develop Server Hardening Guidelines', -- title
    'Create and document server hardening guidelines based on CIS benchmarks for Windows and Linux servers.', -- description
    'Configuration Management', -- category
    NOW(), -- created_at
    NOW(), -- updated_at
    NULL, -- check_type
    NULL, -- target
    '{}', -- parameters
    '{"Server Hardening Policy", "CIS Benchmark Checklist for Windows", "CIS Benchmark Checklist for Linux"}',
    'Critical'
),
(
    '11111111-aaaa-bbbb-cccc-000000000008', -- CIS 4.2
    'Audit Network Device Configurations',
    'Perform a quarterly audit of network device (routers, switches, firewalls) configurations against established secure baselines.',
    'Configuration Management',
    NOW(), NOW(),
    'config_audit_script',
    'core-routers, edge-firewalls',
    '{"baseline_config_path": "/configs/secure_baseline_v1.2.txt", "audit_script_version": "2.1"}',
    '{"Audit Report", "List of Non-Compliant Devices", "Remediation Tickets"}',
    'High'
),
(
    '33333333-aaaa-bbbb-cccc-333333333333', -- requirement_id (GDPR Art. 5(1)(f))
    'Review Data Encryption Policies', -- title
    'Review and update policies for encryption of personal data at rest and in transit. Ensure all PII databases are encrypted.', -- description
    'Data Security', -- category
    NOW(), -- created_at
    NOW(), -- updated_at
    NULL, -- check_type
    NULL, -- target
    '{}', -- parameters
    '{"Updated Encryption Policy", "Database Encryption Verification Report"}',
    'Critical'
),
(
    '44444444-aaaa-bbbb-cccc-444444444444', -- requirement_id (GDPR Art. 32)
    'Automated Vulnerability Scan of PII Systems', -- title
    'Perform a weekly automated vulnerability scan on all systems processing PII.', -- description
    'Vulnerability Management', -- category
    NOW(), -- created_at
    NOW(), -- updated_at
    'nessus_scan', -- check_type
    '10.0.0.0/24,pii-db.internal.corp', -- target
    '{"policy_name": "GDPR Compliance Scan", "frequency": "weekly", "notify_email": "soc@example.com"}', -- parameters (JSONB)
    '{"Scan Configuration Screenshot", "Weekly Scan Report", "Critical Vulnerability Remediation Evidence"}',
    'High'
);

-- Note: User data (owner_user_id, assignee_user_id) is not included here as it's managed in campaign_task_instances.
-- Status and due_date are also managed at the campaign_task_instance level.
