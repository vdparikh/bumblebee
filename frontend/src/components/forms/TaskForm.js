import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Accordion } from 'react-bootstrap';
import {
    FaTasks, FaAlignLeft, FaTag, FaExclamationCircle, FaEdit, FaPlusCircle,
    FaWindowClose, FaFileContract, FaCogs, FaBookOpen
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
    const [requirementIds, setRequirementIds] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [defaultPriority, setDefaultPriority] = useState('');
    const [checkType, setCheckType] = useState('');
    const [checkTarget, setCheckTarget] = useState('');
    const [checkParams, setCheckParams] = useState({});
    const [evidenceTypesExpected, setEvidenceTypesExpected] = useState([]);
    const [linkedDocumentIDs, setLinkedDocumentIDs] = useState([]);

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setRequirementIds(initialData.requirementIds ? initialData.requirementIds.map(id => ({
                value: id,
                label: requirements.find(r => r.id === id)?.controlIdReference || id
            })) : []);
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setCategory(initialData.category || '');
            setDefaultPriority(initialData.defaultPriority || '');
            setCheckType(initialData.checkType || '');
            setCheckTarget(initialData.target || '');
            setCheckParams(initialData.parameters || {});
            setEvidenceTypesExpected(initialData.evidenceTypesExpected ? initialData.evidenceTypesExpected.map(et => ({ value: et, label: evidenceTypeOptions.find(opt => opt.value === et)?.label || et })) : []);
            setLinkedDocumentIDs(initialData.linked_documents ? initialData.linked_documents.map(doc => ({ value: doc.id, label: doc.name })) : []);
        } else {
            if (parentId) {
                const parentRequirement = requirements.find(r => r.id === parentId);
                if (parentRequirement) {
                    setRequirementIds([{ value: parentId, label: parentRequirement.controlIdReference }]);
                }
            } else {
                setRequirementIds([]);
            }
            setTitle('');
            setDescription('');
            setCategory('');
            setDefaultPriority('');
            setCheckType('');
            setCheckTarget('');
            setCheckParams({});
            setEvidenceTypesExpected([]);
            setLinkedDocumentIDs([]);
        }
    }, [initialData, mode, parentId, requirements]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            requirementIds: requirementIds.map(option => option.value),
            title,
            description,
            category,
            defaultPriority: defaultPriority || null,
            checkType: checkType || null,
            target: checkTarget || null,
            parameters: Object.keys(checkParams).length > 0 ? checkParams : null,
            evidenceTypesExpected: evidenceTypesExpected.map(option => option.value),
            linked_document_ids: linkedDocumentIDs.map(option => option.value),
        });
    };

    const priorityOptions = [
        { value: 'Critical', label: 'Critical' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
    ];

    const requirementOptions = requirements.map(req => ({
        value: req.id,
        label: `${req.controlIdReference} - ${req.requirementText.substring(0, 50)}...`
    }));

    const handleParamChange = (paramName, value, paramDef) => {
        setCheckParams(prevParams => ({
            ...prevParams,
            [paramName]: (() => {
                if (paramDef.type === 'number') {
                    if (value.trim() === '') return null;
                    const num = parseInt(value, 10);
                    return isNaN(num) ? null : num;
                }
                if (paramDef.name === 'script_args' && value) {
                    if (typeof value === 'string' && value.trim() === '') return null;
                    try {
                        const parsed = JSON.parse(value);
                        return (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) ? parsed : value;
                    } catch (e) { return value; /* Keep as string if not valid JSON array */ }
                }
                return value;
            })()
        }));
    };
    const handleCheckTypeChangeInternal = (e) => {
        setCheckType(e.target.value);
        setCheckParams({});
        setCheckTarget('');
    };

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formTaskRequirements">
                <Form.Label><><FaFileContract className="me-1" />Associated Requirements*</></Form.Label>
                <Select
                    isMulti
                    options={requirementOptions}
                    value={requirementIds}
                    onChange={setRequirementIds}
                    placeholder="Select one or more requirements..."
                    isClearable
                    required
                />
                <Form.Text muted>Select one or more requirements this task addresses.</Form.Text>
            </Form.Group>

            <FloatingLabel controlId="formTaskTitle" label={<><FaTasks className="me-1" />Task Title*</>} className="mb-3">
                <Form.Control type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task Title" required />
            </FloatingLabel>

            <FloatingLabel controlId="formTaskDescription" label={<><FaAlignLeft className="me-1" />Description</>} className="mb-3">
                <Form.Control as="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" style={{ height: '100px' }} />
            </FloatingLabel>

            <FloatingLabel controlId="formTaskCategory" label={<><FaTag className="me-1" />Category</>} className="mb-3">
                <Form.Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Select task category">
                    <option value="">Select Category</option>
                    {taskCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </Form.Select>
            </FloatingLabel>

            <FloatingLabel controlId="formTaskPriority" label={<><FaExclamationCircle className="me-1" />Default Priority</>} className="mb-3">
                 <Form.Select value={defaultPriority} onChange={(e) => setDefaultPriority(e.target.value)}>
                    <option value="">Select Priority</option>
                    {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </Form.Select>
            </FloatingLabel>

            <Form.Group className="mb-3" controlId="evidenceTypesExpected">
                <Form.Label><FaBookOpen className="me-1" />Evidence Types Expected</Form.Label>
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

            <Accordion className="mb-3">
                <Accordion.Item eventKey="0">
                    <Accordion.Header><FaCogs className="me-2" />Optional: Automated Check Details</Accordion.Header>
                    <Accordion.Body>
                        <FloatingLabel controlId="formCheckType" label="Check Type" className="mb-3">
                            <Form.Select value={checkType} onChange={handleCheckTypeChangeInternal}>
                                <option value="">Select Check Type</option>
                                {Object.entries(checkTypeConfigurations).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </Form.Select>
                        </FloatingLabel>

                        {checkType && checkTypeConfigurations[checkType] && (
                            <>
                                {checkTypeConfigurations[checkType].targetType === 'connected_system' && (
                                    <div>
                                    <FloatingLabel controlId="formCheckTargetSystem" label={checkTypeConfigurations[checkType].targetLabel || "Target Connected System"} className="mb-3">
                                        <Form.Select value={checkTarget} onChange={(e) => setCheckTarget(e.target.value)} required={!!checkType}>
                                            <option value="">Select Connected System</option>
                                            {(connectedSystems || []).map(system => (
                                                <option key={system.id} value={system.id}>{system.name} ({system.systemType})</option>
                                            ))}
                                        </Form.Select>
                                        {checkTypeConfigurations[checkType].targetHelpText && <Form.Text muted>{checkTypeConfigurations[checkType].targetHelpText}</Form.Text>}
                                    </FloatingLabel>

                                    </div>
                                )}

                                {checkTypeConfigurations[checkType].parameters.map(paramDef => (
                                    <FloatingLabel key={paramDef.name} controlId={`formParam-${paramDef.name}`} label={`${paramDef.label}${paramDef.required ? '*' : ''}`} className="mb-3">
                                        {paramDef.type === 'select' ? (
                                            <Form.Select value={checkParams[paramDef.name] || ''} onChange={(e) => handleParamChange(paramDef.name, e.target.value, paramDef)} required={paramDef.required}>
                                                <option value="">Select {paramDef.label}</option>
                                                {paramDef.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </Form.Select>
                                        ) : paramDef.type === 'textarea' ? (
                                            <Form.Control as="textarea" value={paramDef.name === 'script_args' && Array.isArray(checkParams[paramDef.name]) ? JSON.stringify(checkParams[paramDef.name]) : (checkParams[paramDef.name] || '')} onChange={(e) => handleParamChange(paramDef.name, e.target.value, paramDef)} placeholder={paramDef.placeholder} required={paramDef.required} style={{ height: '80px' }} />
                                        ) : (
                                            <Form.Control type={paramDef.type} value={checkParams[paramDef.name] || ''} onChange={(e) => handleParamChange(paramDef.name, e.target.value, paramDef)} placeholder={paramDef.placeholder} required={paramDef.required} />
                                        )}
                                        {paramDef.helpText && <Form.Text muted>{paramDef.helpText}</Form.Text>}
                                    </FloatingLabel>
                                ))}
                            </>
                        )}
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>

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