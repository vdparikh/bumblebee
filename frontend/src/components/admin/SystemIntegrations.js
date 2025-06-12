import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Modal, Form, Card, Accordion, Badge, Col, Row, FloatingLabel } from 'react-bootstrap';
import { FaPlusCircle, FaEdit, FaTrash, FaPlug, FaCheckCircle, FaTimesCircle, FaKey, FaServer, FaDatabase, FaUserSecret, FaLink } from 'react-icons/fa';
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

// Define configuration schemas for different system types
const configurationSchemas = {
    aws: [
        { name: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE', required: true, sensitive: false },
        { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', required: true, sensitive: true },
        { name: 'defaultRegion', label: 'Default Region', type: 'text', placeholder: 'us-west-2', required: true, sensitive: false },
    ],
    azure: [
        { name: 'subscriptionId', label: 'Subscription ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, sensitive: false },
        { name: 'tenantId', label: 'Tenant ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, sensitive: false },
        { name: 'clientId', label: 'Client ID (App ID)', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, sensitive: false },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'YourAppClientSecret', required: true, sensitive: true },
    ],
    github: [
        { name: 'personalAccessToken', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: true, sensitive: true },
        { name: 'organization', label: 'Organization (Optional)', type: 'text', placeholder: 'your-org-name', sensitive: false },
    ],
    generic_api: [
        { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com/v1', required: true, sensitive: false },
        { name: 'apiKey', label: 'API Key (Optional)', type: 'password', placeholder: 'your_api_key', sensitive: true },
        { name: 'authHeader', label: 'Auth Header Name (Optional)', type: 'text', placeholder: 'Authorization', helpText: "e.g., 'Authorization' or 'X-API-Key'", sensitive: false },
        { name: 'authValuePrefix', label: 'Auth Value Prefix (Optional)', type: 'text', placeholder: 'Bearer ', helpText: "e.g., 'Bearer ' or 'Token '", sensitive: false },
    ],
    database: [
        { name: 'dbType', label: 'Database Type', type: 'select', options: ['postgresql', 'mysql', 'sqlserver', 'oracle'], placeholder: 'postgresql', required: true, sensitive: false },
        { name: 'host', label: 'Host', type: 'text', placeholder: 'localhost or db.example.com', required: true, sensitive: false },
        { name: 'port', label: 'Port', type: 'number', placeholder: '5432', required: true, sensitive: false },
        { name: 'databaseName', label: 'Database Name', type: 'text', placeholder: 'mydatabase', required: true, sensitive: false },
        { name: 'username', label: 'Username', type: 'text', placeholder: 'db_user', required: true, sensitive: false },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'db_password', required: true, sensitive: true },
    ],
    // Add more schemas as needed
};

const getIconForConfigField = (fieldName) => {
    if (fieldName.toLowerCase().includes('key') || fieldName.toLowerCase().includes('token') || fieldName.toLowerCase().includes('secret')) return <FaKey className="me-2 text-muted" />;
    if (fieldName.toLowerCase().includes('url') || fieldName.toLowerCase().includes('host') || fieldName.toLowerCase().includes('path')) return <FaLink className="me-2 text-muted" />;
    if (fieldName.toLowerCase().includes('user') || fieldName.toLowerCase().includes('client')) return <FaUserSecret className="me-2 text-muted" />;
    if (fieldName.toLowerCase().includes('database') || fieldName.toLowerCase().includes('server')) return <FaDatabase className="me-2 text-muted" />;
    return <FaPlug className="me-2 text-muted" />;
};


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
    const [configurationString, setConfigurationString] = useState('{}'); // For 'other' or manual JSON editing
    const [dynamicConfigFields, setDynamicConfigFields] = useState({}); // For structured fields
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
        setConfigurationString('{}');
        setDynamicConfigFields({});
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
        setIsEnabled(system.isEnabled);

        if (configurationSchemas[system.systemType] && typeof system.configuration === 'object') {
            setDynamicConfigFields(system.configuration);
            setConfigurationString('{}'); // Clear manual JSON if schema matches
        } else {
            setDynamicConfigFields({});
            setConfigurationString(typeof system.configuration === 'string' ? system.configuration : JSON.stringify(system.configuration || {}, null, 2));
        }


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

        let finalConfiguration;
        if (systemType && configurationSchemas[systemType]) {
            // Collect data from dynamic fields
            finalConfiguration = { ...dynamicConfigFields };
            // Validate required fields for schema
            for (const field of configurationSchemas[systemType]) {
                if (field.required && (finalConfiguration[field.name] === undefined || finalConfiguration[field.name] === '')) {
                    setError(`${field.label} is required.`);
                    return;
                }
            }
        } else {
            // Use manual JSON input
            try {
                finalConfiguration = JSON.parse(configurationString);
            } catch (jsonErr) {
                setError('Configuration must be valid JSON for "Other" type or if schema is not defined.');
                return;
            }
        }

        const systemData = {
            name,
            systemType,
            description: description || null,
            configuration: finalConfiguration,
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

    const handleDynamicConfigChange = (fieldName, value) => {
        setDynamicConfigFields(prev => ({ ...prev, [fieldName]: value }));
    };

    const currentSchema = systemType ? configurationSchemas[systemType] : null;


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
                            <Form.Label>Configuration*</Form.Label>
                            {currentSchema ? (
                                <Card className="p-3 bg-light">
                                    {currentSchema.map(field => (
                                        <FloatingLabel
                                            key={field.name}
                                            controlId={`config-${field.name}`}
                                            label={<>{getIconForConfigField(field.label)} {field.label}{field.required ? '*' : ''}</>}
                                            className="mb-3"
                                        >
                                            {field.type === 'select' ? (
                                                <Form.Select
                                                    value={dynamicConfigFields[field.name] || ''}
                                                    onChange={(e) => handleDynamicConfigChange(field.name, e.target.value)}
                                                    required={field.required}
                                                >
                                                    <option value="">Select {field.label}...</option>
                                                    {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </Form.Select>
                                            ) : (
                                                <Form.Control
                                                    type={field.type || 'text'}
                                                    value={dynamicConfigFields[field.name] || ''}
                                                    onChange={(e) => handleDynamicConfigChange(field.name, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                />
                                            )}
                                            {field.helpText && <Form.Text muted>{field.helpText}</Form.Text>}
                                        </FloatingLabel>
                                    ))}
                                </Card>
                            ) : (
                                <Form.Control as="textarea" rows={5} value={configurationString} onChange={(e) => setConfigurationString(e.target.value)} placeholder='Enter JSON configuration, e.g., {"apiKey": "your_key"}' required />
                            )}
                            <Form.Text muted>For sensitive fields like API keys or passwords, consider using environment variables or a secrets manager in production environments.</Form.Text>
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