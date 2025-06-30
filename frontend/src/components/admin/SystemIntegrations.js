import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Spinner, Alert, Badge, Row, Col, Tab, Tabs, Container } from 'react-bootstrap';
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
import PageHeader from '../common/PageHeader';
import SystemIntegrationForm from './SystemIntegrationForm';



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

    const handleEdit = async (systemId) => {
        console.log(systems)
       const system = systems.filter(option => (option.id === systemId)) 
       console.log(system)
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
                actions={
                    <Button variant="primary" onClick={() => navigate('/admin/system-integrations/new')}>
                    <FaPlusCircle className="me-2" />
                    Add New System
                </Button>
                }
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
                                        onClick={() => navigate(`/admin/system-integrations/edit/${system.id}`)}
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
                <Tab eventKey="evidenceLibrary" title={<><FaPlus className="me-1" />Add New Integration</>}>
                    <SystemIntegrationForm />
                </Tab>
            </Tabs>

                
            
        </div>
    );
}

export default SystemIntegrations;