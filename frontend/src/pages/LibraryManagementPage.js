import React, { useState, useEffect, useCallback } from 'react';
import { Container, Button, Alert, Spinner, Row, Col, Card, Badge, Tabs, Tab } from 'react-bootstrap';
import { 
    FaEdit, FaPlusCircle, FaChartLine, FaHistory, FaFileAlt, 
    FaLink, FaFileUpload, FaShieldAlt, FaBook, FaTasks,
    FaExclamationCircle, FaCheckCircle, FaClock, FaFileContract,
    FaCogs, FaTag, FaUserShield, FaCalendarAlt, FaBuilding
} from 'react-icons/fa';
import ThreeColumnView from '../components/views/ThreeColumnView';
import EntityFormPanel from '../components/common/EntityFormPanel';
import PageHeader from '../components/common/PageHeader';
import {
    getComplianceStandards,
    getRequirements,
    getTasks,
    createComplianceStandard,
    updateStandard,
    createRequirement,
    updateRequirement,
    createTask,
    updateTask,
    getConnectedSystems,
    getDocuments,
} from '../services/api';

function LibraryManagementPage() {
    const [standards, setStandards] = useState([]);
    const [requirements, setRequirements] = useState([]);
    const [masterTasks, setMasterTasks] = useState([]);
    const [connectedSystems, setConnectedSystems] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');

    const [showPanel, setShowPanel] = useState(false);
    const [panelMode, setPanelMode] = useState('add');
    const [panelEntityType, setPanelEntityType] = useState('');
    const [panelDataToEdit, setPanelDataToEdit] = useState(null);
    const [panelParentId, setPanelParentId] = useState(null);

    // Compliance metrics
    const [metrics, setMetrics] = useState({
        totalStandards: 0,
        totalRequirements: 0,
        totalTasks: 0,
        automatedChecks: 0,
        manualChecks: 0,
        recentUpdates: 0,
        pendingReviews: 0
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [stdRes, reqRes, taskRes, systemsRes, docsRes] = await Promise.all([
                getComplianceStandards(),
                getRequirements(),
                getTasks(),
                getConnectedSystems(),
                getDocuments()
            ]);
            setStandards(Array.isArray(stdRes.data) ? stdRes.data : []);
            setRequirements(Array.isArray(reqRes.data) ? reqRes.data : []);
            setMasterTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setConnectedSystems(Array.isArray(systemsRes.data) ? systemsRes.data : []);
            setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);

            // Calculate metrics
            setMetrics({
                totalStandards: stdRes.data.length,
                totalRequirements: reqRes.data.length,
                totalTasks: taskRes.data.length,
                automatedChecks: taskRes.data.filter(t => t.checkType).length,
                manualChecks: taskRes.data.filter(t => !t.checkType).length,
                recentUpdates: 0, // TODO: Implement
                pendingReviews: 0 // TODO: Implement
            });
        } catch (err) {
            console.error("Error fetching library data:", err);
            setError('Failed to load library data. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenPanel = (mode, entityType, dataToEdit = null, parentId = null) => {
        setPanelMode(mode);
        setPanelEntityType(entityType);
        if (entityType === 'requirement' && parentId) {
            setPanelDataToEdit({ standardId: parentId });
        } else {
            setPanelDataToEdit(dataToEdit);
        }
        setPanelParentId(parentId);
        setShowPanel(true);
        setError('');
        setSuccess('');
    };

    const handleClosePanel = () => {
        setShowPanel(false);
        setPanelDataToEdit(null);
        setPanelParentId(null);
    };

    const handleSaveEntity = async (entityType, data, idToUpdate) => {
        setSuccess('');
        setError('');
        try {
            let response;
            if (entityType === 'standard') {
                response = idToUpdate ? await updateStandard(idToUpdate, data) : await createComplianceStandard(data);
            } else if (entityType === 'requirement') {
                response = idToUpdate ? await updateRequirement(idToUpdate, data) : await createRequirement(data);
            } else if (entityType === 'task') {
                response = idToUpdate ? await updateTask(idToUpdate, data) : await createTask(data);
            }
            setSuccess(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${idToUpdate ? 'updated' : 'created'} successfully!`);
            fetchData();
            handleClosePanel();
            return response;
        } catch (err) {
            console.error(`Error saving ${entityType}:`, err);
            const errorMessage = `Failed to save ${entityType}. ${err.response?.data?.error || err.message}`;
            setError(errorMessage);
            throw err;
        }
    };

    if (loading) {
        return <Container className="text-center mt-5"><Spinner animation="border" /> Loading Library...</Container>;
    }

    const renderDashboard = () => (
        <div className="mb-4">
            <Row>
                <Col md={3}>
                    <Card className="mb-3">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Total Standards</h6>
                                    <h3>{metrics.totalStandards}</h3>
                                </div>
                                <FaShieldAlt size={24} className="text-primary" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="mb-3">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Requirements</h6>
                                    <h3>{metrics.totalRequirements}</h3>
                                </div>
                                <FaFileContract size={24} className="text-success" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="mb-3">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Tasks</h6>
                                    <h3>{metrics.totalTasks}</h3>
                                </div>
                                <FaTasks size={24} className="text-warning" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="mb-3">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Automated Checks</h6>
                                    <h3>{metrics.automatedChecks}</h3>
                                </div>
                                <FaCogs size={24} className="text-info" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Card className="mb-3">
                        <Card.Header>
                            <FaHistory className="me-2" /> Recent Updates
                        </Card.Header>
                        <Card.Body>
                            <p className="text-muted">No recent updates</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="mb-3">
                        <Card.Header>
                            <FaExclamationCircle className="me-2" /> Pending Reviews
                        </Card.Header>
                        <Card.Body>
                            <p className="text-muted">No pending reviews</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );

    return (
        <Container fluid>
            <PageHeader 
                title="Compliance Library Management" 
                subtitle="Manage compliance standards, requirements, and tasks"
            />
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
                variant='underline'
            >
                <Tab eventKey="dashboard" title={<><FaChartLine className="me-1" />Dashboard</>}>
                    {renderDashboard()}
                </Tab>
                <Tab eventKey="library" title={<><FaBook className="me-1" />Library</>}>
                    <ThreeColumnView
                        key={standards.length + requirements.length + masterTasks.length}
                        showPageHeader={false}
                        onAddStandardClick={() => handleOpenPanel('add', 'standard')}
                        standardActions={(std) => (
                            <Button className='nopadding text-warning' variant="transparent" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'standard', std); }} title="Edit Standard">
                                <FaEdit />
                            </Button>
                        )}
                        onAddRequirementClick={(standardId) => handleOpenPanel('add', 'requirement', null, standardId)}
                        requirementActions={(req) => (
                            <Button className='nopadding text-warning' variant="transparent" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'requirement', req); }} title="Edit Requirement">
                                <FaEdit />
                            </Button>
                        )}
                        onAddTaskClick={(requirementId) => handleOpenPanel('add', 'task', null, requirementId)}
                        taskActions={(task) => (
                            <Button className='nopadding text-warning' variant="transparent" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'task', task); }} title="Edit Task">
                                <FaEdit />
                            </Button>
                        )}
                    />
                </Tab>
            </Tabs>

            <EntityFormPanel
                show={showPanel}
                mode={panelMode}
                entityType={panelEntityType}
                initialData={panelDataToEdit}
                parentId={panelParentId}
                onSave={handleSaveEntity}
                onClose={handleClosePanel}
                allStandards={standards}
                allRequirements={requirements}
                allConnectedSystems={connectedSystems}
                allDocuments={documents}
            />
        </Container>
    );
}

export default LibraryManagementPage;