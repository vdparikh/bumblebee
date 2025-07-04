import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, ListGroup, Spinner, Alert, Badge, Button, Carousel, Modal } from 'react-bootstrap';
import {
    FaShieldAlt, FaFileContract, FaTasks, FaTag, FaCogs,
    FaExclamationCircle, FaFileMedicalAlt, FaInfo, FaLink, FaPlusCircle,
    FaExclamationTriangle, FaCheckCircle, FaClock, FaUserCheck, FaChartLine,
    FaDatabase, FaNetworkWired, FaLock, FaEye, FaServer, FaCloud,
    FaMobile, FaDesktop, FaLaptop, FaTablet, FaShieldVirus, FaUserShield,
    FaFileAlt, FaClipboardCheck, FaSearch, FaTools, FaCode, FaBug,
    FaRocket, FaLightbulb, FaBrain, FaRobot, FaHandshake, FaBalanceScale,
    FaCreditCard, FaBuilding, FaUnlink
} from 'react-icons/fa';
import {
    getComplianceStandards,
    getRequirements as getAllRequirements,
    getTasks as getAllMasterTasks,
    getUsers,
    linkTaskToRequirements,
    unlinkTaskFromRequirements,
} from '../../services/api';
import PageHeader from './PageHeader';
import RiskDetailModal from '../modals/RiskDetailModal';
import { getTaskCategoryIcon } from '../../utils/displayUtils';

function ModernComplianceView({
    standardActions,
    requirementActions,
    taskActions,
    onAddStandardClick,
    onAddRequirementClick,
    onAddTaskClick,
    showPageHeader = true
}) {
    const [standards, setStandards] = useState([]);
    const [requirements, setRequirements] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingStandards, setLoadingStandards] = useState(true);
    const [loadingRequirements, setLoadingRequirements] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [error, setError] = useState('');
    const [showRiskDetailModal, setShowRiskDetailModal] = useState(true);
    const [selectedRiskData, setSelectedRiskData] = useState(null);
    const [selectedStandard, setSelectedStandard] = useState({});
    const [selectedStandardId, setSelectedStandardId] = useState(null);
    const [selectedRequirementId, setSelectedRequirementId] = useState(null);
    const [showAssociateTaskModal, setShowAssociateTaskModal] = useState(false);
    const [allTasks, setAllTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loadingAllTasks, setLoadingAllTasks] = useState(false);
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [modalStandard, setModalStandard] = useState(null);

    const fetchStandards = useCallback(async () => {
        setLoadingStandards(true);
        try {
            const [standardsRes, usersRes] = await Promise.all([
                getComplianceStandards(),
                getUsers(),
            ]);
            setStandards(Array.isArray(standardsRes.data) ? standardsRes.data : []);
            setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        } catch (err) {
            console.error("Error fetching standards:", err);
            setError('Failed to fetch compliance standards.');
            setStandards([]);
        } finally {
            setLoadingStandards(false);
        }
    }, []);

    const handleOpenRiskDetailModal = (risk) => {
        setSelectedRiskData(risk);
        setShowRiskDetailModal(true);
    };

    const fetchAllTasksForAssociation = useCallback(async () => {
        setLoadingAllTasks(true);
        try {
            const response = await getAllMasterTasks();
            const tasksArray = Array.isArray(response.data) ? response.data : [];
            setAllTasks(tasksArray);
            setFilteredTasks(tasksArray);
        } catch (err) {
            console.error("Error fetching all tasks:", err);
            setError('Failed to fetch tasks for association.');
        } finally {
            setLoadingAllTasks(false);
        }
    }, []);

    const handleOpenAssociateTaskModal = () => {
        if (allTasks.length === 0) {
            fetchAllTasksForAssociation();
        }
        setShowAssociateTaskModal(true);
    };

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

    const handleStandardSelect = (standardId, standard) => {
        const newSelectedStandardId = selectedStandardId === standardId ? null : standardId;
        setSelectedStandardId(newSelectedStandardId);
        setSelectedStandard(standard);
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


    const getStandardIcon = (standard) => {
        const nameLower = standard.name?.toLowerCase() || '';
        const shortNameLower = standard.shortName?.toLowerCase() || '';

        if (nameLower.includes('sox') || shortNameLower.includes('sox')) return <FaChartLine className="text-success" />;
        if (nameLower.includes('pci') || shortNameLower.includes('pci')) return <FaCreditCard className="text-primary" />;
        if (nameLower.includes('nydfs') || shortNameLower.includes('nydfs')) return <FaShieldAlt className="text-warning" />;
        if (nameLower.includes('gdpr') || shortNameLower.includes('gdpr')) return <FaUserShield className="text-info" />;
        if (nameLower.includes('hipaa') || shortNameLower.includes('hipaa')) return <FaFileMedicalAlt className="text-danger" />;
        if (nameLower.includes('iso') || shortNameLower.includes('iso')) return <FaCheckCircle className="text-success" />;
        if (nameLower.includes('nist') || shortNameLower.includes('nist')) return <FaShieldVirus className="text-primary" />;
        return <FaShieldAlt className="text-secondary" />;
    };

    const getRequirementIcon = (requirement) => {
        const textLower = requirement.requirementText?.toLowerCase() || '';
        const controlId = requirement.controlIdReference?.toLowerCase() || '';

        if (textLower.includes('access') || controlId.includes('access')) return <FaLock className="text-warning" />;
        if (textLower.includes('encrypt') || controlId.includes('encrypt')) return <FaShieldVirus className="text-danger" />;
        if (textLower.includes('monitor') || controlId.includes('monitor')) return <FaEye className="text-success" />;
        if (textLower.includes('audit') || controlId.includes('audit')) return <FaClipboardCheck className="text-primary" />;
        if (textLower.includes('backup') || controlId.includes('backup')) return <FaDatabase className="text-info" />;
        if (textLower.includes('network') || controlId.includes('network')) return <FaNetworkWired className="text-secondary" />;
        if (textLower.includes('policy') || controlId.includes('policy')) return <FaFileAlt className="text-dark" />;
        if (textLower.includes('training') || controlId.includes('training')) return <FaUserCheck className="text-success" />;
        return <FaFileContract className="text-muted" />;
    };

    // Group tasks by category
    const groupedTasks = tasks.reduce((acc, task) => {
        const category = task.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(task);
        return acc;
    }, {});

    const handleOpenRequirementsModal = (standard) => {
        console.log("standard", standard);
        setModalStandard(standard);
        // setShowRequirementsModal(true);
        fetchRequirementsByStandard(standard.id);
        setSelectedStandardId(standard.id);
        setSelectedRequirementId(null);
    };

    const handleCloseRequirementsModal = () => {
        setShowRequirementsModal(false);
        setModalStandard(null);
        setRequirements([]);
    };

    return (
        <Container fluid className="p-0">
            {showPageHeader && (
                <PageHeader icon={<FaInfo />} title="Compliance Management - Modern View" />
            )}

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            {/* Standards Carousel */}
            {/* <Card className="mb-4"> */}

            {selectedStandardId && (
                <div>
                     <PageHeader title={selectedStandard.name} subtitle={selectedStandard.description} icon={<FaInfo />}
                        actions={
                            <Button variant="outline-secondary" onClick={() => setSelectedStandardId(null)}>
                                Back to Standards
                            </Button>
                        }
                    />

                
                <Card className="mb-4">
                    <div className='d-flex justify-content-between align-items-center mb-2 ms-3 me-3'>
                        <div className="">

                            <div className="d-flex justify-content-start align-items-center ">
                                <div className="standard-icon-large float-start">
                                    {getStandardIcon(selectedStandardId)}
                                </div>
                                {/* <h5 className="m-0 p-0 ms-2">{selectedStandard.name}</h5> */}
                                <Badge bg="light" text="dark" className="ms-2">
                                    {selectedStandard.shortName}
                                </Badge>
                                {selectedStandard.version && (
                                    <Badge bg="light" text="dark" className="ms-2">Version {selectedStandard.version}</Badge>
                                )}
                                {selectedStandard.official_link && (
                                    <Button
                                        variant="outline-transparent p-0 m-0"
                                        href={selectedStandard.official_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        className='float-end'
                                    >
                                        <FaLink />
                                    </Button>
                                )}
                            </div>
                            {/* <p className="text-muted small mb-3">
                                {selectedStandard.description}
                            </p> */}
                            <div className="d-flex flex-wrap gap-1 mb-3 justify-content-start">
                                {selectedStandard.issuing_body && (
                                    <Badge bg="" text="dark" className="small badge-outline">
                                        <FaBuilding className="me-1" />
                                        {selectedStandard.issuing_body}
                                    </Badge>
                                )}
                                {selectedStandard.jurisdiction && (
                                    <Badge bg="" text="dark" className="small badge-outline">
                                        {selectedStandard.jurisdiction}
                                    </Badge>
                                )}
                                {selectedStandard.industry && (
                                    <Badge bg="" text="dark" className="small badge-outline">
                                        {selectedStandard.industry}
                                    </Badge>
                                )}
                            </div>


                        </div>
                        {/* <Button variant="outline-secondary" onClick={() => setSelectedStandardId(null)}>
                            Back to Standards
                        </Button> */}
                    </div>
                </Card>
                </div>
            )}

            {!selectedStandardId && (
                <div className="mb-4">
                    <PageHeader title="Compliance Standards" subtitle="Manage compliance standards" icon={<FaInfo />}
                        actions={
                            <Button variant="outline-success" size="sm" onClick={onAddStandardClick}>
                                <FaPlusCircle className="me-1" />Add Standard
                            </Button>
                        }
                    />

                    {/* <div as="h5"
                        className="d-flex justify-content-between align-items-center mb-2 ms-3 me-3"
                    >
                        <h5 className='m-0 p-0'>Compliance Standards</h5>
                        {onAddStandardClick && (
                            <Button variant="outline-success" size="sm" onClick={onAddStandardClick}>
                                <FaPlusCircle className="me-1" />Add Standard
                            </Button>
                        )}
                    </div> */}
                    {/* <Card.Body className=""> */}
                    {loadingStandards ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                            <p className="mt-2">Loading Standards...</p>
                        </div>
                    ) : standards.length > 0 ? (
                        <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-3">
                            {standards.map(standard => (
                                <Col key={standard.id}>
                                    <Card
                                        className={`h-100 standard-card ${selectedStandardId === standard.id ? 'border-primary' : ''}`}
                                        onClick={() => handleOpenRequirementsModal(standard)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Card.Body>
                                            <div className="standard-icon-large mb-3">
                                                {getStandardIcon(standard)}
                                            </div>
                                            <h5 className="mb-2">{standard.name}</h5>
                                            <Badge bg="light" text="dark" className="mb-2">
                                                {standard.shortName}
                                            </Badge>
                                            {standard.version && (
                                                <div className="text-muted small mb-3">Version {standard.version}</div>
                                            )}

                                            <p className="text-muted small mb-3">
                                                {standard.description?.substring(0, 100)}
                                                {standard.description?.length > 100 ? "..." : ""}
                                            </p>

                                            <div className="d-flex flex-wrap gap-1 mb-3 justify-content-center">
                                                {standard.issuing_body && (
                                                    <Badge bg="" text="dark" className="small badge-outline">
                                                        <FaBuilding className="me-1" />
                                                        {standard.issuing_body}
                                                    </Badge>
                                                )}
                                                {standard.jurisdiction && (
                                                    <Badge bg="" text="dark" className="small badge-outline">
                                                        {standard.jurisdiction}
                                                    </Badge>
                                                )}
                                                {standard.industry && (
                                                    <Badge bg="" text="dark" className="small badge-outline">
                                                        {standard.industry}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="d-flex gap-2">
                                                <Button
                                                    variant={selectedStandardId === standard.id ? "primary" : "outline-primary"}
                                                    onClick={() => handleStandardSelect(standard.id, standard)}
                                                    className="flex-fill"
                                                    size="sm"
                                                >
                                                    {selectedStandardId === standard.id ? (
                                                        <>
                                                            <FaCheckCircle className="me-1" />
                                                            Selected
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaEye className="me-1" />
                                                            View
                                                        </>
                                                    )}
                                                </Button>
                                                {standard.official_link && (
                                                    <Button
                                                        variant="outline-secondary"
                                                        href={standard.official_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        size="sm"
                                                    >
                                                        <FaLink />
                                                    </Button>
                                                )}
                                            </div>

                                            {standardActions && (
                                                <div className="mt-2">
                                                    {standardActions(standard)}
                                                </div>
                                            )}
                                            {/* <div className="d-flex align-items-center mb-2">
                                  {getStandardIcon(std)}
                                  <span className="ms-2 fw-bold">{std.name}</span>
                              </div>
                              <div className="text-muted small">{std.description}</div> */}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <div className="text-center py-4">
                            <FaShieldAlt size={48} className="text-muted mb-3" />
                            <p className="text-muted">No compliance standards found.</p>
                        </div>
                    )}
                    {/* </Card.Body> */}
                    {/* </Card> */}

                </div>

            )}

            {/* Requirements and Tasks Section */}
            {selectedStandardId && (
                <Row className='mt-3'>
                    <Col md={5}>
                        <Card className="h-100">
                            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                                <span><FaFileContract className="me-2" />Requirements</span>
                                {onAddRequirementClick && selectedStandardId && (
                                    <Button variant="outline-success" size="sm" onClick={() => onAddRequirementClick(selectedStandardId)}>
                                        <FaPlusCircle className="me-1" />Add
                                    </Button>
                                )}
                            </Card.Header>
                            <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                                {loadingRequirements ? (
                                    <ListGroup.Item className="text-center">
                                        <Spinner animation="border" size="sm" /> Loading Requirements...
                                    </ListGroup.Item>
                                ) : requirements.length > 0 ? (
                                    requirements.map(req => (
                                        <ListGroup.Item
                                            key={req.id}
                                            action
                                            active={selectedRequirementId === req.id}
                                            onClick={() => handleRequirementSelect(req.id)}
                                            className="requirement-item"
                                        >
                                            <div className="d-flex align-items-start">
                                                <div className="requirement-icon me-3 mt-1">
                                                    {getRequirementIcon(req)}
                                                </div>
                                                <div className="flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <h6 className="mb-1 fw-bold">{req.controlIdReference}</h6>
                                                            <Badge bg="" text="dark" className="me-2 badge-outline">
                                                                {standards.find(s => s.id === req.standardId)?.shortName}
                                                            </Badge>
                                                            {req.priority && (
                                                                <Badge bg={getPriorityBadgeColor(req.priority)} className="me-2">
                                                                    {req.priority}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {requirementActions && (
                                                            <div className="ms-2">{requirementActions(req)}</div>
                                                        )}
                                                    </div>

                                                    <p className="mb-2 small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                                        {req.requirementText.substring(0, 120)}
                                                        {req.requirementText.length > 120 ? "..." : ""}
                                                    </p>

                                                    {req.risks && req.risks.length > 0 && (
                                                        <div className="mb-2">
                                                            <small className="text-muted d-block mb-1">Associated Risks:</small>
                                                            <div className="d-flex flex-wrap gap-1">
                                                                {req.risks.slice(0, 3).map(risk => (
                                                                    <Badge
                                                                        key={risk.id}
                                                                        bg="danger"
                                                                        className="cursor-pointer"
                                                                        onClick={(e) => { e.stopPropagation(); handleOpenRiskDetailModal(risk); }}
                                                                    >
                                                                        <FaExclamationTriangle className="me-1" size="0.7em" />
                                                                        {risk.riskId}
                                                                    </Badge>
                                                                ))}
                                                                {req.risks.length > 3 && (
                                                                    <Badge bg="secondary">
                                                                        +{req.risks.length - 3} more
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </ListGroup.Item>
                                    ))
                                ) : (
                                    <ListGroup.Item className="text-center text-muted">
                                        No requirements found for the selected standard.
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </Card>
                    </Col>

                    <Col md={7}>
                        <Card className="h-100">
                            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                                <span><FaTasks className="me-2" />Tasks</span>
                                {onAddTaskClick && selectedRequirementId && (
                                    <div className="d-flex gap-2">
                                        <Button variant="outline-success" size="sm" onClick={() => onAddTaskClick(selectedRequirementId)}>
                                            <FaPlusCircle className="me-1" />Add
                                        </Button>
                                        <Button variant="outline-primary" size="sm" onClick={handleOpenAssociateTaskModal}>
                                            <FaLink className="me-1" />Link Existing
                                        </Button>
                                    </div>
                                )}
                            </Card.Header>
                            <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                                {loadingTasks ? (
                                    <div className="text-center p-4">
                                        <Spinner animation="border" size="sm" /> Loading Tasks...
                                    </div>
                                ) : !selectedStandardId ? (
                                    <div className="text-center p-4 text-muted">
                                        Select a standard to view requirements and tasks.
                                    </div>
                                ) : !selectedRequirementId ? (
                                    <div className="text-center p-4 text-muted">
                                        Select a requirement to view its tasks.
                                    </div>
                                ) : tasks.length > 0 ? (
                                    Object.entries(groupedTasks).map(([category, categoryTasks]) => (
                                        <div key={category} className="task-category-group">
                                            <div className="task-category-header p-3 border-bottom bg-light">
                                                <div className="d-flex small text-muted align-items-center">
                                                    {getTaskCategoryIcon(categoryTasks[0])}
                                                    <h6 className="mb-0 m-0 p-0 ms-2 fw-bold text-uppercase">{category}</h6>
                                                    <Badge bg="secondary" className="ms-2 ">{categoryTasks.length}</Badge>
                                                </div>
                                            </div>
                                            <ListGroup variant="flush">
                                                {categoryTasks.map(task => (
                                                    <ListGroup.Item key={task.id} className="task-item">
                                                        <div className="d-flex align-items-start">
                                                            {/* <div className="task-icon me-3 mt-1">
                                                                { getTaskCategoryIcon(task)}
                                                            </div> */}
                                                            <div className="flex-grow-1">
                                                                <div className="d-flex justify-content-between align-items-start">
                                                                    <h6 className="mb-1 m-0 p-0 fw-bold">{task.title}</h6>
                                                                    {taskActions && (
                                                                        <div className="ms-2">{taskActions(task)}</div>
                                                                    )}
                                                                </div>

                                                                {task.description && (
                                                                    <p className="mb-2 small text-muted">
                                                                        {task.description.substring(0, 100)}
                                                                        {task.description.length > 100 ? "..." : ""}
                                                                    </p>
                                                                )}

                                                                <div className="d-flex flex-wrap gap-2 mb-2">
                                                                    {task.defaultPriority && (
                                                                        <Badge bg={getPriorityBadgeColor(task.defaultPriority)}>
                                                                            <FaExclamationCircle className="me-1" size="0.7em" />
                                                                            {task.defaultPriority}
                                                                        </Badge>
                                                                    )}
                                                                    {task.checkType && (
                                                                        <>
                                                                            <Badge bg="" className="fw-normal badge-outline"><strong>Evidence:</strong> {task.highLevelCheckType}</Badge>
                                                                            {/* <Card.Text className="ps-1"><strong>Check Type:</strong> {task.checkType}</Card.Text>
                                            <Card.Text className="ps-1"><strong>Target:</strong> {task.target || 'N/A'}</Card.Text>
                                            <Card.Text className="ps-1"><strong>Parameters:</strong> {task.parameters ? JSON.stringify(task.parameters) : 'None'}</Card.Text> */}
                                                                        </>
                                                                    )}
                                                                    {/* {task.checkType && (
                                                                        <Badge bg="info">
                                                                            <FaCogs className="me-1" size="0.7em" />
                                                                            {task.checkType}
                                                                        </Badge>
                                                                    )} */}
                                                                </div>

                                                                {/* {task.evidenceTypesExpected && task.evidenceTypesExpected.length > 0 && (
                                                                    <div className="mb-2">
                                                                        <small className="text-muted d-block mb-1">
                                                                            <FaFileMedicalAlt className="me-1" />
                                                                            Expected Evidence:
                                                                        </small>
                                                                        <div className="d-flex flex-wrap gap-1">
                                                                            {task.evidenceTypesExpected.map(et => (
                                                                                <Badge key={et} bg="" text="dark" className="fw-normal badge-outline">
                                                                                    {et}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )} */}

                                                                {/* {task.target && (
                                                                    <div className="small text-muted">
                                                                        <FaServer className="me-1" />
                                                                        Target: {task.target}
                                                                    </div>
                                                                )} */}
                                                            </div>
                                                        </div>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-4 text-muted">
                                        No tasks found for the selected requirement.
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            <RiskDetailModal
                show={showRiskDetailModal}
                onHide={() => setShowRiskDetailModal(false)}
                risk={selectedRiskData}
                allUsers={allUsers}
            />

            {/* Requirements Modal */}
            {showRequirementsModal && selectedStandardId && modalStandard && selectedStandardId === modalStandard.id && (
                <Modal show={showRequirementsModal} onHide={handleCloseRequirementsModal} size="lg" centered>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            Requirements for Standard: {modalStandard ? modalStandard.name : ''}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {loadingRequirements ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" />
                                <p className="mt-2">Loading Requirements...</p>
                            </div>
                        ) : requirements.length > 0 ? (
                            <ListGroup>
                                {requirements.map(req => (
                                    <ListGroup.Item key={req.id} className="d-flex align-items-start">
                                        <div className="requirement-icon me-3 mt-1">
                                            {getRequirementIcon(req)}
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <h6 className="mb-1 fw-bold">{req.controlIdReference}</h6>
                                                    <Badge bg="" text="dark" className="me-2 badge-outline">
                                                        {modalStandard?.shortName}
                                                    </Badge>
                                                    {req.priority && (
                                                        <Badge bg={getPriorityBadgeColor(req.priority)} className="me-2">
                                                            {req.priority}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="mb-2 small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                                {req.requirementText.substring(0, 120)}
                                                {req.requirementText.length > 120 ? "..." : ""}
                                            </p>
                                        </div>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        ) : (
                            <div className="text-center py-4 text-muted">
                                No requirements found for this standard.
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseRequirementsModal}>Close</Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* Associate Task Modal */}
            {showAssociateTaskModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <FaLink className="me-2" />
                                    Associate Tasks with Requirement
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAssociateTaskModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {loadingAllTasks ? (
                                    <div className="text-center py-4">
                                        <Spinner animation="border" />
                                        <p className="mt-2">Loading available tasks...</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-muted mb-3">
                                            Select tasks to associate with the current requirement.
                                            Tasks can be associated with multiple requirements.
                                        </p>

                                        <div className="mb-3">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Search tasks by title, category, or description..."
                                                onChange={(e) => {
                                                    const searchTerm = e.target.value.toLowerCase();
                                                    const filtered = allTasks.filter(task =>
                                                        task.title?.toLowerCase().includes(searchTerm) ||
                                                        task.category?.toLowerCase().includes(searchTerm) ||
                                                        task.description?.toLowerCase().includes(searchTerm)
                                                    );
                                                    setFilteredTasks(filtered);
                                                }}
                                            />
                                        </div>

                                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {filteredTasks.length > 0 ? (
                                                <ListGroup>
                                                    {filteredTasks.map(task => {
                                                        const isAlreadyAssociated = tasks.some(t => t.id === task.id);
                                                        return (
                                                            <ListGroup.Item
                                                                key={task.id}
                                                                className={`d-flex align-items-start ${isAlreadyAssociated ? 'bg-light' : ''}`}
                                                            >
                                                                <div className="d-flex align-items-start w-100">
                                                                    <div className="task-icon me-3 mt-1">
                                                                        {getTaskCategoryIcon(task)}
                                                                    </div>
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                                            <h6 className="mb-1 fw-bold">{task.title}</h6>
                                                                            {isAlreadyAssociated && (
                                                                                <Badge bg="success" className="small">
                                                                                    <FaCheckCircle className="me-1" />
                                                                                    Associated
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
                                                                                    <FaTag className="me-1" />
                                                                                    {task.category}
                                                                                </Badge>
                                                                            )}
                                                                            {task.defaultPriority && (
                                                                                <Badge bg={getPriorityBadgeColor(task.defaultPriority)} className="small">
                                                                                    <FaExclamationCircle className="me-1" />
                                                                                    {task.defaultPriority}
                                                                                </Badge>
                                                                            )}
                                                                            {task.checkType && (
                                                                                <Badge bg="secondary" className="small">
                                                                                    <FaCogs className="me-1" />
                                                                                    {task.checkType}
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
                                                                                        // Call API to link task to requirement
                                                                                        await linkTaskToRequirements(task.id, [selectedRequirementId]);
                                                                                        // Update local state
                                                                                        setTasks(prev => [...prev, task]);
                                                                                        setShowAssociateTaskModal(false);
                                                                                    } catch (error) {
                                                                                        console.error('Error associating task:', error);
                                                                                        alert('Failed to associate task. Please try again.');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <FaLink className="me-1" />
                                                                                Associate
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                variant="outline-danger"
                                                                                size="sm"
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        // Call API to unlink task from requirement
                                                                                        await unlinkTaskFromRequirements(task.id, [selectedRequirementId]);
                                                                                        // Update local state
                                                                                        setTasks(prev => prev.filter(t => t.id !== task.id));
                                                                                    } catch (error) {
                                                                                        console.error('Error removing task association:', error);
                                                                                        alert('Failed to remove task association. Please try again.');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <FaUnlink className="me-1" />
                                                                                Remove
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
                                                    <FaTasks size={48} className="text-muted mb-3" />
                                                    <p className="text-muted">No tasks found.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <Button variant="secondary" onClick={() => setShowAssociateTaskModal(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                // .standards-carousel .carousel-inner {
                //     border-radius: 0.375rem;
                // }
                
                // .standards-carousel .carousel-control-prev,
                // .standards-carousel .carousel-control-next {
                //     width: 5%;
                //     background: rgba(0, 0, 0, 0.1);
                //     border-radius: 50%;
                //     height: 40px;
                //     top: 50%;
                //     transform: translateY(-50%);
                //     margin: 0 10px;
                // }
                
                // .standards-carousel .carousel-control-prev-icon,
                // .standards-carousel .carousel-control-next-icon {
                //     background-color: rgba(0, 0, 0, 0.5);
                //     border-radius: 50%;
                //     padding: 8px;
                // }
                
                .standard-icon-large {
                    font-size: 2.5rem;
                    opacity: 0.8;
                }
                
                .requirement-icon, .task-icon {
                    font-size: 1.2rem;
                    opacity: 0.7;
                }
                
                .requirement-item:hover .requirement-icon,
                .task-item:hover .task-icon {
                    opacity: 1;
                }
                
                // .task-category-header {
                //     background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                // }
                
                // .task-category-group:not(:last-child) {
                //     border-bottom: 1px solid #dee2e6;
                // }
                
                .cursor-pointer {
                    cursor: pointer;
                }
                
                .cursor-pointer:hover {
                    opacity: 0.8;
                }
                
                .standards-carousel .carousel-item {
                    padding: 0 10px;
                }
                
                .standard-card {
                    // transition: all 0.3s ease;
                    border: 2px solid transparent;
                }
                
                .standard-card:hover {
                    // transform: translateY(-2px);
                    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .standard-card.border-primary {
                    border-color: var(--bs-primary-bg-subtle) !important;
                    background-color: var(--bs-primary-bg-subtle) !important;
                    // box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
                }
                
                .modal.show {
                    z-index: 1050;
                }
                
                .modal-dialog {
                    max-width: 800px;
                }
                
                .task-association-item {
                    transition: all 0.2s ease;
                }
                
                .task-association-item:hover {
                    background-color: var(--bs-light);
                }
                
                .task-association-item.bg-light {
                    background-color: var(--bs-success-bg-subtle) !important;
                    border-left: 4px solid var(--bs-success);
                }
            `}</style>
        </Container>
    );
}

export default ModernComplianceView; 