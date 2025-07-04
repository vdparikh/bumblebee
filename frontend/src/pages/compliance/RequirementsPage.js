import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getRequirements, createRequirement, updateRequirement, getComplianceStandards, getTasks, createTask, updateTask, linkTaskToRequirements, unlinkTaskFromRequirements } from '../../services/api';
import { getUsers, getConnectedSystems, getDocuments } from '../../services/api';
import { RightPanelContext } from '../../App';
import { Button, Spinner, Alert, Card, ListGroup, Row, Col, Badge, Form, FloatingLabel, InputGroup } from 'react-bootstrap';
import EntityFormPanel from '../../components/forms/EntityFormPanel';
import { FaEdit, FaPlusCircle, FaTasks as FaTasksIcon, FaFileContract, FaTag, FaExclamationCircle, FaCogs, FaLink, FaUnlink, FaCheckCircle } from 'react-icons/fa';
import Modal from 'react-bootstrap/Modal';
import PageHeader from '../../components/ui/PageHeader';

function RequirementsPage() {
    const [requirements, setRequirements] = useState([]);
    const [complianceStandards, setComplianceStandards] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [connectedSystems, setConnectedSystems] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStandardIdForFilter, setSelectedStandardIdForFilter] = useState('');
    const [selectedRequirementId, setSelectedRequirementId] = useState(null);
    const [showAssociatePanel, setShowAssociatePanel] = useState(false);
    const [allTasks, setAllTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loadingAllTasks, setLoadingAllTasks] = useState(false);
    const [showAssociateModal, setShowAssociateModal] = useState(false);
    const [associateModalRequirementId, setAssociateModalRequirementId] = useState(null);
    const { openRightPanel, closeRightPanel } = useContext(RightPanelContext);

    // Fetch all data
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [reqRes, stdRes, taskRes, usersRes, systemsRes, docsRes] = await Promise.all([
                getRequirements(),
                getComplianceStandards(),
                getTasks(),
                getUsers(),
                getConnectedSystems(),
                getDocuments(),
            ]);
            setRequirements(Array.isArray(reqRes.data) ? reqRes.data : []);
            setComplianceStandards(Array.isArray(stdRes.data) ? stdRes.data : []);
            setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
            setConnectedSystems(Array.isArray(systemsRes.data) ? systemsRes.data : []);
            setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
        } catch (err) {
            setError('Failed to load data. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // --- Right Panel Handlers ---
    const handleOpenPanel = (mode, entityType, dataToEdit = null, parentId = null) => {
        openRightPanel('entityForm', {
            title: `${mode === 'add' ? 'Add' : 'Edit'} ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`,
            content: (
                <EntityFormPanel
                    show={true}
                    mode={mode}
                    entityType={entityType}
                    initialData={entityType === 'requirement' && parentId ? { standardId: parentId } : dataToEdit}
                    parentId={parentId}
                    onSave={handleSaveEntity}
                    onClose={closeRightPanel}
                    allStandards={complianceStandards}
                    allRequirements={requirements}
                    allConnectedSystems={connectedSystems}
                    allUsers={users}
                    allDocuments={documents}
                />
            )
        });
    };

    // --- Save Handler ---
    const handleSaveEntity = async (entityType, data, idToUpdate) => {
        try {
            if (entityType === 'requirement') {
                if (idToUpdate) {
                    await updateRequirement(idToUpdate, data);
                } else {
                    await createRequirement(data);
                }
            } else if (entityType === 'task') {
                if (idToUpdate) {
                    await updateTask(idToUpdate, data);
                } else {
                    await createTask(data);
                }
            }
            fetchAll();
            closeRightPanel();
        } catch (err) {
            throw err;
        }
    };

    // --- Associate Task Panel ---
    const openAssociateModal = async (requirementId) => {
        setAssociateModalRequirementId(requirementId);
        setShowAssociateModal(true);
        setLoadingAllTasks(true);
        try {
            const res = await getTasks();
            const all = Array.isArray(res.data) ? res.data : [];
            setAllTasks(all);
            setFilteredTasks(all);
        } catch (err) {
            setError('Failed to load tasks for association. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoadingAllTasks(false);
        }
    };

    // --- Filtered Requirements ---
    const filteredRequirements = selectedStandardIdForFilter
        ? requirements.filter(req => req.standardId === selectedStandardIdForFilter)
        : requirements;

    // --- Associated Tasks for Selected Requirement ---
    const associatedTasks = tasks.filter(task => Array.isArray(task.requirementIds) && selectedRequirementId && task.requirementIds.includes(selectedRequirementId));

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Loading requirements...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    const getStandardNameById = (standardId) => {
        const standard = complianceStandards.find(s => s.id === standardId);
        return standard ? `${standard.name} (${standard.shortName})` : standardId;
    };

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
        <div className="">
            <PageHeader title="Requirements" subtitle="Manage compliance requirements"
            
            actions={<Button variant="primary" className="me-2" onClick={() => handleOpenPanel('add', 'requirement')}><FaPlusCircle className="me-1" />Add Requirement</Button>}
            />
            <Row className="mb-3">
                <Col md={12}>
                    <FloatingLabel controlId="filterStandardExisting" label="Filter by Standard">
                        <Form.Select
                            aria-label="Filter by Standard"
                            value={selectedStandardIdForFilter}
                            onChange={(e) => setSelectedStandardIdForFilter(e.target.value)}
                        >
                            <option value="">All Standards</option>
                            {complianceStandards.map(standard => (
                                <option key={standard.id} value={standard.id}>
                                    {standard.name} ({standard.shortName})
                                </option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
                
            </Row>
            <Row>
                <Col md={5}>
                    <Card className="h-100">
                        <Card.Header as="h5">
                            <FaFileContract className="me-2" />Requirements ({filteredRequirements.length})
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                            {filteredRequirements.length === 0 ? (
                                <ListGroup.Item className="text-muted">
                                    {selectedStandardIdForFilter ? 'No requirements found for the selected standard.' : 'No requirements found.'}
                                </ListGroup.Item>
                            ) : (
                                filteredRequirements.map(req => (
                                    <ListGroup.Item
                                        key={req.id}
                                        action
                                        active={selectedRequirementId === req.id}
                                        onClick={() => setSelectedRequirementId(req.id)}
                                        className="d-flex justify-content-between align-items-center"
                                    >
                                        <div>
                                            <div className="fw-bold">{req.controlIdReference}</div>
                                            <Badge>{getStandardNameById(req.standardId)}</Badge>
                                            <p className="mb-1 small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                                {req.requirementText.substring(0, 70)}...
                                            </p>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <Button variant="outline-warning" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'requirement', req); }} title="Edit Requirement"><FaEdit /></Button>
                                            <Button variant="outline-primary" size="sm" onClick={(e) => { e.stopPropagation(); openAssociateModal(req.id); }} title="Associate Tasks"><FaLink /></Button>
                                        </div>
                                    </ListGroup.Item>
                                ))
                            )}
                        </ListGroup>
                    </Card>
                </Col>
                <Col md={7}>
                    <Card className="h-100">
                        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                            <span><FaTasksIcon className="me-2" />Associated Tasks ({associatedTasks.length})</span>
                            {selectedRequirementId && (
                                <div className="d-flex gap-2">
                                    <Button variant="outline-success" size="sm" onClick={() => handleOpenPanel('add', 'task', null, selectedRequirementId)}>
                                        <FaPlusCircle className="me-1" />Add
                                    </Button>
                                    <Button variant="outline-primary" size="sm" onClick={() => openAssociateModal(selectedRequirementId)}>
                                        <FaLink className="me-1" />Link Existing
                                    </Button>
                                </div>
                            )}
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                            {!selectedRequirementId ? (
                                <ListGroup.Item className="text-muted">Select a requirement to see its associated tasks.</ListGroup.Item>
                            ) : associatedTasks.length === 0 ? (
                                <ListGroup.Item className="text-muted">No tasks found for the selected requirement.</ListGroup.Item>
                            ) : (
                                associatedTasks.map(task => (
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
                                                    <span className="me-1 text-muted" title="Expected Evidence"><FaCogs /></span>
                                                    {task.evidenceTypesExpected.map(et => <Badge key={et} pill bg="secondary" text="white" className="me-1 fw-normal">{et}</Badge>)}
                                                </div>
                                            )}
                                            {task.checkType && (
                                                <div className="mt-1 small text-muted">
                                                    <FaCogs className="me-1" /> Automated: {task.checkType} on {task.target || 'N/A'}
                                                </div>
                                            )}
                                        </div>
                                        <Button variant="outline-warning" size="sm" onClick={() => handleOpenPanel('edit', 'task', task)} title="Edit Task"><FaEdit /></Button>
                                    </ListGroup.Item>
                                ))
                            )}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>

            {/* Associate Task Modal */}
            <Modal show={showAssociateModal} onHide={() => setShowAssociateModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaLink className="me-2" />Associate Tasks with Requirement
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingAllTasks ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                            <p className="mt-2">Loading available tasks...</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-muted mb-3">
                                Select tasks to associate with the current requirement. Tasks can be associated with multiple requirements.
                            </p>
                            <div className="mb-3">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search tasks by title, category, or description..."
                                    onChange={(e) => {
                                        const searchTerm = e.target.value.toLowerCase();
                                        setFilteredTasks(allTasks.filter(task =>
                                            task.title?.toLowerCase().includes(searchTerm) ||
                                            task.category?.toLowerCase().includes(searchTerm) ||
                                            task.description?.toLowerCase().includes(searchTerm)
                                        ));
                                    }}
                                />
                            </div>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {filteredTasks.length > 0 ? (
                                    <ListGroup>
                                        {filteredTasks.map(task => {
                                            const isAlreadyAssociated = Array.isArray(task.requirementIds) && task.requirementIds.includes(associateModalRequirementId);
                                            return (
                                                <ListGroup.Item
                                                    key={task.id}
                                                    className={`d-flex align-items-start ${isAlreadyAssociated ? 'bg-light' : ''}`}
                                                >
                                                    <div className="d-flex align-items-start w-100">
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <h6 className="mb-1 fw-bold">{task.title}</h6>
                                                                {isAlreadyAssociated && (
                                                                    <Badge bg="success" className="small">
                                                                        <FaCheckCircle className="me-1" />Associated
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {task.description && (
                                                                <p className="mb-2 small text-muted">
                                                                    {task.description.substring(0, 150)}
                                                                    {task.description.length > 150 ? "..." : ""}
                                                                </p>
                                                            )}
                                                            <div className="d-flex flex-wrap gap-2 mb-2">
                                                                {task.category && (
                                                                    <Badge bg="info" className="small">
                                                                        <FaTag className="me-1" />{task.category}
                                                                    </Badge>
                                                                )}
                                                                {task.defaultPriority && (
                                                                    <Badge bg={getPriorityBadgeColor(task.defaultPriority)} className="small">
                                                                        <FaExclamationCircle className="me-1" />{task.defaultPriority}
                                                                    </Badge>
                                                                )}
                                                                {task.checkType && (
                                                                    <Badge bg="secondary" className="small">
                                                                        <FaCogs className="me-1" />{task.checkType}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="ms-3">
                                                            {!isAlreadyAssociated ? (
                                                                <Button
                                                                    variant="outline-primary"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await linkTaskToRequirements(task.id, [associateModalRequirementId]);
                                                                            fetchAll();
                                                                            setShowAssociateModal(false);
                                                                        } catch (error) {
                                                                            setError('Failed to associate task. ' + (error.response?.data?.error || error.message));
                                                                        }
                                                                    }}
                                                                >
                                                                    <FaLink className="me-1" />Associate
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await unlinkTaskFromRequirements(task.id, [associateModalRequirementId]);
                                                                            fetchAll();
                                                                            setShowAssociateModal(false);
                                                                        } catch (error) {
                                                                            setError('Failed to remove association. ' + (error.response?.data?.error || error.message));
                                                                        }
                                                                    }}
                                                                >
                                                                    <FaUnlink className="me-1" />Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </ListGroup.Item>
                                            );
                                        })}
                                    </ListGroup>
                                ) : (
                                    <div className="text-center py-4">
                                        <FaTasksIcon size={48} className="text-muted mb-3" />
                                        <p className="text-muted">No tasks found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssociateModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default RequirementsPage;