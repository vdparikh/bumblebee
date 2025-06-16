import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Accordion, Alert, Card } from 'react-bootstrap';
import {
    FaTasks, FaAlignLeft, FaTag, FaExclamationCircle, FaEdit, FaPlusCircle,
    FaWindowClose, FaFileContract, FaCogs, FaBookOpen, FaCalendarAlt, FaLink, FaExclamationTriangle, FaCheckCircle, FaTerminal, FaFileUpload, FaUserShield
} from 'react-icons/fa';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { fetchIntegrationCheckTypes } from '../../services/api'; // Adjust path as needed

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

    const [dynamicCheckTypeConfigurations, setDynamicCheckTypeConfigurations] = useState({});
    const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(true);
    const [configError, setConfigError] = useState('');

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

    useEffect(() => {
        const fetchCheckTypeConfigs = async () => {
            try {
                setIsLoadingConfigurations(true);
                const data = await fetchIntegrationCheckTypes();
                setDynamicCheckTypeConfigurations(data.data);
                setConfigError('');
            } catch (err) {
                console.error("Error fetching check type configurations:", err);
                setConfigError(err.message || 'Could not load check type configurations.');
                setDynamicCheckTypeConfigurations({});
            } finally {
                setIsLoadingConfigurations(false);
            }
        };
        fetchCheckTypeConfigs();
    }, []);

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

    const checkTypeOptions = isLoadingConfigurations || configError
        ? []
        : Object.entries(dynamicCheckTypeConfigurations).map(([key, config]) => ({ value: key, label: config.label }));

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

            <Card className='bg-light mb-3'>
                <Card.Header><b>Task Overview</b></Card.Header>
                <Card.Body>
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

                </Card.Body>
            </Card>

            <Card className='bg-light mb-3'>
                <Card.Header><b>Evidence Automation</b></Card.Header>
                <Card.Body>

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


                    <Form.Group className="mb-3" controlId="formHighLevelCheckType">

                        <FloatingLabel controlId="formTarget" className="mb-3"
                            label='Check Type*' >
                            <Form.Select
                                value={highLevelCheckType}
                                onChange={e => setHighLevelCheckType(e.target.value)}
                                required
                            >
                                <option value="">Select Check Type</option>

                                {highLevelCheckTypeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </Form.Select>
                        </FloatingLabel>
                        {highLevelCheckType === 'automated' && (
                            <>
                                {isLoadingConfigurations && <Alert variant="info">Loading check type configurations...</Alert>}
                                {configError && <Alert variant="danger" onClose={() => setConfigError('')} dismissible>{configError}</Alert>}
                                {!isLoadingConfigurations && !configError && Object.keys(dynamicCheckTypeConfigurations).length === 0 && (
                                    <Alert variant="warning">No automated check types configured. Please add integrations.</Alert>
                                )}
                                {!isLoadingConfigurations && !configError && Object.keys(dynamicCheckTypeConfigurations).length > 0 && (
                                    <>

                                        {/* {dynamicCheckTypeConfigurations[checkType]?.targetType === 'connected_system' && ( */}
                                        {/* label={dynamicCheckTypeConfigurations[checkType].targetLabel || 'Target System'} */}
                                        <FloatingLabel controlId="formTarget" className="mb-3"
                                            label='Target System' >
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
                                            {/* {dynamicCheckTypeConfigurations[checkType].targetHelpText && <Form.Text muted>{dynamicCheckTypeConfigurations[checkType].targetHelpText}</Form.Text>} */}
                                        </FloatingLabel>
                                        {/* )} */}


                                        {target && (
                                            <FloatingLabel controlId="formCheckType" label={<><FaCogs className="me-1" />Automated Check Type*</>} className="mb-3">
                                                <Form.Select
                                                    value={checkType}
                                                    onChange={e => {
                                                        setCheckType(e.target.value);
                                                        setParameters({});
                                                    }}
                                                    required
                                                    disabled={checkTypeOptions.length === 0}
                                                >
                                                    <option value="">Select Check Type</option>
                                                    {checkTypeOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </Form.Select>
                                            </FloatingLabel>
                                        )}



                                        {checkType && target && dynamicCheckTypeConfigurations[checkType] && (
                                            <Accordion className="mb-3">
                                                <Accordion.Item eventKey="0">
                                                    <Accordion.Header>Parameters for {dynamicCheckTypeConfigurations[checkType].label}</Accordion.Header>
                                                    <Accordion.Body>
                                                        {dynamicCheckTypeConfigurations[checkType].parameters.map(paramDef => (
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
                            </>
                        )}

                    </Form.Group>
                </Card.Body>

            </Card>



            <div className="mt-3">
                <Button variant="success" type="submit" className="w-100">
                    {mode === 'edit' ? <><FaEdit className="me-1" />Update Task</> : <><FaPlusCircle className="me-1" />Add Task</>}
                </Button>
                {/* <Button variant="outline-secondary" onClick={onCancel}>
                    <FaWindowClose className="me-1" />Cancel
                </Button> */}
            </div>
        </Form>
    );
}

export default TaskForm;