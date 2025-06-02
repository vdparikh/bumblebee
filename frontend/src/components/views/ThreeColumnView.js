import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaShieldAlt, FaFileContract, FaTasks, FaTag, FaCogs, FaExclamationCircle, FaFileMedicalAlt } from 'react-icons/fa';
import {
    getComplianceStandards,
    getRequirements as getAllRequirements, 
    getTasks as getAllMasterTasks, 
} from '../../services/api';

function ThreeColumnView() {
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
            const filteredTasks = Array.isArray(response.data) ? response.data.filter(task => task.requirementId === requirementId) : [];
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
                        const filtered = allTasks.filter(task => requirementIds.includes(task.requirementId));
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
        <Container fluid className="p-3">
            <h2 className="mb-4">Compliance Management - Read Only View</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Row>
                
                <Col md={3}>
                    <Card className="h-100">
                        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                            <span><FaShieldAlt className="me-2" />Standards ({standards.length})</span>
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            {loadingStandards ? (
                                <ListGroup.Item className="text-center"><Spinner animation="border" size="sm" /> Loading Standards...</ListGroup.Item>
                            ) : standards.length > 0 ? (
                                standards.map(std => (
                                    <ListGroup.Item
                                        key={std.id}
                                        action
                                        active={selectedStandardId === std.id}
                                        onClick={() => handleStandardSelect(std.id)}
                                        className="d-flex justify-content-between align-items-center"
                                    >
                                        <div>
                                            <strong>{std.name}</strong> ({std.shortName})
                                            <small className="d-block text-muted">{std.description?.substring(0, 70)}...</small>
                                        </div>
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
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            {!selectedStandardId ? (
                                <ListGroup.Item>Select a standard to see its requirements.</ListGroup.Item>
                            ) : loadingRequirements ? (
                                <ListGroup.Item className="text-center"><Spinner animation="border" size="sm" /> Loading Requirements...</ListGroup.Item>
                            ) : requirements.length > 0 ? (
                                requirements.map(req => (
                                    <ListGroup.Item
                                        key={req.id}
                                        action
                                        active={selectedRequirementId === req.id}                                        onClick={() => handleRequirementSelect(req.id)}
                                        className="d-flex justify-content-between align-items-center"
                                    >
                                        <div>
                                            <div className="fw-bold">{req.controlIdReference}</div>
                                            <p className="mb-1 small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                                {req.requirementText}
                                            </p>
                                            
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
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                           {loadingTasks ? (
                                <ListGroup.Item className="text-center"><Spinner animation="border" size="sm" /> Loading Tasks...</ListGroup.Item>
                            ) : !selectedStandardId ? ( 
                                <ListGroup.Item>Select a standard to see related tasks.</ListGroup.Item>
                            ) : tasks.length > 0 ? (
                                tasks.map(task => (
                                    <ListGroup.Item
                                        key={task.id}
                                        
                                        className="d-flex justify-content-between align-items-center"
                                    >
                                        <div>
                                            <div className="fw-bold">{task.title}</div>
                                            {task.description && <p className="mb-1 small text-muted">{task.description}</p>}
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
                                                    <FaCogs className="me-1"/> Automated: {task.checkType} on {task.target || 'N/A'}
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