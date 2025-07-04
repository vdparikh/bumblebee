import React, { useState, useEffect, useCallback } from 'react';
import {
    getCampaigns,
    createCampaign,
    getComplianceStandards,
    getRequirements,

} from '../../services/api';
import { Link, useLocation } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import { useAuth } from '../../contexts/AuthContext';

import {
    FaBullhorn,
    FaPlusCircle,
    FaListUl,
    FaEdit,
    FaShieldAlt,
    FaFileContract,
    FaTasks as FaTasksIcon,
    FaExclamationTriangle
} from 'react-icons/fa';
import PageHeader from '../../components/ui/PageHeader';
import { ProgressBar, Spinner } from 'react-bootstrap';

function Campaigns() {
    const { currentUser } = useAuth();

    const location = useLocation();
    const [campaigns, setCampaigns] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTabKey, setActiveTabKey] = useState('existing');


    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignDescription, setNewCampaignDescription] = useState('');
    const [selectedStandard, setSelectedStandard] = useState('');
    const [allStandards, setAllStandards] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');


    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [availableRequirements, setAvailableRequirements] = useState([]);
    const [selectedRequirementsForCampaign, setSelectedRequirementsForCampaign] = useState([]);

    const [loadingCampaigns, setLoadingCampaigns] = useState(true);

    const fetchCampaigns = useCallback(async () => {
        try {
            // const response = await getCampaigns();
            setLoadingCampaigns(true);
            // Request task summaries when fetching campaigns for the "existing" tab
            const response = await getCampaigns(null, true); // Pass true to include summaries

            setCampaigns(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Error fetching campaigns:", err);
            setError('Failed to fetch campaigns.');
        } finally {
            setLoadingCampaigns(false);
        }
    }, []);

    const fetchFormData = useCallback(async () => {
        try {
            const standardsRes = await getComplianceStandards();
            setAllStandards(Array.isArray(standardsRes.data) ? standardsRes.data : []);
        } catch (err) {
            console.error("Error fetching standards:", err);

        }
    }, []);

    useEffect(() => {
        fetchCampaigns();
        fetchFormData();
        if (location.state?.successMessage) {
            setSuccess(location.state.successMessage);

            window.history.replaceState({}, document.title)
        }
    }, [fetchCampaigns, fetchFormData, location.state]);

    const handleStandardChangeForModal = async (standardId) => {
        setSelectedStandard(standardId);
        if (standardId) {
            try {

                const reqRes = await getRequirements();
                const filteredReqs = Array.isArray(reqRes.data) ? reqRes.data.filter(r => r.standardId === standardId) : [];
                setAvailableRequirements(filteredReqs);
                setSelectedRequirementsForCampaign([]);
            } catch (err) {
                console.error("Error fetching requirements for modal:", err);
                setAvailableRequirements([]);
            }
        } else {
            setAvailableRequirements([]);
            setSelectedRequirementsForCampaign([]);
        }
    };

    const handleRequirementSelectionChange = (reqId, controlIdRef) => {
        setSelectedRequirementsForCampaign(prev => {
            const existing = prev.find(r => r.requirement_id === reqId);
            if (existing) {
                return prev.filter(r => r.requirement_id !== reqId);
            } else {
                return [...prev, { requirement_id: reqId, is_applicable: true, controlIdReference: controlIdRef }];
            }
        });
    };

    const handleApplicabilityChange = (reqId, isApplicable) => {
        setSelectedRequirementsForCampaign(prev => prev.map(r =>
            r.requirement_id === reqId ? { ...r, is_applicable: isApplicable } : r
        ));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Closed': return 'success';
            case 'Completed': return 'success';
            case 'Open': return 'secondary';
            case 'In Progress': return 'info';
            case 'Pending Review': return 'warning';
            case 'Failed': return 'danger';
            case 'Active': return 'primary';
            case 'Draft': return 'light';
            default: return 'secondary';
        }
    };

    const renderTaskProgressBar = (taskSummary) => {
        if (!taskSummary || taskSummary.total_tasks === 0) {
            return <ProgressBar now={0} label="0 Tasks" />;
        }
        const { open = 0, in_progress = 0, pending_review = 0, closed = 0, failed = 0, total_tasks = 0 } = taskSummary;
        return (
            <ProgressBar style={{ height: '20px', fontSize: '0.75rem' }}>
                <ProgressBar variant="success" now={(closed / total_tasks) * 100} key={1} label={`${closed} Closed`} />
                <ProgressBar variant="warning" now={(pending_review / total_tasks) * 100} key={2} label={`${pending_review} Review`} />
                <ProgressBar variant="info" now={(in_progress / total_tasks) * 100} key={3} label={`${in_progress} Active`} />
                <ProgressBar variant="secondary" now={(open / total_tasks) * 100} key={4} label={`${open} Open`} />
                <ProgressBar variant="danger" now={(failed / total_tasks) * 100} key={5} label={`${failed} Failed`} />
            </ProgressBar>
        );
    };


    const handleSubmitCampaign = async (e) => {
        e.preventDefault();
        if (!newCampaignName.trim() || !selectedStandard) {
            setError("Campaign Name and Standard are required.");
            return;
        }

        const campaignData = {
            name: newCampaignName.trim(),
            description: newCampaignDescription.trim(),
            standard_id: selectedStandard,
            start_date: startDate || null,
            end_date: endDate || null,

            selected_requirements: selectedRequirementsForCampaign.map(({ requirement_id, is_applicable }) => ({ requirement_id, is_applicable })),
        };

        try {
            await createCampaign(campaignData);
            setSuccess('Campaign created successfully! Associated tasks have been generated for applicable requirements.');
            setError('');
            setNewCampaignName('');
            setNewCampaignDescription('');
            setSelectedStandard('');
            setStartDate('');
            setEndDate('');
            setSelectedRequirementsForCampaign([]);
            setAvailableRequirements([]);
            fetchCampaigns();
            setActiveTabKey('existing');
        } catch (err) {
            console.error("Error creating campaign:", err.response?.data || err.message);
            setError(`Failed to create campaign. ${err.response?.data?.error || 'An unexpected error occurred.'}`);
            setSuccess('');
        }
    };

    const getStandardName = (standardId) => {
        const standard = allStandards.find(s => s.id === standardId);
        return standard ? standard.name : 'N/A';
    };


    return (
        <div>

            <PageHeader icon={<FaBullhorn />} title="Audit Campaigns" subtitle="Overview of compliance review activities and evidence management." />

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Tabs activeKey={activeTabKey} onSelect={(k) => setActiveTabKey(k)} id="campaigns-tabs" className="mb-3 nav-line-tabs">

                <Tab eventKey="existing" title={<><FaListUl className="me-1" />Existing Campaigns</>}>
                    {loadingCampaigns ? (
                        <div className="text-center mt-5"><Spinner animation="border" /> Loading campaigns...</div>
                    ) : campaigns.length === 0 ? (
                        <Alert variant="info">No campaigns found.</Alert>
                    ) : (
                        <Row xs={1} md={2} lg={3} className="g-4">
                            {campaigns.map(camp => (
                                <Col key={camp.id}>
                                    <Card className="h-100 shadow-sm campaign-card">
                                        <Card.Header className="d-flex justify-content-between align-items-center">
                                            <FaShieldAlt className="me-2 text-primary" />
                                            <span className="fw-bold">{camp.standard_name || getStandardName(camp.standard_id)}</span>
                                            <Badge bg={getStatusColor(camp.status)} pill>{camp.status}</Badge>
                                        </Card.Header>
                                        <Card.Body as={Link} to={`/campaigns/${camp.id}`} className="text-decoration-none text-dark stretched-link">
                                            <Card.Title className="h5">{camp.name}</Card.Title>
                                            <Card.Text className="small text-muted mb-2">
                                                {camp.description ? `${camp.description.substring(0, 100)}${camp.description.length > 100 ? '...' : ''}` : 'No description.'}
                                            </Card.Text>
                                            <Row className="small text-muted mb-2">
                                                <Col>
                                                    <FaFileContract className="me-1" /> {camp.requirements_count || 0} Requirements
                                                </Col>
                                                <Col>
                                                    <FaTasksIcon className="me-1" /> {camp.task_summary?.total_tasks || 0} Tasks
                                                </Col>
                                            </Row>
                                            {camp.task_summary && camp.task_summary.total_tasks > 0 && (
                                                <div className="mb-2">
                                                    {renderTaskProgressBar(camp.task_summary)}
                                                </div>
                                            )}
                                            {camp.task_summary?.overdue_tasks > 0 && (
                                                <Badge bg="danger" className="mb-2"><FaExclamationTriangle className="me-1" /> {camp.task_summary.overdue_tasks} Overdue</Badge>
                                            )}
                                        </Card.Body>
                                        <Card.Footer className="text-muted small">
                                            Dates: {camp.start_date ? new Date(camp.start_date).toLocaleDateString() : 'N/A'} - {camp.end_date ? new Date(camp.end_date).toLocaleDateString() : 'N/A'}
                                        </Card.Footer>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}

                </Tab>

                <Tab eventKey="create" title={<><FaPlusCircle className="me-1" />Create New Campaign</>}>
                    <Card>
                        <Card.Body>
                            <Form onSubmit={handleSubmitCampaign}>
                                <FloatingLabel controlId="campaignName" label="Campaign Name*" className="mb-3">
                                    <Form.Control type="text" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="e.g., PCI ROC Q1 2025" required />
                                </FloatingLabel>

                                <FloatingLabel controlId="campaignDescription" label="Description" className="mb-3">
                                    <Form.Control as="textarea" value={newCampaignDescription} onChange={e => setNewCampaignDescription(e.target.value)} placeholder="Brief description of the campaign" style={{ height: '100px' }} />
                                </FloatingLabel>

                                <Row className="mb-3">
                                    <Col md={12}>
                                        <FloatingLabel controlId="campaignStandard" label="Primary Standard*">
                                            <Form.Select value={selectedStandard} onChange={e => handleStandardChangeForModal(e.target.value)} required>
                                                <option value="">Select a Standard</option>
                                                {allStandards.map(std => (
                                                    <option key={std.id} value={std.id}>{std.name} ({std.shortName})</option>
                                                ))}
                                            </Form.Select>
                                        </FloatingLabel>
                                    </Col>
                                </Row>
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <FloatingLabel controlId="campaignStartDate" label="Start Date">
                                            <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                        </FloatingLabel>
                                    </Col>
                                    <Col md={6}>
                                        <FloatingLabel controlId="campaignEndDate" label="End Date">
                                            <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                        </FloatingLabel>
                                    </Col>
                                </Row>

                                <Button variant="secondary" onClick={() => setShowRequirementsModal(true)} disabled={!selectedStandard} className="mb-3">
                                    Select Requirements ({selectedRequirementsForCampaign.length})
                                </Button>

                                {selectedRequirementsForCampaign.length > 0 && (
                                    <div className="mb-3 p-2 border rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <h6>Selected Requirements:</h6>
                                        <ListGroup variant="flush">
                                            {selectedRequirementsForCampaign.map(sr => (
                                                <ListGroup.Item key={sr.requirement_id} className="d-flex justify-content-between align-items-center ps-0 pe-0 pt-1 pb-1">
                                                    <small>{sr.controlIdReference || sr.requirement_id.substring(0, 8)}</small>
                                                    <Form.Check
                                                        type="switch"
                                                        id={`switch-req-${sr.requirement_id}`}
                                                        label={sr.is_applicable ? "Applicable" : "Not Applicable"}
                                                        checked={sr.is_applicable}
                                                        onChange={(e) => handleApplicabilityChange(sr.requirement_id, e.target.checked)}
                                                        size="sm"
                                                    />
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </div>
                                )}
                                <hr />
                                <Button variant="primary" type="submit">Create Campaign</Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            <Modal show={showRequirementsModal} onHide={() => setShowRequirementsModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Select Requirements for Standard: {getStandardName(selectedStandard)}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {availableRequirements.length === 0 && <p>No requirements found for this standard, or standard not selected.</p>}
                    <ListGroup>
                        {availableRequirements.map(req => (
                            <ListGroup.Item
                                key={req.id}
                                action
                                onClick={() => handleRequirementSelectionChange(req.id, req.controlIdReference)}
                                active={selectedRequirementsForCampaign.some(sr => sr.requirement_id === req.id)}
                                className="d-flex justify-content-between align-items-center"
                            >
                                <span><strong>{req.controlIdReference}</strong>: {req.requirementText.substring(0, 100)}...</span>
                                {selectedRequirementsForCampaign.some(sr => sr.requirement_id === req.id) && <Badge pill bg="success">Selected</Badge>}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRequirementsModal(false)}>Close</Button>
                    <Button variant="primary" onClick={() => setShowRequirementsModal(false)}>Confirm Selections</Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
}

export default Campaigns;
