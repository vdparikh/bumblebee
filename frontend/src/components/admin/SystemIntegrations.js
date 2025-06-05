import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Modal, Form, Card, Accordion, Badge } from 'react-bootstrap';
import { FaPlusCircle, FaEdit, FaTrash, FaPlug, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { getConnectedSystems, createConnectedSystem, updateConnectedSystem, deleteConnectedSystem } from '../../services/api';

const systemTypeOptions = [
    { value: 'aws', label: 'AWS (Amazon Web Services)' },
    { value: 'azure', label: 'Azure (Microsoft Azure)' },
    { value: 'gcp', label: 'GCP (Google Cloud Platform)' },
    { value: 'github', label: 'GitHub' },
    { value: 'gitlab', label: 'GitLab' },
    { value: 'nessus', label: 'Nessus Vulnerability Scanner' },
    { value: 'qualys', label: 'Qualys Guard' },
    { value: 'generic_api', label: 'Generic API Endpoint' },
    { value: 'database', label: 'Database (PostgreSQL, MySQL, etc.)' },
    { value: 'other', label: 'Other' },
];

function SystemIntegrations() {
    const [systems, setSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSystem, setCurrentSystem] = useState(null);

    const [name, setName] = useState('');
    const [systemType, setSystemType] = useState('');
    const [description, setDescription] = useState('');
    const [configuration, setConfiguration] = useState('{}'); 
    const [isEnabled, setIsEnabled] = useState(true);

    const fetchSystems = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getConnectedSystems();
            setSystems(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError('Failed to fetch connected systems. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSystems();
    }, [fetchSystems]);

    const resetForm = () => {
        setName('');
        setSystemType('');
        setDescription('');
        setConfiguration('{}');
        setIsEnabled(true);
        setCurrentSystem(null);
        setIsEditing(false);
    };

    const handleShowCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const handleShowEditModal = (system) => {
        setIsEditing(true);
        setCurrentSystem(system);
        setName(system.name);
        setSystemType(system.systemType);
        setDescription(system.description || '');
        setConfiguration(typeof system.configuration === 'string' ? system.configuration : JSON.stringify(system.configuration, null, 2));
        setIsEnabled(system.isEnabled);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        let parsedConfig;
        try {
            parsedConfig = JSON.parse(configuration);
        } catch (jsonErr) {
            setError('Configuration must be valid JSON.');
            return;
        }

        const systemData = {
            name,
            systemType,
            description: description || null,
            configuration: parsedConfig, // Send parsed JSON object
            isEnabled,
        };

        try {
            if (isEditing && currentSystem) {
                await updateConnectedSystem(currentSystem.id, systemData);
                setSuccess('System updated successfully.');
            } else {
                await createConnectedSystem(systemData);
                setSuccess('System created successfully.');
            }
            fetchSystems();
            handleCloseModal();
        } catch (err) {
            setError('Failed to save system. ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (systemId) => {
        if (window.confirm('Are you sure you want to delete this system integration?')) {
            setError('');
            setSuccess('');
            try {
                await deleteConnectedSystem(systemId);
                setSuccess('System deleted successfully.');
                fetchSystems();
            } catch (err) {
                setError('Failed to delete system. ' + (err.response?.data?.error || err.message));
            }
        }
    };

    if (loading) return <Spinner animation="border" />;

    return (
        <div>

            <div className="d-flex justify-content-between align-items-center mb-2">
                <h3><FaPlug className="me-2" />System Integrations</h3>
                            <Button variant="outline-success" onClick={handleShowCreateModal} className="mb-3 rounded-pill">
                <FaPlusCircle className="me-2" />Add New Integration
            </Button>

            </div>
            
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}


            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Last Checked</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {systems.length > 0 ? systems.map(system => (
                        <tr key={system.id}>
                            <td>{system.name}</td>
                            <td>{systemTypeOptions.find(opt => opt.value === system.systemType)?.label || system.systemType}</td>
                            <td>
                                <Badge bg={system.isEnabled ? 'success' : 'secondary'}>
                                    {system.isEnabled ? <FaCheckCircle /> : <FaTimesCircle />} {system.isEnabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                            </td>
                            <td>{system.lastCheckedAt ? new Date(system.lastCheckedAt).toLocaleString() : 'N/A'} ({system.lastCheckStatus || 'N/A'})</td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEditModal(system)} title="Edit">
                                    <FaEdit />
                                </Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(system.id)} title="Delete">
                                    <FaTrash />
                                </Button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" className="text-center">No system integrations found.</td></tr>
                    )}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit' : 'Add New'} System Integration</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3" controlId="systemName">
                            <Form.Label>Name*</Form.Label>
                            <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="systemType">
                            <Form.Label>System Type*</Form.Label>
                            <Form.Select value={systemType} onChange={(e) => setSystemType(e.target.value)} required>
                                <option value="">Select Type...</option>
                                {systemTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="systemDescription">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="systemConfiguration">
                            <Form.Label>Configuration (JSON)*</Form.Label>
                            <Form.Control as="textarea" rows={5} value={configuration} onChange={(e) => setConfiguration(e.target.value)} placeholder='e.g., {"apiKey": "your_key", "region": "us-west-2"}' required />
                            <Form.Text muted>Store sensitive credentials securely (e.g., using environment variables or a secrets manager in production).</Form.Text>
                        </Form.Group>
                        <Form.Check type="switch" id="systemEnabled" label="Enabled" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" type="submit">{isEditing ? 'Save Changes' : 'Create System'}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

export default SystemIntegrations;