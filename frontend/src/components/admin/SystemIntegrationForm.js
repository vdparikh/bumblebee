import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, FloatingLabel } from 'react-bootstrap';
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

import { createConnectedSystem, updateConnectedSystem, getConnectedSystemById } from '../../services/api';
import { systemTypeOptions, configurationSchemas } from '../../constants/systemTypes';

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

                    if (configurationSchemas[system.systemType] && typeof system.configuration === 'object') {
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
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        let finalConfiguration;
        if (systemType && configurationSchemas[systemType]) {
            finalConfiguration = { ...dynamicConfigFields };
            for (const field of configurationSchemas[systemType]) {
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

    const handleDynamicConfigChange = (fieldName, value) => {
        setDynamicConfigFields(prev => ({ ...prev, [fieldName]: value }));
    };

    const currentSchema = systemType ? configurationSchemas[systemType] : null;

    const renderSystemTypeSelector = () => (
        <div className="mb-4">
            <Form.Label className="mb-3">Select System Type</Form.Label>
            {Object.entries(systemTypeOptions.reduce((acc, option) => {
                if (!acc[option.category]) acc[option.category] = [];
                acc[option.category].push(option);
                return acc;
            }, {})).map(([category, options]) => (
                <div key={category} className="mb-4">
                    <h6 className="mb-3 text-muted">{category}</h6>
                    <Row className="g-3">
                        {options.map((option) => (
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
                                    <Card.Body>
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
            ))}
        </div>
    );

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <FaPlug className="me-2" />
                    {id ? 'Edit System Integration' : 'Add New System Integration'}
                </h2>
                <Button variant="outline-secondary" onClick={() => navigate('/admin/system-integrations')}>
                    Back to List
                </Button>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card>
                <Card.Body>
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
{/* { JSON.stringify(currentSchema)} */}
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
                                                    {(field.options || []).map(opt => (
                                                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                                                    ))}
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

                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => navigate('/admin/system-integrations')}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                {id ? 'Update System' : 'Create System'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
}

export default SystemIntegrationForm; 