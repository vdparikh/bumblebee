import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, FloatingLabel, Modal, ListGroup } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    FaPlusCircle, 
    FaEdit, 
    FaPlug, 
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
    FaServer as FaGenericServer,
    FaChartLine,
    FaFileAlt,
    FaLock,
    FaUserLock,
    FaNetworkWired,
    FaSearch,
    FaFileSignature,
    FaClipboardCheck,
    FaFileContract,
    FaFileInvoiceDollar,
    FaUserShield,
    FaFileMedical,
    FaFileInvoice,
    FaFileWord,
    FaFileExcel,
    FaFilePdf,
    FaFileArchive
} from 'react-icons/fa';

import { createConnectedSystem, updateConnectedSystem, getConnectedSystemById, getSystemTypeDefinitions } from '../../services/api';
import { getSystemTypeIcon } from '../../utils/iconMap'; // Import the icon mapper
import PageHeader from '../common/PageHeader';

const getIconForConfigField = (fieldName) => {
    if (fieldName.toLowerCase().includes('key') || fieldName.toLowerCase().includes('token') || fieldName.toLowerCase().includes('secret')) return <FaKey className="me-2 text-muted" />;
    if (fieldName.toLowerCase().includes('url') || fieldName.toLowerCase().includes('host') || fieldName.toLowerCase().includes('path')) return <FaLink className="me-2 text-muted" />;
    if (fieldName.toLowerCase().includes('user') || fieldName.toLowerCase().includes('client')) return <FaUserSecret className="me-2 text-muted" />;
    if (fieldName.toLowerCase().includes('database') || fieldName.toLowerCase().includes('server')) return <FaDatabase className="me-2 text-muted" />;
    return <FaPlug className="me-2 text-muted" />;
};

function SystemIntegrationForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [name, setName] = useState('');
    const [systemType, setSystemType] = useState('');
    const [description, setDescription] = useState('');
    const [configurationString, setConfigurationString] = useState('{}');
    const [dynamicConfigFields, setDynamicConfigFields] = useState({});
    const [isEnabled, setIsEnabled] = useState(true);

    const [apiSystemTypes, setApiSystemTypes] = useState([]);
    const [apiConfigSchemas, setApiConfigSchemas] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        const fetchSystem = async () => {
            if (id) {
                setLoading(true);
                try {
                    const response = await getConnectedSystemById(id);
                    const system = response.data;
                    setName(system.name);
                    setSystemType(system.systemType);
                    setDescription(system.description || '');
                    setIsEnabled(system.isEnabled);

                    const schemaForType = apiConfigSchemas[system.systemType];
                    if (schemaForType && typeof system.configuration === 'object') {
                        setDynamicConfigFields(system.configuration);
                        setConfigurationString('{}');
                    } else {
                        setDynamicConfigFields({});
                        setConfigurationString(typeof system.configuration === 'string' ? system.configuration : JSON.stringify(system.configuration || {}, null, 2));
                    }
                } catch (err) {
                    setError('Failed to fetch system details. ' + (err.response?.data?.error || err.message));
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSystem();
    }, [id, apiConfigSchemas]); // Add apiConfigSchemas dependency

    useEffect(() => {
        const fetchDefinitions = async () => {
            try {
                const response = await getSystemTypeDefinitions();
                const definitions = response.data || [];
                setApiSystemTypes(definitions);
                const schemas = definitions.reduce((acc, typeDef) => {
                    acc[typeDef.value] = typeDef.configurationSchema || [];
                    return acc;
                }, {});
                setApiConfigSchemas(schemas);
                if (definitions.length > 0 && definitions[0].category) {
                    setSelectedCategory(definitions[0].category); // Select the first category by default
                }
            } catch (err) {
                setError('Failed to load system type definitions. ' + (err.response?.data?.error || err.message));
            }
        };
        fetchDefinitions();
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        let finalConfiguration;
        const currentApiSchema = apiConfigSchemas[systemType];
        if (systemType && currentApiSchema) {
            finalConfiguration = { ...dynamicConfigFields };
            for (const field of currentApiSchema) {
                if (field.required && (finalConfiguration[field.name] === undefined || finalConfiguration[field.name] === '')) {
                    setError(`${field.label} is required.`);
                    return;
                }
            }
        } else {
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
            if (id) {
                await updateConnectedSystem(id, systemData);
                setSuccess('System updated successfully.');
            } else {
                await createConnectedSystem(systemData);
                setSuccess('System created successfully.');
            }
            navigate('/admin/system-integrations');
        } catch (err) {
            setError('Failed to save system. ' + (err.response?.data?.error || err.message));
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        // setIsEditing(false);
        // setCurrentDocument(null);
    };

    const handleDynamicConfigChange = (fieldName, value) => {
        setDynamicConfigFields(prev => ({ ...prev, [fieldName]: value }));
    };

    const currentSchema = systemType ? apiConfigSchemas[systemType] : null;

    const renderSystemTypeSelector = () => (
        <div className="mb-4">
            
            <Row>
                <Col md={3} className="mb-3 mb-md-0">
                    <Card>
                        <Card.Header>Select System Type*</Card.Header>
                        <ListGroup variant="flush">
                            {Object.keys(apiSystemTypes.reduce((acc, option) => {
                                acc[option.category || 'Other'] = true;
                                return acc;
                            }, {})).sort().map(category => (
                                <ListGroup.Item
                                    key={category}
                                    action
                                    active={selectedCategory === category}
                                    onClick={() => setSelectedCategory(category)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {category}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Card>
                </Col>
                <Col md={9}>
                    {selectedCategory && (
                        <Row className="g-3">
                            {apiSystemTypes.filter(option => (option.category || 'Other') === selectedCategory).map((option) => (
                                <Col key={option.value} xs={6} sm={4} md={4} lg={3}> {/* Adjusted md and lg for better fit */}
                                    <Card
                                        className={`h-100 system-type-card ${systemType === option.value ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSystemType(option.value);
                                            setShowModal(true);
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            border: systemType === option.value ? `2px solid ${option.color || '#007bff'}` : '1px solid #dee2e6',
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        <Card.Body className="text-center d-flex flex-column justify-content-center">
                                            <div
                                                className="mb-2 mx-auto" // Center icon
                                                style={{ color: option.color || '#007bff', height: '40px' }}
                                            >
                                                {getSystemTypeIcon(option.iconName, 30)}
                                            </div>
                                            <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>{option.label}</h6>
                                            {/* <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{option.description}</small> */}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Col>
            </Row>
        </div>
    );

    return (
        <div className="">
              <PageHeader
                icon={<FaPlug />}
                title={id ? 'Edit System Integration' : 'Add New System Integration'}
                actions={
                    <Button variant="outline-secondary" onClick={() => navigate('/admin/system-integrations')}>
                    Back to List
                </Button>
                }
            />

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

                        {renderSystemTypeSelector()}

           

            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title><h5 className="mb-3">Configure "{apiSystemTypes.find(st => st.value === systemType)?.label || systemType}" Details</h5></Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>

                        {/* Details Panel - Appears when a systemType is selected */}
                        {systemType && (
                                <div>
                                <FloatingLabel controlId="name" label="System Name*" className="mb-3">
                                    <Form.Control
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter a unique name for this system instance"
                                        required
                                    />
                                </FloatingLabel>

                                <FloatingLabel controlId="description" label="Description (Optional)" className="mb-3">
                                    <Form.Control
                                        as="textarea"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter a brief description"
                                        style={{ height: '100px' }}
                                    />
                                </FloatingLabel>

                                <Form.Group className="mb-3" controlId="systemConfiguration">
                                    <Form.Label>Configuration*</Form.Label>
                                    {currentSchema && currentSchema.length > 0 ? (
                                        <Card className="p-3 bg-light border">
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
                                                            {(field.options || []).map(opt => ( // Assuming options are simple strings for now
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </Form.Select>
                                                    ) : (
                                                        <Form.Control
                                                            type={field.type || 'text'}
                                                            value={dynamicConfigFields[field.name] || ''}
                                                            onChange={(e) => handleDynamicConfigChange(field.name, e.target.value)}
                                                            placeholder={field.placeholder || ''}
                                                            required={field.required}
                                                        />
                                                    )}
                                                    {field.helpText && <Form.Text muted>{field.helpText}</Form.Text>}
                                                </FloatingLabel>
                                            ))}
                                        </Card>
                                    ) : (
                                        <Form.Control
                                            as="textarea"
                                            rows={5}
                                            value={configurationString}
                                            onChange={(e) => setConfigurationString(e.target.value)}
                                            placeholder='Enter JSON configuration, e.g., {"apiKey": "your_key"}'
                                            required
                                        />
                                    )}
                                    <Form.Text muted>For sensitive fields like API keys or passwords, consider using environment variables or a secrets manager in production environments.</Form.Text>
                                </Form.Group>

                                <Form.Check
                                    type="switch"
                                    id="systemEnabled"
                                    label="Enabled"
                                    checked={isEnabled}
                                    onChange={(e) => setIsEnabled(e.target.checked)}
                                    className="mb-3"
                                />
                            </div>
                        )}

                        {/* Submit and Cancel buttons appear only if a system type is selected */}
                        {systemType && (
                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <Button variant="secondary" onClick={() => navigate('/admin/system-integrations')}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : (id ? 'Update System' : 'Create System')}
                                </Button>
                            </div>
                        )}
                    </Form>
                </Modal.Body>
            </Modal>

        </div>
    );
}

export default SystemIntegrationForm;
                               