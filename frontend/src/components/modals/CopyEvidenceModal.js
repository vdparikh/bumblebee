import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, ListGroup, Form, Spinner, Alert, Row, Col, Badge } from 'react-bootstrap';
import { getCampaigns, getCampaignTaskInstances, getEvidenceByCampaignTaskInstanceId } from '../../services/api';
import { FaCopy, FaFileAlt, FaLink } from 'react-icons/fa';

const CopyEvidenceModal = ({ show, onHide, targetCampaignId, onCopySubmit }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [taskInstances, setTaskInstances] = useState([]);
    const [selectedTaskInstanceId, setSelectedTaskInstanceId] = useState('');
    const [sourceEvidence, setSourceEvidence] = useState([]);
    const [selectedEvidenceToCopy, setSelectedEvidenceToCopy] = useState([]); // Array of evidence IDs

    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [loadingEvidence, setLoadingEvidence] = useState(false);
    const [error, setError] = useState('');

    const fetchCampaignsForModal = useCallback(async () => {
        setLoadingCampaigns(true);
        try {
            const response = await getCampaigns(); // Fetch all campaigns
            setCampaigns(Array.isArray(response.data) ? response.data : []);
            if (targetCampaignId) { // Pre-select current campaign if provided
                setSelectedCampaignId(targetCampaignId);
            }
        } catch (err) {
            setError('Failed to load campaigns.');
            console.error("Error fetching campaigns for modal:", err);
        } finally {
            setLoadingCampaigns(false);
        }
    }, [targetCampaignId]);

    useEffect(() => {
        if (show) {
            fetchCampaignsForModal();
            // Reset states when modal is shown
            setSelectedCampaignId(targetCampaignId || '');
            setTaskInstances([]);
            setSelectedTaskInstanceId('');
            setSourceEvidence([]);
            setSelectedEvidenceToCopy([]);
            setError('');
        }
    }, [show, fetchCampaignsForModal, targetCampaignId]);

    useEffect(() => {
        if (selectedCampaignId) {
            setLoadingTasks(true);
            getCampaignTaskInstances(selectedCampaignId)
                .then(response => setTaskInstances(Array.isArray(response.data) ? response.data : []))
                .catch(err => {
                    setError('Failed to load tasks for selected campaign.');
                    console.error("Error fetching tasks for modal:", err);
                })
                .finally(() => setLoadingTasks(false));
            setSelectedTaskInstanceId(''); // Reset task selection
            setSourceEvidence([]); // Reset evidence
        } else {
            setTaskInstances([]);
        }
    }, [selectedCampaignId]);

    useEffect(() => {
        if (selectedTaskInstanceId) {
            setLoadingEvidence(true);
            getEvidenceByCampaignTaskInstanceId(selectedTaskInstanceId)
                .then(response => setSourceEvidence(Array.isArray(response.data) ? response.data : []))
                .catch(err => {
                    setError('Failed to load evidence for selected task.');
                    console.error("Error fetching evidence for modal:", err);
                })
                .finally(() => setLoadingEvidence(false));
        } else {
            setSourceEvidence([]);
        }
    }, [selectedTaskInstanceId]);

    const handleEvidenceSelection = (evidenceId) => {
        setSelectedEvidenceToCopy(prev =>
            prev.includes(evidenceId) ? prev.filter(id => id !== evidenceId) : [...prev, evidenceId]
        );
    };

    const handleSubmit = () => {
        if (selectedEvidenceToCopy.length === 0) {
            setError("Please select at least one piece of evidence to copy.");
            return;
        }
        onCopySubmit(selectedEvidenceToCopy);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title><FaCopy className="me-2" />Copy Evidence From Another Task</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {error && <Alert variant="danger">{error}</Alert>}
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>1. Select Source Campaign</Form.Label>
                            {loadingCampaigns && <Spinner animation="border" size="sm" />}
                            <Form.Select value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)} disabled={loadingCampaigns}>
                                <option value="">-- Select Campaign --</option>
                                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>2. Select Source Task Instance</Form.Label>
                            {loadingTasks && <Spinner animation="border" size="sm" />}
                            <Form.Select value={selectedTaskInstanceId} onChange={e => setSelectedTaskInstanceId(e.target.value)} disabled={!selectedCampaignId || loadingTasks}>
                                <option value="">-- Select Task --</option>
                                {taskInstances.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Label>3. Select Evidence to Copy ({selectedEvidenceToCopy.length} selected)</Form.Label>
                        {loadingEvidence && <Spinner animation="border" size="sm" />}
                        <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {sourceEvidence.length > 0 ? sourceEvidence.map(ev => (
                                <ListGroup.Item key={ev.id} action active={selectedEvidenceToCopy.includes(ev.id)} onClick={() => handleEvidenceSelection(ev.id)}>
                                    {ev.mimeType === 'text/url' ? <FaLink className="me-1" /> : <FaFileAlt className="me-1" />}
                                    {ev.fileName || ev.description?.substring(0, 50) || 'Evidence Item'}
                                </ListGroup.Item>
                            )) : <ListGroup.Item disabled>{selectedTaskInstanceId ? 'No evidence found for this task.' : 'Select a task to see evidence.'}</ListGroup.Item>}
                        </ListGroup>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={selectedEvidenceToCopy.length === 0}>
                    Copy Selected Evidence ({selectedEvidenceToCopy.length})
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CopyEvidenceModal;