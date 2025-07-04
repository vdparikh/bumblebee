import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Card, Button, Spinner, Alert, Badge, Row, Col, Tab, Tabs, Container, ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
    FaPlusCircle, 
    FaEdit, 
    FaTrash, 
    FaPlug, 
    FaCheckCircle, 
    FaTimesCircle,
    FaTasks,
    FaBookOpen,
    FaPlus
} from 'react-icons/fa';
import { getConnectedSystems, deleteConnectedSystem, getSystemTypeDefinitions } from '../../services/api';
import { getSystemTypeIcon } from '../../utils/iconMap';

import { 
    FaAws,
    FaDatabase,
    FaKey, 
    FaServer, 
    FaUserSecret, 
    FaLink,
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
import PageHeader from '../../components/ui/PageHeader';
import SystemIntegrationForm from './SystemIntegrationForm';
import { RightPanelContext } from '../../App';


// // Export the system type options and configuration schemas for use in SystemIntegrationForm
// export const configurationSchemas = {
//     aws: [
//         { name: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE', required: true, sensitive: false },
//         { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', required: true, sensitive: true },
//         { name: 'defaultRegion', label: 'Default Region', type: 'text', placeholder: 'us-west-2', required: true, sensitive: false },
//     ],
//     azure: [
//         { name: 'subscriptionId', label: 'Subscription ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, sensitive: false },
//         { name: 'tenantId', label: 'Tenant ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, sensitive: false },
//         { name: 'clientId', label: 'Client ID (App ID)', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, sensitive: false },
//         { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'YourAppClientSecret', required: true, sensitive: true },
//     ],
//     github: [
//         { name: 'personalAccessToken', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: true, sensitive: true },
//         { name: 'organization', label: 'Organization (Optional)', type: 'text', placeholder: 'your-org-name', sensitive: false },
//     ],
//     generic_api: [
//         { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com/v1', required: true, sensitive: false },
//         { name: 'apiKey', label: 'API Key (Optional)', type: 'password', placeholder: 'your_api_key', sensitive: true },
//         { name: 'authHeader', label: 'Auth Header Name (Optional)', type: 'text', placeholder: 'Authorization', helpText: "e.g., 'Authorization' or 'X-API-Key'", sensitive: false },
//         { name: 'authValuePrefix', label: 'Auth Value Prefix (Optional)', type: 'text', placeholder: 'Bearer ', helpText: "e.g., 'Bearer ' or 'Token '", sensitive: false },
//     ],
//     database: [
//         { name: 'dbType', label: 'Database Type', type: 'select', options: ['postgresql', 'mysql', 'sqlserver', 'oracle'], placeholder: 'postgresql', required: true, sensitive: false },
//         { name: 'host', label: 'Host', type: 'text', placeholder: 'localhost or db.example.com', required: true, sensitive: false },
//         { name: 'port', label: 'Port', type: 'number', placeholder: '5432', required: true, sensitive: false },
//         { name: 'databaseName', label: 'Database Name', type: 'text', placeholder: 'mydatabase', required: true, sensitive: false },
//         { name: 'username', label: 'Username', type: 'text', placeholder: 'db_user', required: true, sensitive: false },
//         { name: 'password', label: 'Password', type: 'password', placeholder: 'db_password', required: true, sensitive: true },
//     ],
//     // Add more schemas as needed
// };

function SystemIntegrations() {
    const navigate = useNavigate();
    const [systems, setSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [apiSystemTypes, setApiSystemTypes] = useState([]);
    const [selectedSystem, setSelectedSystem] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSystemType, setSelectedSystemType] = useState(null);
    const { openRightPanel, closeRightPanel } = useContext(RightPanelContext);

    const fetchSystems = useCallback(async () => {
        try {
            const response = await getConnectedSystems();
            setSystems(response.data || []);
            setError('');
        } catch (err) {
            setError('Failed to fetch systems. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchDefinitions = async () => {
            try {
                const response = await getSystemTypeDefinitions();
                setApiSystemTypes(response.data || []);
            } catch (err) {
                // Error fetching definitions is not critical for listing existing systems if type is stored
                console.error('Failed to load system type definitions for display enhancement:', err);
            }
        };
        fetchSystems();
        fetchDefinitions();
    }, [fetchSystems]);

    const handleEdit = (systemId) => {
        const system = systems.find(option => option.id === systemId);
        if (system) {
            openRightPanel('systemIntegrationForm', {
                title: `Edit "${system.systemType}" System Integration`,
                content: (
                    <SystemIntegrationForm 
                        id={systemId}
                        onSuccess={() => {
                            fetchSystems();
                            closeRightPanel();
                        }}
                        onClose={closeRightPanel}
                    />
                )
            });
        }
    };

    const handleSystemTypeSelect = (systemType) => {
        setSelectedSystemType(systemType);
        openRightPanel('systemIntegrationForm', {
            title: `Configure "${systemType}" System Integration`,
            content: (
                <SystemIntegrationForm 
                    key={systemType} // Add key to force re-render
                    selectedSystemType={systemType}
                    onSuccess={() => {
                        fetchSystems();
                        closeRightPanel();
                        setSelectedSystemType(null); // Reset selection after success
                    }}
                    onClose={() => {
                        closeRightPanel();
                        setSelectedSystemType(null); // Reset selection when closing
                    }}
                />
            )
        });
    };

    const handleDelete = async (systemId) => {
        if (window.confirm('Are you sure you want to delete this system?')) {
            try {
                await deleteConnectedSystem(systemId);
                setSuccess('System deleted successfully.');
                fetchSystems();
            } catch (err) {
                setError('Failed to delete system. ' + (err.response?.data?.error || err.message));
            }
        }
    };

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
                                <Col key={option.value} xs={6} sm={4} md={4} lg={3}>
                                    <Card
                                        className={`h-100 system-type-card ${selectedSystemType === option.value ? 'selected' : ''}`}
                                        onClick={() => handleSystemTypeSelect(option.value)}
                                        style={{
                                            cursor: 'pointer',
                                            border: selectedSystemType === option.value ? `2px solid ${option.color || '#007bff'}` : '1px solid #dee2e6',
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        <Card.Body className="text-center d-flex flex-column justify-content-center">
                                            <div
                                                className="mb-2 mx-auto"
                                                style={{ color: option.color || '#007bff', height: '40px' }}
                                            >
                                                {getSystemTypeIcon(option.iconName, 30)}
                                            </div>
                                            <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>{option.label}</h6>
                                            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{option.description}</small>
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

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "200px" }}>
                <Spinner animation="border" />
            </div>
        );
    }

    return (
        <div className="">
             <PageHeader
                icon={<FaPlug />}
                title="System Integrations"
                // actions={
                //     <Button variant="primary" onClick={() => setSelectedCategory(apiSystemTypes[0]?.category || 'Other')}>
                //         <FaPlusCircle className="me-2" />
                //         Add New System
                //     </Button>
                // }
            />

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Tabs defaultActiveKey="existing" id="auditor-dashboard-tabs" className="mb-3 nav-line-tabs">
                <Tab eventKey="existing" title={<><FaTasks className="me-1" />Existing</>}>
                    <Row xs={1} md={2} lg={3} className="g-4">
                        {systems.map(system => {
                            const systemTypeInfo = apiSystemTypes.find(option => option.value === system.systemType);
                            return (
                                <Col key={system.id}>
                                    <Card className="h-100 text-center shadow-sm">
                                        <Card.Body>
                                            <div className='text-center p-2 pt-3 pb-3'
                                                style={{ color: systemTypeInfo ? systemTypeInfo.color : '#007bff' }}
                                            >{systemTypeInfo ? getSystemTypeIcon(systemTypeInfo.iconName, 40) : <FaPlug />}</div>
                                            <div className='text-center fw-bold'>{system.name}</div>
                                            <Card.Subtitle className="mb-2 text-muted text-center small">
                                                Type: {systemTypeInfo ? systemTypeInfo.label : system.systemType}<br/>
                                                <Badge bg={system.isEnabled ? 'success' : 'secondary'} pill>
                                                    {system.isEnabled ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </Card.Subtitle>
                                            
                                            <Card.Text style={{ minHeight: '60px' }}>
                                                {system.description || 'No description provided.'}
                                            </Card.Text>
                                            <small className="text-muted">
                                                Last Checked: {system.lastChecked ? new Date(system.lastChecked).toLocaleString() : 'Never'}
                                            </small>
                                        </Card.Body>
                                        <Card.Footer className="text-center bg-white border-0">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="me-2 ps-3 pe-2 me-2"
                                                onClick={() => handleEdit(system.id)}
                                                title="Edit System"
                                            >
                                                <FaEdit /> Edit
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDelete(system.id)}
                                                title="Delete System"
                                            >
                                                <FaTrash /> Delete
                                            </Button>
                                        </Card.Footer>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </Tab>
                <Tab eventKey="addNew" title={<><FaPlus className="me-1" />Add New Integration</>}>
                    {renderSystemTypeSelector()}
                </Tab>
            </Tabs>
        </div>
    );
}

export default SystemIntegrations;