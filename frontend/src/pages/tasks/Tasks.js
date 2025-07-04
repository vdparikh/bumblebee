import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    getTasks,
    createTask,
    updateTask,
    getRequirements,
    getUsers,
    getComplianceStandards,
    getConnectedSystems,
    getDocuments
} from '../../services/api';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Accordion from 'react-bootstrap/Accordion';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab'; // eslint-disable-next-line no-unused-vars
import CreatableSelect from 'react-select/creatable';
import Badge from 'react-bootstrap/Badge';
import Dropdown from 'react-bootstrap/Dropdown';

import {
    FaTasks as FaTasksIcon,
    FaPlusCircle,
    FaListUl,
    FaInfoCircle,



    FaTag,
    FaClipboardList,
    FaCogs,
    FaCalendarAlt,
    FaUserShield,
    FaUserCheck,





    FaEdit,
    FaWindowClose,
    FaEllipsisV,

    FaFileSignature,
    FaBookOpen,
    FaShieldAlt,
    FaFileContract
} from 'react-icons/fa'; // eslint-disable-next-line no-unused-vars
import Select from 'react-select';
import PageHeader from '../../components/ui/PageHeader';
import { ListGroupItem } from 'react-bootstrap';

function Tasks() {
    const [tasks, setTasks] = useState([]);


    const [newTitle, setNewTitle] = useState('');

    const taskCategories = [
        "Asset Management",
        "Configuration Management",
        "Data Security",
        "Vulnerability Management",
        "Audit",
        "Policy",
        "Other"
    ];
    const [newDescription, setNewDescription] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newOwnerUserId, setNewOwnerUserId] = useState('');
    const [newAssigneeUserId, setNewAssigneeUserId] = useState('');
    const [newStatus, setNewStatus] = useState('Open');
    const [newDueDate, setNewDueDate] = useState('');
    const [newRequirementId, setNewRequirementId] = useState('');
    const [newCheckType, setNewCheckType] = useState('');
    const [newCheckTarget, setNewCheckTarget] = useState('');
    const [newCheckParams, setNewCheckParams] = useState({});
    const [newEvidenceTypesExpected, setNewEvidenceTypesExpected] = useState([]);
    const [newLinkedDocumentIDs, setNewLinkedDocumentIDs] = useState([]);
    const [newDefaultPriority, setNewDefaultPriority] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');


    const [allStandards, setAllStandards] = useState([]);
    const [allRequirements, setAllRequirements] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allConnectedSystems, setAllConnectedSystems] = useState([]);
    const [allDocuments, setAllDocuments] = useState([]);

    const [filteredTasks, setFilteredTasks] = useState([]);
    const [selectedStandardIdForFilter, setSelectedStandardIdForFilter] = useState('');
    const [selectedRequirementIdForFilter, setSelectedRequirementIdForFilter] = useState('');

    const [editingTaskId, setEditingTaskId] = useState(null);
    const [activeTabKey, setActiveTabKey] = useState('existing');

    const evidenceTypeOptions = [
        { value: 'screenshot', label: 'Screenshot' },
        { value: 'log_file', label: 'Log File' },
        { value: 'configuration_snippet', label: 'Configuration Snippet' },
        { value: 'policy_document', label: 'Policy Document' },
        { value: 'interview_notes', label: 'Interview Notes' },
    ];

    // Define check types and their specific parameter configurations
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
        'port_scan_check': {
            label: 'Port Scan Check',
            parameters: [
                { name: 'port', label: 'Port Number', type: 'number', required: true, placeholder: 'e.g., 80 or 443' },
                { name: 'protocol', label: 'Protocol', type: 'select', options: [{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }], required: false, placeholder: 'tcp', helpText: 'Optional. Network protocol. Defaults to TCP.' },
                { name: 'timeout_seconds', label: 'Timeout (seconds)', type: 'number', placeholder: '5', helpText: 'Optional. Connection timeout in seconds. Defaults to 5.' }
            ],
            targetType: 'connected_system',
            targetLabel: 'Target Connected System (for Host/IP)',
            targetHelpText: "Select a Connected System. Its configuration should contain a 'host' field (e.g., {\"host\": \"server.example.com\"})."

        }
        ,
        'file_exists_check': {
            label: 'File Exists Check',
            parameters: [
                { name: 'filePath', label: 'File Path on Target Host', type: 'text', required: true, placeholder: '/etc/passwd or C:\\Windows\\System32\\...' }
            ],
            targetType: 'connected_system',
            targetLabel: 'Target Host (e.g., Server, Workstation)',
            targetHelpText: "Select the Connected System representing the host where the file should exist. Its configuration should contain a 'host' field."
        },
        'database_query_check': {
            label: 'Database Query Check',
            parameters: [
                { name: 'query', label: 'SQL Query', type: 'textarea', required: true, placeholder: 'SELECT COUNT(*) FROM users WHERE active = TRUE;', helpText: 'The SQL query to execute.' },
                { name: 'expected_rows', label: 'Expected Number of Rows (Optional)', type: 'number', required: false, placeholder: '0', helpText: 'Optional. The expected number of rows returned by the query for a successful check.' }
            ],
            targetType: 'connected_system',
            targetLabel: 'Target Database System',
            targetHelpText: "Select the Connected System representing the database server. Its configuration should contain connection details (e.g., 'host', 'port', 'database', 'user', 'password')."
        }


    };

    const fetchTasks = useCallback(async () => {
        try {
            const response = await getTasks();
            setTasks(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setError('Failed to fetch tasks.');
            setTasks([]);
        }
    }, []);

    const fetchDropdownData = useCallback(async () => {
        try {
            const standardsResponse = await getComplianceStandards();
            setAllStandards(Array.isArray(standardsResponse.data) ? standardsResponse.data : []);
        } catch (err) {
            console.error("Error fetching standards for dropdown:", err);
            setError(prev => prev + ' Failed to fetch standards for selection.');
            setAllStandards([]);
        }
        try {
            const reqResponse = await getRequirements();
            setAllRequirements(Array.isArray(reqResponse.data) ? reqResponse.data : []);
        } catch (err) {
            console.error("Error fetching requirements for dropdown:", err);
            setError(prev => prev + ' Failed to fetch requirements for selection.');
            setAllRequirements([]);
        }
        try {
            const usersResponse = await getUsers();
            setAllUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
        } catch (err) {
            console.error("Error fetching users for dropdown:", err);
            setError(prev => prev + ' Failed to fetch users for selection.');
            setAllUsers([]);
        }
        try {
            const systemsResponse = await getConnectedSystems();
            setAllConnectedSystems(Array.isArray(systemsResponse.data) ? systemsResponse.data : []);
        } catch (err) {
            console.error("Error fetching connected systems for dropdown:", err);
            setError(prev => prev + ' Failed to fetch connected systems for selection.');
            setAllConnectedSystems([]);
        }
        try {
            const docsResponse = await getDocuments();
            setAllDocuments(Array.isArray(docsResponse.data) ? docsResponse.data : []);
            console.log(docsResponse)
        } catch (err) {
            console.error("Error fetching documents for selection:", err);
            setError(prev => prev + ' Failed to fetch documents for selection.');
            setAllDocuments([]);
        }

    }, []);

    useEffect(() => {
        fetchTasks();
        fetchDropdownData();
    }, [fetchTasks, fetchDropdownData]);

    useEffect(() => {
        let tempTasks = [...tasks];
        if (selectedStandardIdForFilter) {
            const requirementIdsForStandard = allRequirements
                .filter(req => req.standardId === selectedStandardIdForFilter)
                .map(req => req.id);
            tempTasks = tempTasks.filter(task =>
                task.requirementId && requirementIdsForStandard.includes(task.requirementId)
            );
        }
        if (selectedRequirementIdForFilter) {
            tempTasks = tempTasks.filter(task => task.requirementId === selectedRequirementIdForFilter);
        }
        setFilteredTasks(tempTasks);
    }, [tasks, selectedStandardIdForFilter, selectedRequirementIdForFilter, allRequirements]);

    const resetFormFields = () => {
        setNewTitle('');
        setNewDescription('');
        setNewCategory('');
        setNewOwnerUserId('');
        setNewAssigneeUserId('');
        setNewStatus('Open');
        setNewDueDate('');
        setNewRequirementId('');
        setNewCheckType('');
        setNewCheckTarget('');
        setNewCheckParams({});
        setNewEvidenceTypesExpected([]);
        setNewLinkedDocumentIDs([]);
        setNewDefaultPriority('');
    };

    const handleSubmitTask = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) {
            setError("Title is required.");
            setSuccess('');
            return;
        }

        console.log('Current newLinkedDocumentIDs state:', newLinkedDocumentIDs);











        let processedParams = { ...newCheckParams };


        const currentCheckConfig = checkTypeConfigurations[newCheckType];
        if (newCheckType && currentCheckConfig && currentCheckConfig.parameters) {
            for (const paramDef of currentCheckConfig.parameters) {
                const paramValue = processedParams[paramDef.name];
                if (paramDef.required && (paramValue === undefined || paramValue === '' || paramValue === null)) {
                    setError(`Parameter "${paramDef.label}" is required for ${currentCheckConfig.label}.`);
                    setSuccess('');
                    return;
                }


                if (paramDef.name === 'script_args' && paramValue) {
                    if (typeof paramValue === 'string') {
                        if (paramValue.trim() === '') {
                            processedParams.script_args = null;
                        } else {
                            try {
                                const parsed = JSON.parse(paramValue);
                                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                                    processedParams.script_args = parsed;
                                } else {
                                    setError('Script Arguments must be a valid JSON array of strings (e.g., ["arg1", "arg2"]). Or leave empty.');
                                    setSuccess('');
                                    return;
                                }
                            } catch (e) {
                                setError('Script Arguments contains invalid JSON. Please provide a valid JSON array of strings or leave empty.');
                                setSuccess('');
                                return;
                            }
                        }
                    } else if (!Array.isArray(paramValue) && paramValue !== null) {
                        setError('Script Arguments must be a valid JSON array of strings or null.');
                        setSuccess('');
                        return;
                    }
                }
            }
        }

        const taskData = {
            title: newTitle.trim(),
            description: newDescription.trim(),
            category: newCategory,




            requirementId: newRequirementId.trim() || null,
            checkType: newCheckType.trim() || null,
            target: newCheckTarget.trim() || null,
            parameters: Object.keys(processedParams).length > 0 ? processedParams : null,
            evidenceTypesExpected: newEvidenceTypesExpected.map(option => option.value),
            linked_document_ids: newLinkedDocumentIDs.map(option => option.value),
            defaultPriority: newDefaultPriority.trim() || null,
        };

        console.log(taskData)
        try {
            if (editingTaskId) {
                await updateTask(editingTaskId, taskData);
                setSuccess('Task updated successfully!');
            } else {
                await createTask(taskData);
                setSuccess('Task created successfully!');
            }
            resetFormFields();
            fetchTasks();
            setError('');
            setEditingTaskId(null);
            setActiveTabKey('existing');
        } catch (error) {
            const action = editingTaskId ? "update" : "create";
            console.error(`Error ${action} task:`, error.response ? error.response.data : error.message);
            setError(`Failed to ${action} task. ${error.response?.data?.error || 'An unexpected error occurred.'}`);
            setSuccess('');
        }
    };

    const handleEditTask = (task) => {
        setEditingTaskId(task.id);
        setNewTitle(task.title || '');
        setNewDescription(task.description || '');
        setNewCategory(task.category || '');




        setNewRequirementId(task.requirementId || '');
        setNewCheckType(task.checkType || '');
        setNewCheckTarget(task.target || '');
        setNewCheckParams(task.parameters || {});

        setNewEvidenceTypesExpected(task.evidenceTypesExpected ? task.evidenceTypesExpected.map(et => ({ value: et, label: evidenceTypeOptions.find(opt => opt.value === et)?.label || et })) : []);

        setNewLinkedDocumentIDs(task.linked_documents ? task.linked_documents.map(doc => ({ value: doc.id, label: doc.name })) : []);
        setNewDefaultPriority(task.defaultPriority || '');
        setActiveTabKey('create');
        setError('');
        setSuccess('');
    };

    const handleCancelEdit = () => {
        setEditingTaskId(null);
        resetFormFields();
        setActiveTabKey('existing');
        setError('');
        setSuccess('');
    };

    const handleParamChange = (paramName, value, paramDef) => {
        setNewCheckParams(prevParams => ({
            ...prevParams,
            [paramName]: (() => {
                if (paramDef.type === 'number') {
                    if (value.trim() === '') {
                        return null;
                    }
                    const num = parseInt(value, 10);
                    return isNaN(num) ? null : num;
                }


                return value;
            })()
        }));
    };
    const handleCheckTypeChange = (e) => {
        setNewCheckType(e.target.value);
        setNewCheckParams({});
        setNewCheckTarget('');
    };

    const handleClearFilters = () => {
        setSelectedStandardIdForFilter('');
        setSelectedRequirementIdForFilter('');
    };

    const renderUserWithPopover = (userId, defaultText = 'N/A') => {
        if (!userId) return defaultText;
        const user = getUserDetails(userId);
        if (!user) return userId;

        const userPopover = (
            <Popover id={`popover-user-list-${user.id}`}>
                <Popover.Header as="h3">{user.name}</Popover.Header>
                <Popover.Body>
                    <strong>Email:</strong> {user.email || 'N/A'}<br />
                    <strong>ID:</strong> {user.id}
                </Popover.Body>
            </Popover>
        );
        return <OverlayTrigger placement="top" overlay={userPopover} delay={{ show: 250, hide: 400 }}><span>{user.name}</span></OverlayTrigger>;
    };

    const getUserDetails = (userId) => {
        if (!userId || !allUsers || allUsers.length === 0) return null;
        return allUsers.find(user => user.id === userId);
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Asset Management':
                return <FaTag size="1em" className="text-info" title="Asset Management" />;
            case 'Configuration Management':
                return <FaCogs size="1em" className="text-primary" title="Configuration Management" />;
            case 'Data Security':
                return <FaShieldAlt size="1em" className="text-success" title="Data Security" />;
            case 'Vulnerability Management':
                return <FaFileContract size="1em" className="text-warning" title="Vulnerability Management" />;
            case 'Audit':
                return <FaClipboardList size="1em" className="text-secondary" title="Audit" />;
            case 'Policy':
                return <FaFileSignature size="1em" className="text-danger" title="Policy" />;
            default:
                return <FaTasksIcon size="1em" className="text-muted" title={category || "Task"} />;
        }
    }

    const getRequirementDetailsById = (reqId) => {
        if (!reqId || !allRequirements || allRequirements.length === 0) return null;
        return allRequirements.find(req => req.id === reqId);
    };

    const getStandardNameByStandardId = (stdId) => {
        if (!stdId || !allStandards || allStandards.length === 0) return null;
        const standard = allStandards.find(std => std.id === stdId);
        return standard ? `${standard.name} (${standard.shortName})` : stdId;
    };

    return (
        <div>
            {/* <h2 className="mb-4"><FaTasksIcon className="me-2" />Compliance Tasks</h2> */}
            <PageHeader title="Compliance Tasks" />

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card className="mb-3">
                <Card.Header>Filters</Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={5}>
                            <FloatingLabel controlId="filterStandard" label="Filter by Standard">
                                <Form.Select
                                    aria-label="Filter by Standard"
                                    value={selectedStandardIdForFilter}
                                    onChange={(e) => {
                                        setSelectedStandardIdForFilter(e.target.value);
                                        setSelectedRequirementIdForFilter('');
                                    }}
                                >
                                    <option value="">All Standards</option>
                                    {allStandards.map(standard => (
                                        <option key={standard.id} value={standard.id}>
                                            {standard.name} ({standard.shortName})
                                        </option>
                                    ))}
                                </Form.Select>
                            </FloatingLabel>
                        </Col>
                        <Col md={5}>
                            <FloatingLabel controlId="filterRequirement" label="Filter by Requirement">
                                <Form.Select
                                    aria-label="Filter by Requirement"
                                    value={selectedRequirementIdForFilter}
                                    onChange={(e) => setSelectedRequirementIdForFilter(e.target.value)}
                                >
                                    <option value="">All Requirements</option>
                                    {allRequirements
                                        .filter(req => !selectedStandardIdForFilter || req.standardId === selectedStandardIdForFilter)
                                        .map(req => (
                                            <option key={req.id} value={req.id}>
                                                {req.controlIdReference} - {req.requirementText.substring(0, 30)}...
                                            </option>
                                        ))}
                                </Form.Select>
                            </FloatingLabel>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                            <Button variant="outline-secondary" onClick={handleClearFilters} className="w-100">Clear Filters</Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {(selectedStandardIdForFilter || selectedRequirementIdForFilter) && (
                <Alert variant="info" className="d-flex justify-content-between align-items-center">
                    <span>
                        Filtering by:
                        {selectedStandardIdForFilter && <Badge bg="info" className="ms-2 me-1">{allStandards.find(s => s.id === selectedStandardIdForFilter)?.name || 'Standard'}</Badge>}
                        {selectedRequirementIdForFilter && <Badge bg="info" className="ms-2 me-1">{allRequirements.find(r => r.id === selectedRequirementIdForFilter)?.controlIdReference || 'Requirement'}</Badge>}
                    </span>
                </Alert>
            )}

            <Tabs activeKey={activeTabKey} onSelect={(k) => setActiveTabKey(k)} id="tasks-tabs" className="mb-3 nav-line-tabs">
                <Tab eventKey="create" title={<><FaPlusCircle className="me-1" />{editingTaskId ? 'Edit Task' : 'Create New Task'}</>}>
                    <Card className="mb-4">
                        <Card.Body>
                            <Form onSubmit={handleSubmitTask}>


                                <FloatingLabel controlId="floatingRequirementId" label={<><FaClipboardList className="me-1" />Requirement</>} className="mb-3">
                                    <Form.Select value={newRequirementId} onChange={(e) => setNewRequirementId(e.target.value)} aria-label="Select associated requirement">
                                        <option value="">Select Requirement</option>
                                        {allRequirements.map(req => (
                                            <option key={req.id} value={req.id}>
                                                {req.controlIdReference} - {req.requirementText.substring(0, 50)}...
                                            </option>
                                        ))}
                                    </Form.Select>
                                </FloatingLabel>

                                <Row className="mb-3">
                                    <Form.Group as={Col} md="6" controlId="floatingTaskTitle">
                                        <FloatingLabel label={<><FaInfoCircle className="me-1" />Task Title*</>}>
                                            <Form.Control type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter a concise title for the task" required />
                                        </FloatingLabel>
                                    </Form.Group>
                                    <Form.Group as={Col} md="6" controlId="floatingTaskCategory">
                                        <FloatingLabel label={<><FaTag className="me-1" />Category</>}>
                                            <Form.Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} aria-label="Select task category">
                                                <option value="">Select Category</option>
                                                {taskCategories.map(cat => (
                                                    <option key={cat} value={cat}>
                                                        {cat}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </FloatingLabel>

                                    </Form.Group>
                                </Row>

                                <FloatingLabel controlId="floatingTaskDescription" label="Description" className="mb-3">
                                    <Form.Control as="textarea" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" style={{ height: '100px' }} />
                                </FloatingLabel>

                                <Row className="mb-3">
                                    <Form.Group as={Col} md="6" controlId="evidenceTypesExpected">
                                        {/* <FloatingLabel label="Evidence Types Expected"> */}
                                        <Form.Label><FaBookOpen className="me-1" />Evidence Types Expected</Form.Label>
                                        <CreatableSelect
                                            isMulti
                                            options={evidenceTypeOptions}
                                            value={newEvidenceTypesExpected}
                                            onChange={setNewEvidenceTypesExpected}
                                            placeholder="Select or type to add evidence types..."
                                            isClearable

                                        />
                                        {/* </FloatingLabel> */}
                                        <Form.Text muted>Specify the types of evidence typically required for this task.</Form.Text>
                                    </Form.Group>
                                    <Form.Group as={Col} md="6" controlId="defaultPriority">
                                        <FloatingLabel label="Default Priority">
                                            <Form.Select
                                                value={newDefaultPriority}
                                                onChange={(e) => setNewDefaultPriority(e.target.value)}
                                            >
                                                <option value="">Select Default Priority</option>
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Critical">Critical</option>
                                            </Form.Select>
                                        </FloatingLabel>
                                        <Form.Text muted>Set a default priority for instances created from this task template.</Form.Text>
                                    </Form.Group>
                                </Row>

                                <Form.Group className="mb-3" controlId="linkedDocuments">
                                    <Form.Label><FaBookOpen className="me-1" />Link Documents</Form.Label>
                                    <Select
                                        isMulti
                                        options={allDocuments.map(doc => ({ value: doc.id, label: `${doc.name} (${doc.document_type})` }))}
                                        value={newLinkedDocumentIDs}
                                        onChange={setNewLinkedDocumentIDs}
                                        placeholder="Select documents to link..."
                                        isClearable
                                    />
                                    <Form.Text muted>Associate relevant policies, procedures, or regulatory documents with this task.</Form.Text>
                                </Form.Group>


                                <Accordion className="mb-3">
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header><FaCogs className="me-2" />Optional: Automated Check Details</Accordion.Header>
                                        <Accordion.Body>
                                            <FloatingLabel controlId="floatingCheckType" label="Check Type" className="mb-3">
                                                <Form.Select value={newCheckType} onChange={handleCheckTypeChange}>
                                                    <option value="">Select Check Type</option>
                                                    {Object.entries(checkTypeConfigurations).map(([key, config]) => (
                                                        <option key={key} value={key}>{config.label}</option>
                                                    ))}
                                                </Form.Select>
                                                <Form.Text muted>Identifier for the type of automated check (e.g., `api_health`, `port_scan`).</Form.Text>
                                            </FloatingLabel>

                                            {newCheckType && checkTypeConfigurations[newCheckType] && (
                                                <>
                                                    {checkTypeConfigurations[newCheckType].targetType === 'connected_system' && (
                                                        <FloatingLabel controlId="floatingCheckTargetSystem" label={checkTypeConfigurations[newCheckType].targetLabel || "Target Connected System"} className="mb-3">
                                                            <Form.Select value={newCheckTarget} onChange={(e) => setNewCheckTarget(e.target.value)} required>
                                                                <option value="">Select Connected System</option>
                                                                {allConnectedSystems.map(system => (
                                                                    <option key={system.id} value={system.id}>{system.name} ({system.systemType})</option>
                                                                ))}
                                                            </Form.Select>
                                                            <Form.Text muted>Select the pre-configured system to target.</Form.Text>
                                                        </FloatingLabel>
                                                    )}
                                                    {(checkTypeConfigurations[newCheckType].targetType === 'ip_address_or_hostname' || checkTypeConfigurations[newCheckType].targetType === 'script_path') && (
                                                        <FloatingLabel controlId="floatingCheckTargetDirect" label={checkTypeConfigurations[newCheckType].targetLabel || "Target"} className="mb-3">
                                                            <Form.Control type="text" value={newCheckTarget} onChange={(e) => setNewCheckTarget(e.target.value)} placeholder={checkTypeConfigurations[newCheckType].targetPlaceholder || "Enter target details"} required />
                                                            <Form.Text muted>{checkTypeConfigurations[newCheckType].targetHelpText || 'Enter the target for the check.'}</Form.Text>
                                                        </FloatingLabel>
                                                    )}


                                                    {checkTypeConfigurations[newCheckType].parameters.map(paramDef => (
                                                        <FloatingLabel key={paramDef.name} controlId={`floatingParam-${paramDef.name}`} label={`${paramDef.label}${paramDef.required ? '*' : ''}`} className="mb-3">
                                                            {paramDef.type === 'select' ? (
                                                                <Form.Select
                                                                    value={newCheckParams[paramDef.name] || ''}
                                                                    onChange={(e) => handleParamChange(paramDef.name, e.target.value, paramDef)}
                                                                    required={paramDef.required}
                                                                >
                                                                    <option value="">Select {paramDef.label}</option>
                                                                    {paramDef.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                </Form.Select>
                                                            ) : paramDef.type === 'textarea' ? (
                                                                <Form.Control
                                                                    as="textarea"


                                                                    value={paramDef.name === 'script_args' && Array.isArray(newCheckParams[paramDef.name])
                                                                        ? JSON.stringify(newCheckParams[paramDef.name])
                                                                        : (newCheckParams[paramDef.name] || '')}
                                                                    onChange={(e) => handleParamChange(paramDef.name, e.target.value, paramDef)}
                                                                    placeholder={paramDef.placeholder}
                                                                    required={paramDef.required}
                                                                    style={{ height: '80px' }}
                                                                />
                                                            ) : (
                                                                <Form.Control
                                                                    type={paramDef.type}
                                                                    value={newCheckParams[paramDef.name] || ''}
                                                                    onChange={(e) => handleParamChange(paramDef.name, e.target.value, paramDef)}
                                                                    placeholder={paramDef.placeholder}
                                                                    required={paramDef.required}
                                                                />
                                                            )}
                                                            {paramDef.helpText && <Form.Text muted>{paramDef.helpText}</Form.Text>}
                                                        </FloatingLabel>
                                                    ))}
                                                </>
                                            )}
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>

                                <Button variant="primary" type="submit" className="me-2">
                                    {editingTaskId ? <><FaEdit className="me-1" />Update Task</> : <><FaPlusCircle className="me-1" />Add Task</>}
                                </Button>
                                {editingTaskId && (
                                    <Button variant="outline-secondary" onClick={handleCancelEdit}><FaWindowClose className="me-1" />Cancel Edit</Button>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="existing" title={<><FaListUl className="me-1" />Existing Tasks</>}>
                    {filteredTasks.length === 0 && tasks.length > 0 && (selectedStandardIdForFilter || selectedRequirementIdForFilter) &&
                        <Alert variant="warning">No tasks match the current filter criteria.</Alert>
                    }
                    {filteredTasks.length === 0 && tasks.length === 0 && <Alert variant="info">No tasks found.</Alert>}
                    {/* <ListGroup variant="flush"> */}
                    {filteredTasks.map(task => {
                        const requirement = getRequirementDetailsById(task.requirementId);
                        const standardName = requirement ? getStandardNameByStandardId(requirement.standardId) : null;

                        return (
                            <Card key={task.id} className="mb-3">

                                <Card.Header>
                                    <div className='mb-2'>
                                        {getCategoryIcon(task.category)}
                                        {task.defaultPriority && (
                                            <>
                                                <Badge className='ms-2' bg={getPriorityBadgeColor(task.defaultPriority)}>{task.defaultPriority}</Badge>
                                            </>
                                        )}

                                        {task.category && <Badge pill bg="light" className="mx-1"><FaTag className="me-1" />{task.category}</Badge>}


                                    </div>
                                    <div className="d-flex align-items-start justify-content-between">
                                        <div className="d-flex justify-content-between">

                                            <div className=''>
                                                <div><strong className="text-primary mb-0">{task.title}</strong></div>

                                                <small className='text-muted'>
                                                    ID: {task.id}
                                                    {task.category && <> <span className="mx-1">|</span> <FaTag className="me-1" />Category: {task.category}</>}
                                                    {task.requirementId && requirement && (
                                                        <>
                                                            <span className="mx-1">|</span> <FaClipboardList className="me-1" />
                                                            Requirement:
                                                            <OverlayTrigger
                                                                placement="top"
                                                                delay={{ show: 250, hide: 400 }}
                                                                overlay={
                                                                    <Popover id={`popover-req-details-${task.id}`}>
                                                                        <Popover.Header as="h3">{requirement.controlIdReference}</Popover.Header>
                                                                        <Popover.Body>
                                                                            <strong>Standard:</strong> {standardName || 'N/A'}<br />
                                                                            <strong>Text:</strong> {requirement.requirementText.substring(0, 150)}...
                                                                        </Popover.Body>
                                                                    </Popover>
                                                                }
                                                            >
                                                                <span className="text-primary" style={{ cursor: 'pointer' }}> {requirement.controlIdReference}</span>
                                                            </OverlayTrigger>
                                                            {standardName && ` (${standardName.split('(')[1]?.replace(')', '') || standardName})`}
                                                        </>
                                                    )}


                                                </small>
                                            </div>
                                        </div>
                                        <div><Button variant='outline-primary' className='btn-sm' onClick={() => handleEditTask(task)}>Edit Task</Button></div>

                                    </div>
                                </Card.Header>
                                <Card.Body>

                                    {task.description && <p className="">{task.description}</p>}

                                </Card.Body>

                                <ListGroup>
                                    <ListGroupItem>
                                        <div>
                                            <FaTag className="me-1" /><strong>Expected Evidence:</strong><br />

                                            {task.evidenceTypesExpected && task.evidenceTypesExpected.length > 0 ?
                                                task.evidenceTypesExpected.map((evidenceType, index) => (
                                                    <React.Fragment key={evidenceType}>
                                                        <Badge variant="secondary" className='fw-normal bg-light text-dark me-1'>{evidenceType}</Badge>
                                                    </React.Fragment>
                                                )) : ' N/A'}

                                        </div>
                                    </ListGroupItem>

                                    {task.checkType && (
                                        <ListGroupItem>
                                            <FaCogs className="me-1" /><strong>Automated Check:</strong> {task.checkType} on {task.target || 'N/A'}
                                            <small className="d-block"><strong>Parameters:</strong> {task.parameters ? JSON.stringify(task.parameters) : 'None'}</small>
                                        </ListGroupItem>
                                    )}


                                    {task.linked_documents && task.linked_documents.length > 0 && (
                                        <ListGroupItem>
                                            <FaBookOpen className="me-1" /><strong>Linked Documents:</strong>
                                            <ul className="list-unstyled list-inline mb-0">
                                                {task.linked_documents.map(doc => (
                                                    <li key={doc.id} className="list-inline-item"><Badge bg="light" text="dark" className="border me-1">{doc.name}</Badge></li>
                                                ))}
                                            </ul>
                                        </ListGroupItem>
                                    )}

                                </ListGroup>



                            </Card>
                        );
                    })}
                    {/* </ListGroup> */}
                </Tab>
            </Tabs>

        </div >
    );
}

const getPriorityBadgeColor = (priority) => {
    switch (priority?.toLowerCase()) {
        case 'critical': return 'danger';
        case 'high': return 'warning';
        case 'medium': return 'info';
        case 'low': return 'secondary';
        default: return 'light';
    }
};


export default Tasks;
