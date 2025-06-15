import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
    FaPlusCircle, 
    FaEdit, 
    FaTrash, 
    FaPlug, 
    FaCheckCircle, 
    FaTimesCircle
} from 'react-icons/fa';
import { getConnectedSystems, deleteConnectedSystem } from '../../services/api';
import { systemTypeOptions } from '../../constants/systemTypes';

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



// Export the system type options and configuration schemas for use in SystemIntegrationForm
export const configurationSchemas = {
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

function SystemIntegrations() {
    const navigate = useNavigate();
    const [systems, setSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
        fetchSystems();
    }, [fetchSystems]);

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
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <FaPlug className="me-2" />
                    System Integrations
                </h2>
                <Button variant="primary" onClick={() => navigate('/admin/system-integrations/new')}>
                    <FaPlusCircle className="me-2" />
                    Add New System
                </Button>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Table responsive hover>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Last Checked</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {systems.map(system => {
                        const systemType = systemTypeOptions.find(option => option.value === system.systemType);
                        return (
                            <tr key={system.id}>
                                <td>{system.name}</td>
                                <td>
                                    {systemType ? (
                                        <span style={{ color: systemType.color }}>
                                            {systemType.icon} {systemType.label}
                                        </span>
                                    ) : system.systemType}
                                </td>
                                <td>{system.description || '-'}</td>
                                <td>
                                    <Badge bg={system.isEnabled ? 'success' : 'secondary'}>
                                        {system.isEnabled ? 'Active' : 'Disabled'}
                                    </Badge>
                                </td>
                                <td>{system.lastChecked ? new Date(system.lastChecked).toLocaleString() : 'Never'}</td>
                                <td>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => navigate(`/admin/system-integrations/edit/${system.id}`)}
                                    >
                                        <FaEdit />
                                    </Button>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleDelete(system.id)}
                                    >
                                        <FaTrash />
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
}

export default SystemIntegrations;