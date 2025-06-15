import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Accordion, Alert } from 'react-bootstrap';
import {
    FaTasks, FaAlignLeft, FaTag, FaExclamationCircle, FaEdit, FaPlusCircle,
    FaWindowClose, FaFileContract, FaCogs, FaBookOpen, FaCalendarAlt, FaLink, FaExclamationTriangle, FaCheckCircle, FaTerminal, FaFileUpload, FaUserShield
} from 'react-icons/fa';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

// This configuration should ideally be passed as a prop or imported from a shared utility
const checkTypeConfigurations = {
    'http_get_check': {
        label: 'HTTP GET Check',
        parameters: [
            { name: 'apiPath', label: 'API Path', type: 'text', required: true, placeholder: '/health or /api/v1/status', helpText: 'The specific path to append to the base URL of the target system (e.g., /api/status).' },
            { name: 'expected_status_code', label: 'Expected Status Code', type: 'number', placeholder: '200', helpText: 'The HTTP status code expected for a successful check. Defaults to 200 if not specified.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Target Connected System'
    },
    'script_run_check': {
        label: 'Script Run Check',
        parameters: [
            { name: 'script_path', label: 'Script Path on Target Host', type: 'text', required: true, placeholder: '/opt/scripts/check.sh', helpText: 'Absolute path to the script on the selected execution host.' },
            { name: 'script_args', label: 'Script Arguments (JSON Array)', type: 'textarea', placeholder: 'e.g., ["arg1", "value for arg2"]', helpText: 'Optional. Arguments to pass to the script, as a JSON array of strings.' },
            { name: 'expected_exit_code', label: 'Expected Exit Code', type: 'number', placeholder: '0', helpText: 'Optional. The exit code expected for a successful script run. Defaults to 0.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Execution Host (e.g., Local Server)',
        targetHelpText: 'Select the Connected System representing the host where the script will run (e.g., the local backend server).'
    },
    'database_query_check': {
        label: 'Database Query Check',
        parameters: [
            { name: 'query', label: 'SQL Query', type: 'textarea', required: true, placeholder: 'SELECT * FROM users WHERE status = \'active\'', helpText: 'The SQL query to execute. Should return results that can be validated.' },
            { name: 'expected_rows', label: 'Expected Number of Rows', type: 'number', placeholder: '1', helpText: 'Optional. Expected number of rows in the result set.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Target Database',
        targetHelpText: 'Select the Connected System representing the database to query.'
    },
    'aws_security_group_check': {
        label: 'AWS Security Group Check',
        parameters: [
            { name: 'security_group_id', label: 'Security Group ID', type: 'text', required: true, placeholder: 'sg-1234567890abcdef0', helpText: 'The ID of the security group to check.' },
            { name: 'expected_rules', label: 'Expected Rules (JSON)', type: 'textarea', placeholder: '[{"protocol": "tcp", "from_port": 22, "to_port": 22, "cidr": "10.0.0.0/16"}]', helpText: 'JSON array of expected security group rules.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'AWS Account',
        targetHelpText: 'Select the Connected System representing the AWS account.'
    },
    'azure_policy_check': {
        label: 'Azure Policy Check',
        parameters: [
            { name: 'policy_definition_id', label: 'Policy Definition ID', type: 'text', required: true, placeholder: '/subscriptions/{subId}/providers/Microsoft.Authorization/policyDefinitions/{policyDefName}', helpText: 'The ID of the policy definition to check.' },
            { name: 'scope', label: 'Scope', type: 'text', required: true, placeholder: '/subscriptions/{subId}/resourceGroups/{rgName}', helpText: 'The scope at which to check the policy.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Azure Subscription',
        targetHelpText: 'Select the Connected System representing the Azure subscription.'
    },
    'github_repo_check': {
        label: 'GitHub Repository Check',
        parameters: [
            { name: 'repository', label: 'Repository Name', type: 'text', required: true, placeholder: 'owner/repo', helpText: 'The repository to check in format owner/repo.' },
            { name: 'branch', label: 'Branch Name', type: 'text', required: true, placeholder: 'main', helpText: 'The branch to check.' },
            { name: 'check_type', label: 'Check Type', type: 'select', options: ['branch_protection', 'security_alerts', 'dependencies'], required: true, helpText: 'The type of check to perform.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'GitHub Account',
        targetHelpText: 'Select the Connected System representing the GitHub account.'
    },
    'nessus_scan_check': {
        label: 'Nessus Scan Check',
        parameters: [
            { name: 'scan_id', label: 'Scan ID', type: 'text', required: true, placeholder: '12345', helpText: 'The ID of the scan to check.' },
            { name: 'max_critical', label: 'Maximum Critical Issues', type: 'number', placeholder: '0', helpText: 'Maximum number of critical issues allowed.' },
            { name: 'max_high', label: 'Maximum High Issues', type: 'number', placeholder: '5', helpText: 'Maximum number of high issues allowed.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Nessus Scanner',
        targetHelpText: 'Select the Connected System representing the Nessus scanner.'
    },
    'file_permission_check': {
        label: 'File Permission Check',
        parameters: [
            { name: 'file_path', label: 'File Path', type: 'text', required: true, placeholder: '/etc/passwd', helpText: 'The path to the file to check.' },
            { name: 'expected_permissions', label: 'Expected Permissions', type: 'text', required: true, placeholder: '644', helpText: 'The expected file permissions in octal format.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Target System',
        targetHelpText: 'Select the Connected System representing the system where the file exists.'
    },
    'ssl_certificate_check': {
        label: 'SSL Certificate Check',
        parameters: [
            { name: 'hostname', label: 'Hostname', type: 'text', required: true, placeholder: 'example.com', helpText: 'The hostname to check SSL certificate for.' },
            { name: 'port', label: 'Port', type: 'number', required: true, placeholder: '443', helpText: 'The port to check SSL certificate on.' },
            { name: 'min_days_valid', label: 'Minimum Days Valid', type: 'number', placeholder: '30', helpText: 'Minimum number of days the certificate should be valid for.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Target System',
        targetHelpText: 'Select the Connected System representing the system to check SSL certificate on.'
    },
    'system_config_check': {
        label: 'System Configuration Check',
        parameters: [
            { name: 'config_path', label: 'Configuration Path', type: 'text', required: true, placeholder: '/etc/ssh/sshd_config', helpText: 'Path to the configuration file to check.' },
            { name: 'expected_settings', label: 'Expected Settings (JSON)', type: 'textarea', required: true, placeholder: '{"PermitRootLogin": "no", "PasswordAuthentication": "no"}', helpText: 'JSON object of expected configuration settings.' }
        ],
        targetType: 'connected_system',
        targetLabel: 'Target System',
        targetHelpText: 'Select the Connected System representing the system to check configuration on.'
    }
};

const evidenceTypeOptions = [
    { value: 'screenshot', label: 'Screenshot' },
    { value: 'log_file', label: 'Log File' },
    { value: 'configuration_snippet', label: 'Configuration Snippet' },
    { value: 'policy_document', label: 'Policy Document' },
    { value: 'interview_notes', label: 'Interview Notes' },
];

const taskCategories = [
    "Asset Management", "Configuration Management", "Data Security",
    "Vulnerability Management", "Audit", "Policy", "Other"
];

function TaskForm({ initialData, onSubmit, onCancel, mode, requirements, users, connectedSystems, documents, parentId }) {
    // Multi-select for requirements
    const [requirementIds, setRequirementIds] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [version, setVersion] = useState('');
    const [category, setCategory] = useState('Other');
    const [defaultPriority, setDefaultPriority] = useState('medium');
    const [status, setStatus] = useState('active');
    const [tags, setTags] = useState([]);
    const [highLevelCheckType, setHighLevelCheckType] = useState('automated');
    const [checkType, setCheckType] = useState('automated');
    const [target, setTarget] = useState('');
    const [parameters, setParameters] = useState({});
    const [evidenceTypesExpected, setEvidenceTypesExpected] = useState([]);
    const [linkedDocumentIDs, setLinkedDocumentIDs] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setRequirementIds(
                initialData.requirementIds
                    ? initialData.requirementIds.map(id => {
                        const req = requirements.find(r => r.id === id);
                        let label = req?.name || req?.requirementText || req?.description || req?.requirement_id || id;
                        return req ? { value: id, label } : { value: id, label: id };
                    })
                    : []
            );
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setVersion(initialData.version || '');
            setCategory(initialData.category || 'Other');
            setDefaultPriority(initialData.defaultPriority || 'medium');
            setStatus(initialData.status || 'active');
            setTags(initialData.tags || []);
            setHighLevelCheckType(initialData.highLevelCheckType || initialData.high_level_check_type || 'automated');
            setCheckType(initialData.checkType || initialData.check_type || 'automated');
            setTarget(initialData.target || '');
            setParameters(initialData.parameters || {});
            setEvidenceTypesExpected(
                initialData.evidenceTypesExpected
                    ? initialData.evidenceTypesExpected.map(et => evidenceTypeOptions.find(opt => opt.value === et) || { value: et, label: et })
                    : []
            );
            if (Array.isArray(initialData.linkedDocumentIDs) && initialData.linkedDocumentIDs.length > 0) {
                setLinkedDocumentIDs(initialData.linkedDocumentIDs.map(id => {
                    const doc = (documents || []).find(d => d.id === id);
                    return doc ? { value: id, label: doc.name } : { value: id, label: id };
                }));
            } else if (Array.isArray(initialData.linked_documents) && initialData.linked_documents.length > 0) {
                setLinkedDocumentIDs(initialData.linked_documents.map(doc => ({ value: doc.id, label: doc.name })));
            } else {
                setLinkedDocumentIDs([]);
            }
        } else {
            setRequirementIds([]);
            setTitle('');
            setDescription('');
            setVersion('');
            setCategory('Other');
            setDefaultPriority('medium');
            setStatus('active');
            setTags([]);
            setHighLevelCheckType('automated');
            setCheckType('automated');
            setTarget('');
            setParameters({});
            setEvidenceTypesExpected([]);
            setLinkedDocumentIDs([]);
        }
    }, [initialData, mode, requirements, documents]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!requirementIds.length) {
            setError('Please select at least one compliance requirement');
            return;
        }
        if (!title.trim()) {
            setError('Task title is required');
            return;
        }
        if (!version.trim()) {
            setError('Version is required');
            return;
        }
        if (!category.trim()) {
            setError('Category is required');
            return;
        }
        if (!defaultPriority.trim()) {
            setError('Default Priority is required');
            return;
        }
        if (!status.trim()) {
            setError('Status is required');
            return;
        }
        console.log('checkType', checkType);
        if (highLevelCheckType === 'automated' && !target) {
            setError('Target system is required for automated checks');
            return;
        }
        onSubmit({
            requirementIds: requirementIds.map(opt => opt.value),
            title,
            description,
            version,
            category,
            defaultPriority,
            status,
            tags,
            highLevelCheckType,
            checkType,
            target,
            parameters,
            evidenceTypesExpected: evidenceTypesExpected.map(opt => opt.value),
            linkedDocumentIDs: linkedDocumentIDs.map(opt => opt.value),
        });
    };

    const handleParamChange = (paramName, value, paramDef) => {
        setParameters(prev => ({
            ...prev,
            [paramName]: paramDef.type === 'number' ? Number(value) : value
        }));
    };

    const priorityOptions = [
        { value: 'high', label: 'High', icon: <FaExclamationTriangle className="text-danger" /> },
        { value: 'medium', label: 'Medium', icon: <FaExclamationTriangle className="text-warning" /> },
        { value: 'low', label: 'Low', icon: <FaExclamationTriangle className="text-info" /> }
    ];

    const statusOptions = [
        { value: 'active', label: 'Active', icon: <FaCheckCircle className="text-success" /> },
        { value: 'deprecated', label: 'Deprecated', icon: <FaExclamationTriangle className="text-warning" /> },
        { value: 'pending', label: 'Pending Review', icon: <FaExclamationTriangle className="text-info" /> }
    ];

    const checkTypeOptions = Object.entries(checkTypeConfigurations).map(([key, config]) => ({ value: key, label: config.label }));

    // Requirement options for react-select
    const requirementOptions = requirements.map(req => ({
        value: req.id,
        label: req.name || req.requirementText || req.description || req.requirement_id || req.id
    }));

    const highLevelCheckTypeOptions = [
        { value: 'automated', label: 'Automated' },
        { value: 'manual', label: 'Manual' },
        { value: 'document', label: 'Document Upload' },
        { value: 'interview', label: 'Interview' },
    ];

    return (
        <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            <Form.Group className="mb-3" controlId="formTaskRequirements">
                <Form.Label>Compliance Requirement*</Form.Label>
                <Select
                    isMulti
                    options={requirementOptions}
                    value={requirementIds}
                    onChange={setRequirementIds}
                    placeholder="Select one or more requirements..."
                    isClearable
                />
            </Form.Group>
            <FloatingLabel controlId="formTitle" label={<><FaTasks className="me-1" />Task Title*</>} className="mb-3">
                <Form.Control
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task Title"
                    required
                />
            </FloatingLabel>
            <FloatingLabel controlId="formDescription" label={<><FaAlignLeft className="me-1" />Description</>} className="mb-3">
                <Form.Control
                    as="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    style={{ height: '100px' }}
                />
            </FloatingLabel>
            <Form.Group className="mb-3" controlId="linkedDocuments">
                <Form.Label><FaBookOpen className="me-1" />Link Documents</Form.Label>
                <Select
                    isMulti
                    options={(documents || []).map(doc => ({ value: doc.id, label: `${doc.name} (${doc.document_type})` }))}
                    value={linkedDocumentIDs}
                    onChange={setLinkedDocumentIDs}
                    placeholder="Select documents to link..."
                    isClearable
                />
                <Form.Text muted>Associate relevant policies, procedures, or regulatory documents.</Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="formHighLevelCheckType">
                <Form.Label>Check Type*</Form.Label>
                <Form.Select
                    value={highLevelCheckType}
                    onChange={e => setHighLevelCheckType(e.target.value)}
                    required
                >
                    {highLevelCheckTypeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </Form.Select>
            </Form.Group>
            {highLevelCheckType === 'automated' && (
                <>
                    <Row>
                        <Col md={6}>
                            <FloatingLabel controlId="formCheckType" label={<><FaCogs className="me-1" />Automated Check Type*</>} className="mb-3">
                                <Form.Select
                                    value={checkType}
                                    onChange={e => {
                                        setCheckType(e.target.value);
                                        setParameters({});
                                    }}
                                    required
                                >
                                    <option value="">Select Check Type</option>
                                    {checkTypeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Form.Select>
                            </FloatingLabel>
                        </Col>
                        <Col md={6}>
                            {checkType && checkTypeConfigurations[checkType]?.targetType === 'connected_system' && (
                                <FloatingLabel controlId="formTarget" label={checkTypeConfigurations[checkType].targetLabel || 'Target System'} className="mb-3">
                                    <Form.Select
                                        value={target}
                                        onChange={e => setTarget(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Target System</option>
                                        {connectedSystems.map(sys => (
                                            <option key={sys.id} value={sys.id}>{sys.name} ({sys.systemType})</option>
                                        ))}
                                    </Form.Select>
                                    {checkTypeConfigurations[checkType].targetHelpText && <Form.Text muted>{checkTypeConfigurations[checkType].targetHelpText}</Form.Text>}
                                </FloatingLabel>
                            )}
                        </Col>
                    </Row>
                    {checkType && checkTypeConfigurations[checkType] && (
                        <Accordion className="mb-3">
                            <Accordion.Item eventKey="0">
                                <Accordion.Header>Parameters for {checkTypeConfigurations[checkType].label}</Accordion.Header>
                                <Accordion.Body>
                                    {checkTypeConfigurations[checkType].parameters.map(paramDef => (
                                        <FloatingLabel key={paramDef.name} controlId={`formParam-${paramDef.name}`} label={paramDef.label} className="mb-3">
                                            {paramDef.type === 'select' ? (
                                                <Form.Select
                                                    value={parameters[paramDef.name] || ''}
                                                    onChange={e => handleParamChange(paramDef.name, e.target.value, paramDef)}
                                                    required={paramDef.required}
                                                >
                                                    <option value="">Select {paramDef.label}</option>
                                                    {paramDef.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </Form.Select>
                                            ) : paramDef.type === 'textarea' ? (
                                                <Form.Control
                                                    as="textarea"
                                                    value={parameters[paramDef.name] || ''}
                                                    onChange={e => handleParamChange(paramDef.name, e.target.value, paramDef)}
                                                    placeholder={paramDef.placeholder}
                                                    required={paramDef.required}
                                                    style={{ height: '80px' }}
                                                />
                                            ) : (
                                                <Form.Control
                                                    type={paramDef.type}
                                                    value={parameters[paramDef.name] || ''}
                                                    onChange={e => handleParamChange(paramDef.name, e.target.value, paramDef)}
                                                    placeholder={paramDef.placeholder}
                                                    required={paramDef.required}
                                                />
                                            )}
                                            {paramDef.helpText && <Form.Text muted>{paramDef.helpText}</Form.Text>}
                                        </FloatingLabel>
                                    ))}
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>
                    )}
                </>
            )}
            <Row>
                <Col md={6}>
                    <FloatingLabel controlId="formDefaultPriority" label="Default Priority" className="mb-3">
                        <Form.Select
                            value={defaultPriority}
                            onChange={(e) => setDefaultPriority(e.target.value)}
                            required
                        >
                            {priorityOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
                <Col md={6}>
                    <FloatingLabel controlId="formStatus" label="Status" className="mb-3">
                        <Form.Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
            </Row>
            <Row>
                <Col md={6}>
                    <FloatingLabel controlId="formCategory" label="Category*" className="mb-3">
                        <Form.Select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            required
                        >
                            <option value="">Select Category</option>
                            {taskCategories.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
                <Col md={6}>
                    <FloatingLabel controlId="formVersion" label={<><FaTag className="me-1" />Version*</>} className="mb-3">
                        <Form.Control
                            type="text"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            placeholder="e.g., v1.0"
                            required
                        />
                    </FloatingLabel>
                </Col>
            </Row>
            <Form.Group className="mb-3" controlId="evidenceTypesExpected">
                <Form.Label>Evidence Types Needed</Form.Label>
                <CreatableSelect
                    isMulti
                    options={evidenceTypeOptions}
                    value={evidenceTypesExpected}
                    onChange={setEvidenceTypesExpected}
                    placeholder="Select or type to add evidence types..."
                    isClearable
                />
                <Form.Text muted>Specify the types of evidence typically required for this task.</Form.Text>
            </Form.Group>
            <div className="mt-3">
                <Button variant="primary" type="submit" className="me-2">
                    {mode === 'edit' ? <><FaEdit className="me-1" />Update Task</> : <><FaPlusCircle className="me-1" />Add Task</>}
                </Button>
                <Button variant="outline-secondary" onClick={onCancel}>
                    <FaWindowClose className="me-1" />Cancel
                </Button>
            </div>
        </Form>
    );
}

export default TaskForm;