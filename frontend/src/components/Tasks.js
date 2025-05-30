import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    getTasks, 
    createTask, 
    updateTask, 
    getRequirements, 
    getUsers, 
    getComplianceStandards 
} from '../services/api';
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
import Tab from 'react-bootstrap/Tab';
import Select from 'react-select'; // Import react-select
import Badge from 'react-bootstrap/Badge';
import Dropdown from 'react-bootstrap/Dropdown'; // Added for action menu

import {
    FaTasks as FaTasksIcon,
    FaPlusCircle,
    FaListUl,
    FaInfoCircle,
    // FaUserShield, // Removed as Owner is not shown in list
    // FaUserCheck, // Removed as Assignee is not shown in list
    // FaCalendarAlt, // Removed as Due Date is not shown in list
    FaTag,
    FaClipboardList,
    FaCogs,
    FaCalendarAlt,
    FaUserShield,
    FaUserCheck,
    // FaPlayCircle, // Not used in this simplified view
    // FaSpinner, // Status icons removed from list
    // FaHourglassHalf, // Status icons removed from list
    // FaTimesCircle, // Status icons removed from list
    // FaRegFileAlt, // Status icons removed from list
    FaEdit,
    FaWindowClose,
    FaEllipsisV, // Added for action menu
    // FaCheckCircle, // Status icons removed from list
    FaFileSignature, // For Policy category
    FaShieldAlt, // For Data Security category
    FaFileContract // For Vulnerability Management category
} from 'react-icons/fa';

function Tasks() {
    const [tasks, setTasks] = useState([]);
    
    // Form state for creating/editing a task
    const [newTitle, setNewTitle] = useState('');
    // Define fixed categories
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
    const [newCheckParams, setNewCheckParams] = useState(''); 
    const [newEvidenceTypesExpected, setNewEvidenceTypesExpected] = useState([]); // For react-select
    const [newDefaultPriority, setNewDefaultPriority] = useState('');
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Available options for EvidenceTypesExpected
    const [allStandards, setAllStandards] = useState([]);
    const [allRequirements, setAllRequirements] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    
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

    const fetchTasks = useCallback(async () => {
        try {
            const response = await getTasks(); // Assuming getTasks without params fetches all
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
        setNewCategory(''); // Reset to empty or a default category if desired
        setNewOwnerUserId('');
        setNewAssigneeUserId('');
        setNewStatus('Open');
        setNewDueDate('');
        setNewRequirementId('');
        setNewCheckType('');
        setNewCheckTarget('');
        setNewCheckParams('');
        setNewEvidenceTypesExpected([]);
        setNewDefaultPriority('');
    };

    const handleSubmitTask = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) { // OwnerUserID and Status are removed from master task
            setError("Title is required.");
            setSuccess('');
            return;
        }
        let params = null;
        try {
            if (newCheckParams.trim()) {
                params = JSON.parse(newCheckParams);
            }
        } catch (error) {
            setError("Invalid JSON for parameters. Please use a valid JSON string or leave empty.");
            setSuccess('');
            return;
        }

        const taskData = {
            title: newTitle.trim(),
            description: newDescription.trim(),
            category: newCategory, // Category is now from dropdown
            // ownerUserId: ownerUserId, // Removed
            // assigneeUserId: newAssigneeUserId.trim() || null, // Removed
            // status: newStatus.trim(), // Removed
            // dueDate: newDueDate ? new Date(newDueDate).toISOString() : null,  // Removed
            requirementId: newRequirementId.trim() || null,
            checkType: newCheckType.trim() || null,
            target: newCheckTarget.trim() || null,
            parameters: params, 
            evidenceTypesExpected: newEvidenceTypesExpected.map(option => option.value), // Get array of strings
            defaultPriority: newDefaultPriority.trim() || null,
        };
        
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
        setNewCategory(task.category || ''); // Set to existing category or default
        // setNewOwnerUserId(task.ownerUserId || ''); // Removed
        // setNewAssigneeUserId(task.assigneeUserId || ''); // Removed
        // setNewStatus(task.status || 'Open'); // Removed
        // setNewDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''); // Removed
        setNewRequirementId(task.requirementId || '');
        setNewCheckType(task.checkType || '');
        setNewCheckTarget(task.target || '');
        setNewCheckParams(task.parameters ? JSON.stringify(task.parameters, null, 2) : '');
        // Convert string array from task.evidenceTypesExpected to {value, label} for react-select
        setNewEvidenceTypesExpected(task.evidenceTypesExpected ? task.evidenceTypesExpected.map(et => ({ value: et, label: evidenceTypeOptions.find(opt => opt.value === et)?.label || et })) : []);
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

    const getUserDetails = (userId) => { // Moved here as it's only used by renderUserWithPopover now
        if (!userId || !allUsers || allUsers.length === 0) return null;
        return allUsers.find(user => user.id === userId);
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Asset Management':
                return <FaTag size="1.5em" className="text-info" title="Asset Management" />;
            case 'Configuration Management':
                return <FaCogs size="1.5em" className="text-primary" title="Configuration Management" />;
            case 'Data Security':
                return <FaShieldAlt size="1.5em" className="text-success" title="Data Security" />;
            case 'Vulnerability Management':
                return <FaFileContract size="1.5em" className="text-warning" title="Vulnerability Management" />;
            case 'Audit':
                return <FaClipboardList size="1.5em" className="text-secondary" title="Audit" />;
            case 'Policy':
                return <FaFileSignature size="1.5em" className="text-danger" title="Policy" />;
            default:
                return <FaTasksIcon size="1.5em" className="text-muted" title={category || "Task"} />;
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
            <h2 className="mb-4"><FaTasksIcon className="me-2"/>Compliance Tasks</h2>

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
                                            {req.controlIdReference} - {req.requirementText.substring(0,30)}...
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
                        {selectedStandardIdForFilter && <Badge bg="info" className="ms-2 me-1">{allStandards.find(s=>s.id === selectedStandardIdForFilter)?.name || 'Standard'}</Badge>}
                        {selectedRequirementIdForFilter && <Badge bg="info" className="ms-2 me-1">{allRequirements.find(r=>r.id === selectedRequirementIdForFilter)?.controlIdReference || 'Requirement'}</Badge>}
                    </span>
                </Alert>
            )}

            <Tabs activeKey={activeTabKey} onSelect={(k) => setActiveTabKey(k)} id="tasks-tabs" className="mb-3 nav-line-tabs">
                <Tab eventKey="create" title={<><FaPlusCircle className="me-1"/>{editingTaskId ? 'Edit Task' : 'Create New Task'}</>}>
                    <Card className="mb-4">
                        <Card.Body>
                            <Form onSubmit={handleSubmitTask}>


                                <FloatingLabel controlId="floatingRequirementId" label={<><FaClipboardList className="me-1"/>Requirement</>} className="mb-3">
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
                                        <FloatingLabel label={<><FaInfoCircle className="me-1"/>Task Title*</>}>
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
                                        <Form.Label>Evidence Types Expected</Form.Label>
                                        <Select
                                            isMulti
                                            options={evidenceTypeOptions}
                                            value={newEvidenceTypesExpected}
                                            onChange={setNewEvidenceTypesExpected}
                                            placeholder="Select or type to add evidence types..."
                                            isClearable
                                            isSearchable
                                            // To allow creating new tags (if desired, requires more setup with CreatableSelect from react-select)
                                            // components={{ DropdownIndicator: null }} // Example for tag-like input
                                        />
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
        
        
                                <Accordion className="mb-3">
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header><FaCogs className="me-2"/>Optional: Automated Check Details</Accordion.Header>
                                        <Accordion.Body>
                                            <FloatingLabel controlId="floatingCheckType" label="Check Type" className="mb-3">
                                                <Form.Control type="text" value={newCheckType} onChange={(e) => setNewCheckType(e.target.value)} placeholder="Check Type (e.g., file_exists)" />
                                                <Form.Text muted>Identifier for the type of automated check (e.g., `api_health`, `port_scan`).</Form.Text>
                                            </FloatingLabel>
                                            <FloatingLabel controlId="floatingCheckTarget" label="Target" className="mb-3">
                                                <Form.Control type="text" value={newCheckTarget} onChange={(e) => setNewCheckTarget(e.target.value)} placeholder="Target (e.g., 127.0.0.1)" />
                                                <Form.Text muted>The target system or endpoint for the check (e.g., IP address, hostname, URL).</Form.Text>
                                            </FloatingLabel>
                                            <FloatingLabel controlId="floatingCheckParams" label="Parameters (JSON)">
                                                <Form.Control as="textarea" value={newCheckParams} onChange={(e) => setNewCheckParams(e.target.value)} placeholder='e.g., {"filePath":"/path/to/file"}' style={{ height: '100px' }}/>
                                                <Form.Text muted>Provide parameters as a valid JSON object. E.g., <code>{`{"port": 80, "timeout": 5000}`}</code></Form.Text>
                                            </FloatingLabel>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
        
                                <Button variant="primary" type="submit" className="me-2">
                                    {editingTaskId ? <><FaEdit className="me-1"/>Update Task</> : <><FaPlusCircle className="me-1"/>Add Task</>}
                                </Button>
                                {editingTaskId && (
                                    <Button variant="outline-secondary" onClick={handleCancelEdit}><FaWindowClose className="me-1"/>Cancel Edit</Button>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="existing" title={<><FaListUl className="me-1"/>Existing Tasks</>}>
                    {filteredTasks.length === 0 && tasks.length > 0 && (selectedStandardIdForFilter || selectedRequirementIdForFilter) &&
                        <Alert variant="warning">No tasks match the current filter criteria.</Alert>
                    }
                    {filteredTasks.length === 0 && tasks.length === 0 && <Alert variant="info">No tasks found.</Alert>}
                    <ListGroup variant="flush">
                        {filteredTasks.map(task => {
                            const requirement = getRequirementDetailsById(task.requirementId);
                            const standardName = requirement ? getStandardNameByStandardId(requirement.standardId) : null;

                            return (
                                <ListGroup.Item key={task.id} className=" p-3">
                                    <Row className="align-items-start">
                                        <Col xs="auto" className="pe-2 d-flex align-items-center pt-1">                                           
                                            {getCategoryIcon(task.category)}
                                        </Col>
                                        <Col>
                                            <h5 className="mb-1">{task.title}</h5>
                                            {task.description && <p className="mb-1 ">{task.description}</p>}
                                            <small className="text-muted d-block mt-1">
                                                ID: {task.id} 
                                                {task.category && <> <span className="mx-1">|</span> <FaTag className="me-1"/>Category: {task.category}</>}
                                                {task.requirementId && requirement && (
                                                    <>
                                                        <span className="mx-1">|</span> <FaClipboardList className="me-1"/>
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
                                                            <span className="text-primary" style={{cursor: 'pointer'}}> {requirement.controlIdReference}</span>
                                                        </OverlayTrigger>
                                                        {standardName && ` (${standardName.split('(')[1]?.replace(')','') || standardName})`}
                                                    </>
                                                )}
                                                {task.defaultPriority && (
                                                    <>
                                                        <span className="mx-1">|</span> Priority: <Badge bg="secondary">{task.defaultPriority}</Badge>
                                                    </>
                                                )}
                                                {task.evidenceTypesExpected && task.evidenceTypesExpected.length > 0 && (
                                                    <><span className="mx-1">|</span> Expected Evidence: {task.evidenceTypesExpected.join(', ')}</>
                                                )}
                                            </small>
                                            
                                            {task.checkType && (
                                                <div className="mt-2 p-2 bg-light border rounded">
                                                    <small><FaCogs className="me-1"/><strong>Automated Check:</strong> {task.checkType} on {task.target || 'N/A'}</small>
                                                    <small className="d-block"><strong>Parameters:</strong> {task.parameters ? JSON.stringify(task.parameters) : 'None'}</small>
                                                </div>
                                            )}
                                        </Col>
                                        <Col xs="auto" className="text-end">
                                            <div className="d-flex align-items-center">

                                                <Button variant='outline-primary' className='btn-sm' onClick={() => handleEditTask(task)}>Edit Task</Button>

                                                {/* Status Badge removed from list view */}
                                                {/* <Dropdown>
                                                    <Dropdown.Toggle variant="link" id={`dropdown-task-actions-${task.id}`} className="p-0 text-secondary no-caret">
                                                        <FaEllipsisV size="1.2em" />
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu align="end">
                                                        <Dropdown.Item className='small' onClick={() => handleEditTask(task)}>Edit Task</Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown> */}
                                            </div>
                                        </Col>
                                    </Row>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                </Tab>
            </Tabs>
                        
        </div>
    );
}

export default Tasks;
