import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, ListGroup, Spinner, Alert, Badge, ListGroupItem, Button } from 'react-bootstrap';
import {
    FaShieldAlt, FaFileContract, FaTasks, FaTag, FaCogs,
    FaExclamationCircle, FaFileMedicalAlt, FaInfo, FaLink, FaPlusCircle
} from 'react-icons/fa';
import {
    getComplianceStandards,
    getRequirements as getAllRequirements,
    getTasks as getAllMasterTasks,
} from '../../services/api';
import PageHeader from '../common/PageHeader';

function ThreeColumnView({
    standardActions,
    requirementActions, // New: Actions for requirements (e.g., Edit button)
    taskActions,        // New: Actions for tasks (e.g., Edit button)
    onAddStandardClick,    // New: Handler for Add Standard button
    onAddRequirementClick, // New: Handler for Add Requirement button
    onAddTaskClick,        // New: Handler for Add Task button
    showPageHeader = true
}) {
    const [standards, setStandards] = useState([]);
    const [requirements, setRequirements] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [loadingStandards, setLoadingStandards] = useState(true);
    const [loadingRequirements, setLoadingRequirements] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [error, setError] = useState('');

    const [selectedStandardId, setSelectedStandardId] = useState(null);
    const [selectedRequirementId, setSelectedRequirementId] = useState(null);

    const fetchStandards = useCallback(async () => {
        setLoadingStandards(true);
        try {
            const response = await getComplianceStandards();
            setStandards(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Error fetching standards:", err);
            setError('Failed to fetch compliance standards.');
            setStandards([]);
        } finally {
            setLoadingStandards(false);
        }
    }, []);

    useEffect(() => {
        fetchStandards();
    }, [fetchStandards]);

    const fetchRequirementsByStandard = useCallback(async (standardId) => {
        if (!standardId) {
            setRequirements([]);
            return;
        }
        setLoadingRequirements(true);
        setError('');
        try {
            const response = await getAllRequirements();
            const filteredReqs = Array.isArray(response.data) ? response.data.filter(r => r.standardId === standardId) : [];
            setRequirements(filteredReqs);
        } catch (err) {
            console.error(`Error fetching requirements for standard ${standardId}:`, err);
            setError('Failed to fetch requirements.');
        } finally {
            setLoadingRequirements(false);
        }
    }, []);

    const fetchTasksByRequirement = useCallback(async (requirementId) => {
        if (!requirementId) {
            setTasks([]);
            return;
        }
        setLoadingTasks(true);
        setError('');
        try {
            const response = await getAllMasterTasks();
            const filteredTasks = Array.isArray(response.data) ? response.data.filter(task => 
                task.requirementIds && task.requirementIds.includes(requirementId)
            ) : [];
            setTasks(filteredTasks);
        } catch (err) {
            console.error(`Error fetching tasks for requirement ${requirementId}:`, err);
            setError('Failed to fetch tasks.');
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    const handleStandardSelect = (standardId) => {
        const newSelectedStandardId = selectedStandardId === standardId ? null : standardId;
        setSelectedStandardId(newSelectedStandardId);
        setSelectedRequirementId(null);
        setTasks([]);
        if (newSelectedStandardId) {
            fetchRequirementsByStandard(newSelectedStandardId);
        } else {
            setRequirements([]);
        }
    };

    const handleRequirementSelect = (requirementId) => {
        const newSelectedRequirementId = selectedRequirementId === requirementId ? null : requirementId;
        setSelectedRequirementId(newSelectedRequirementId);
        if (newSelectedRequirementId) {
            fetchTasksByRequirement(newSelectedRequirementId);
        } else {
            setTasks([]);
        }
    };

    useEffect(() => {
        if (selectedRequirementId) {
            fetchTasksByRequirement(selectedRequirementId);
        } else if (selectedStandardId && !loadingRequirements && requirements.length > 0) {
            const requirementIds = requirements.map(r => r.id);
            if (requirementIds.length > 0) {
                setLoadingTasks(true);
                getAllMasterTasks()
                    .then(response => {
                        const allTasks = Array.isArray(response.data) ? response.data : [];
                        const filtered = allTasks.filter(task => 
                            task.requirementIds && task.requirementIds.some(id => requirementIds.includes(id))
                        );
                        setTasks(filtered);
                    })
                    .catch(err => {
                        console.error(`Error fetching tasks for standard's requirements:`, err);
                        setError('Failed to fetch tasks for the standard.');
                        setTasks([]);
                    })
                    .finally(() => {
                        setLoadingTasks(false);
                    });
            } else {
                setTasks([]);
            }
        } else if (selectedStandardId && !loadingRequirements && requirements.length === 0) {
            setTasks([]);
        } else {
            setTasks([]);
        }
    }, [selectedStandardId, selectedRequirementId, requirements, loadingRequirements, getAllMasterTasks, fetchTasksByRequirement]);

    const getPriorityBadgeColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'critical': return 'danger';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'secondary';
            default: return 'light';
        }
    };


    return (
        <Container fluid className="">
            {showPageHeader && (
                <PageHeader icon={<FaInfo />} title="Compliance Management - Library" />
            )}

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Row>

                <Col md={3}>
                    <Card className="h-100">
                        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                            <span><FaShieldAlt className="me-2" />Standards ({standards.length})</span>
                            {onAddStandardClick && (
                                <Button  className='nopadding text-success' variant="transparent" size="sm" onClick={onAddStandardClick} title="Add Standard">
                                    <FaPlusCircle />
                                </Button>
                            )}
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                            {loadingStandards ? (
                                <ListGroup.Item className="text-center"><Spinner animation="border" size="sm" /> Loading Standards...</ListGroup.Item>
                            ) : standards.length > 0 ? (
                                standards.map(std => (
                                    <ListGroup.Item
                                        key={std.id}
                                        action
                                        active={selectedStandardId === std.id}
                                        onClick={() => handleStandardSelect(std.id)}
                                        className=""
                                    >
                                        <div className='d-flex justify-content-between align-items-center'>
                                            <div>
                                                <strong>{std.name}</strong> ({std.shortName})
                                                <small className="d-block text-muted">{std.description?.substring(0, 70)}...</small>
                                            </div>
                                            {standardActions && ( // Conditionally render actions
                                                <div className="ms-2">{standardActions(std)}</div>
                                            )}
                                        </div>
                                        <ListGroup className="mt-2">
                                            {std.version && <ListGroupItem><small className="text-muted"><strong>Version:</strong> {std.version}</small></ListGroupItem>}
                                            {std.issuing_body && <ListGroupItem><small className="text-muted"><strong>Issuing Body:</strong> {std.issuing_body}</small></ListGroupItem>}

                                            {std.official_link && (
                                                <ListGroupItem>
                                                    <small className="text-muted">
                                                        <strong>Official Document: </strong>
                                                        <a href={std.official_link} target="_blank" rel="noopener noreferrer">
                                                            Link <FaLink size="0.8em" />
                                                        </a>
                                                    </small>
                                                </ListGroupItem>
                                            )}
                                        </ListGroup>
                                    </ListGroup.Item>
                                ))
                            ) : (
                                <ListGroup.Item>No standards found.</ListGroup.Item>
                            )}
                        </ListGroup>
                    </Card>
                </Col>


                <Col md={4}>
                    <Card className="h-100">
                        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                            <span><FaFileContract className="me-2" />Requirements ({requirements.length})</span>
                            {onAddRequirementClick && selectedStandardId && (
                                <Button className='nopadding text-success' variant="transparent" size="sm" onClick={() => onAddRequirementClick(selectedStandardId)} title="Add Requirement">
                                    <FaPlusCircle />
                                </Button>
                            )}
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                            {!selectedStandardId ? (
                                <ListGroup.Item>Select a standard to see its requirements.</ListGroup.Item>
                            ) : loadingRequirements ? (
                                <ListGroup.Item className="text-center"><Spinner animation="border" size="sm" /> Loading Requirements...</ListGroup.Item>
                            ) : requirements.length > 0 ? (
                                requirements.map(req => (
                                    <ListGroup.Item
                                        key={req.id}
                                        action
                                        active={selectedRequirementId === req.id} onClick={() => handleRequirementSelect(req.id)}
                                        className="" // Remove d-flex for better layout with actions
                                    >
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="fw-bold">{req.controlIdReference}</div>
                                                {standards.find(s => s.id === req.standardId) && (
                                                    <Badge bg="light" text="dark" className="mb-1 border me-1 fw-normal">
                                                        {standards.find(s => s.id === req.standardId)?.shortName}
                                                    </Badge>
                                                )}
                                                <p className="mb-1 small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {req.requirementText.substring(0, 150)}{req.requirementText.length > 150 ? "..." : ""}
                                                </p>
                                            </div>
                                            {requirementActions && <div className="ms-2">{requirementActions(req)}</div>}
                                        </div>
                                    </ListGroup.Item>
                                ))
                            ) : (
                                <ListGroup.Item>No requirements found for the selected standard.</ListGroup.Item>
                            )}
                        </ListGroup>
                    </Card>
                </Col>


                <Col md={5}>
                    <Card className="h-100">
                        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                            <span><FaTasks className="me-2" />Tasks ({tasks.length})</span>
                            {onAddTaskClick && selectedRequirementId && (
                                <Button className='nopadding text-success' variant="transparent" size="sm" onClick={() => onAddTaskClick(selectedRequirementId)} title="Add Task">
                                    <FaPlusCircle />
                                </Button>
                            )}
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                            {loadingTasks ? (
                                <ListGroup.Item className="text-center"><Spinner animation="border" size="sm" /> Loading Tasks...</ListGroup.Item>
                            ) : !selectedStandardId ? ( // Case 1: No standard selected
                                <ListGroup.Item>Select a standard to view requirements and tasks.</ListGroup.Item>
                            ) : !selectedRequirementId ? ( // Case 2: Standard selected, but no requirement selected
                                <ListGroup.Item>Select a requirement to view its tasks.</ListGroup.Item>

                            ) : tasks.length > 0 ? (
                                tasks.map(task => (
                                    <ListGroup.Item
                                        key={task.id}

                                        className=""
                                    >
                                        <div>
                                                                                            <div className="fw-bold">{task.title}</div>

                                            <div className="d-flex justify-content-between align-items-center">
                                            {task.description && <p className="mb-1 small text-muted">{task.description}</p>}

                                                {taskActions && <div className="ms-2 flex-shrink-0">{taskActions(task)}</div>}

                                            </div>
                                            <div className="mt-1">
                                                {task.category && <Badge pill bg="light" text="dark" className="me-1 border"><FaTag className="me-1" />{task.category}</Badge>}
                                                {task.defaultPriority && (
                                                    <Badge pill bg={getPriorityBadgeColor(task.defaultPriority)} className="me-1">
                                                        <FaExclamationCircle className="me-1" />{task.defaultPriority}
                                                    </Badge>
                                                )}
                                            </div>

                                            {task.evidenceTypesExpected && task.evidenceTypesExpected.length > 0 && (
                                                <div className="mt-1">
                                                    <FaFileMedicalAlt className="me-1 text-muted" title="Expected Evidence" />
                                                    {task.evidenceTypesExpected.map(et => <Badge key={et} pill bg="secondary" text="white" className="me-1 fw-normal">{et}</Badge>)}
                                                </div>
                                            )}
                                            {task.checkType && (
                                                <div className="mt-1 small text-muted">
                                                    <FaCogs className="me-1" /> Automated: {task.checkType} on {task.target || 'N/A'}
                                                </div>
                                            )}
                                        </div>
                                    </ListGroup.Item>
                                ))
                            ) : (
                                <ListGroup.Item>No tasks found for the selected requirement.</ListGroup.Item>
                            )}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>

        </Container>
    );
}

export default ThreeColumnView;