import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Modal, Form, Card, Accordion, Badge, Col, Row, FloatingLabel } from 'react-bootstrap';
import { 
    FaPlusCircle, 
    FaEdit, 
    FaTrash, 
    FaPlug, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaKey, 
    FaServer, 
    FaDatabase, 
    FaUserSecret, 
    FaLink,
    FaAws,
    FaMicrosoft,
    FaGoogle,
    FaGithub,
    FaGitlab,
    FaShieldAlt,
    FaCloud,
    FaCode,
    FaServer as FaGenericServer
} from 'react-icons/fa';
import { getConnectedSystems, createConnectedSystem, updateConnectedSystem, deleteConnectedSystem } from '../../services/api';

const systemTypeOptions = [
    { 
        value: 'aws', 
        label: 'AWS', 
        description: 'Amazon Web Services',
        icon: <FaAws size={24} />,
        color: '#FF9900'
    },
    { 
        value: 'azure', 
        label: 'Azure', 
        description: 'Microsoft Azure',
        icon: <FaMicrosoft size={24} />,
        color: '#0078D4'
    },
    { 
        value: 'gcp', 
        label: 'GCP', 
        description: 'Google Cloud Platform',
        icon: <FaGoogle size={24} />,
        color: '#4285F4'
    },
    { 
        value: 'github', 
        label: 'GitHub', 
        description: 'GitHub Integration',
        icon: <FaGithub size={24} />,
        color: '#181717'
    },
    { 
        value: 'gitlab', 
        label: 'GitLab', 
        description: 'GitLab Integration',
        icon: <FaGitlab size={24} />,
        color: '#FC6D26'
    },
    { 
        value: 'nessus', 
        label: 'Nessus', 
        description: 'Vulnerability Scanner',
        icon: <FaShieldAlt size={24} />,
        color: '#00A8E8'
    },
    { 
        value: 'qualys', 
        label: 'Qualys', 
        description: 'Qualys Guard',
        icon: <FaShieldAlt size={24} />,
        color: '#FF4B4B'
    },
    { 
        value: 'generic_api', 
        label: 'Generic API', 
        description: 'Custom API Endpoint',
        icon: <FaCode size={24} />,
        color: '#6C757D'
    },
    { 
        value: 'database', 
        label: 'Database', 
        description: 'Database Connection',
        icon: <FaDatabase size={24} />,
        color: '#0D6EFD'
    },
    { 
        value: 'other', 
        label: 'Other', 
        description: 'Custom Integration',
        icon: <FaGenericServer size={24} />,
        color: '#6C757D'
    }
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

    const renderSystemTypeSelector = () => (
        <div className="mb-4">
            <Form.Label className="mb-3">Select System Type</Form.Label>
            <Row className="g-3">
                {systemTypeOptions.map((option) => (
                    <Col key={option.value} xs={6} sm={4} md={3}>
                        <Card 
                            className={`h-100 system-type-card ${systemType === option.value ? 'selected' : ''}`}
                            onClick={() => setSystemType(option.value)}
                            style={{ 
                                cursor: 'pointer',
                                border: systemType === option.value ? `2px solid ${option.color}` : '1px solid #dee2e6',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <Card.Body className="text-center p-3">
                                <div 
                                    className="mb-2" 
                                    style={{ 
                                        color: option.color,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '40px'
                                    }}
                                >
                                    {option.icon}
                                </div>
                                <h6 className="mb-1">{option.label}</h6>
                                <small className="text-muted d-block">{option.description}</small>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );

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

            <Modal show={showModal} onHide={handleCloseModal} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit System Integration' : 'Add New System Integration'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <FloatingLabel controlId="name" label="Name" className="mb-3">
                            <Form.Control
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter system name"
                                required
                            />
                        </FloatingLabel>

                        {renderSystemTypeSelector()}

                        <FloatingLabel controlId="description" label="Description (Optional)" className="mb-3">
                            <Form.Control
                                as="textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter description"
                                style={{ height: '100px' }}
                            />
                        </FloatingLabel>

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
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Save</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default SystemIntegrations;