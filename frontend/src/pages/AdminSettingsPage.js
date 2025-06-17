import React, { useState } from 'react';
import { Container, Row, Col, Card, ListGroup, ListGroupItem, Badge, Nav, Tab } from 'react-bootstrap';
import { 
    FaUsersCog, 
    FaCogs, 
    FaPlug, 
    FaUsers, 
    FaShieldAlt, 
    FaChartLine, 
    FaBell, 
    FaDatabase,
    FaKey,
    FaHistory
} from 'react-icons/fa';
import UserManagement from '../components/admin/UserManagement';
import SystemIntegrations from '../components/admin/SystemIntegrations';
import TeamsPage from '../components/TeamsPage';
import PageHeader from '../components/common/PageHeader';

function AdminSettingsPage() {
    const [activeSetting, setActiveSetting] = useState('userManagement');

    const settings = [
        {
            id: 'userManagement',
            title: 'User Management',
            icon: <FaUsersCog />,
            description: 'Manage users, roles, and permissions',
            badge: 'Core'
        },
        {
            id: 'systemIntegrations',
            title: 'System Integrations',
            icon: <FaPlug />,
            description: 'Configure external system connections',
            badge: 'Integration'
        },
        {
            id: 'manageTeams',
            title: 'Team Management',
            icon: <FaUsers />,
            description: 'Create and manage teams',
            badge: 'Core'
        },
        {
            id: 'security',
            title: 'Security Settings',
            icon: <FaShieldAlt />,
            description: 'Configure security policies and access controls',
            badge: 'Security'
        },
        {
            id: 'audit',
            title: 'Audit Settings',
            icon: <FaHistory />,
            description: 'Configure audit logging and monitoring',
            badge: 'Security'
        },
        {
            id: 'notifications',
            title: 'Notification Settings',
            icon: <FaBell />,
            description: 'Manage system notifications and alerts',
            badge: 'Core'
        },
        {
            id: 'apiKeys',
            title: 'API Keys',
            icon: <FaKey />,
            description: 'Manage API keys and access tokens',
            badge: 'Integration'
        },
        {
            id: 'backup',
            title: 'Backup & Recovery',
            icon: <FaDatabase />,
            description: 'Configure system backup and recovery',
            badge: 'System'
        }
    ];

    const renderActiveSetting = () => {
        switch (activeSetting) {
            case 'userManagement':
                return <UserManagement />;
            case 'systemIntegrations':
                return <SystemIntegrations />;
            case 'manageTeams':
                return <TeamsPage />;
            case 'security':
                return (
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Security Settings</h5>
                        </Card.Header>
                        <Card.Body>
                            <p>Security settings configuration coming soon...</p>
                        </Card.Body>
                    </Card>
                );
            case 'audit':
                return (
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Audit Settings</h5>
                        </Card.Header>
                        <Card.Body>
                            <p>Audit settings configuration coming soon...</p>
                        </Card.Body>
                    </Card>
                );
            case 'notifications':
                return (
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Notification Settings</h5>
                        </Card.Header>
                        <Card.Body>
                            <p>Notification settings configuration coming soon...</p>
                        </Card.Body>
                    </Card>
                );
            case 'apiKeys':
                return (
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">API Keys Management</h5>
                        </Card.Header>
                        <Card.Body>
                            <p>API keys management coming soon...</p>
                        </Card.Body>
                    </Card>
                );
            case 'backup':
                return (
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Backup & Recovery</h5>
                        </Card.Header>
                        <Card.Body>
                            <p>Backup and recovery settings coming soon...</p>
                        </Card.Body>
                    </Card>
                );
            default:
                return <p>Select a setting to manage.</p>;
        }
    };

    return (
        <div>
             <PageHeader
                icon={<FaPlug />}
                title="Admin Settings"
                actions={
                    <div><Badge bg="primary" className="me-2">Admin Only</Badge>
                    <Badge bg="info">System Settings</Badge></div>
                }
            />



            <Row>
                <Col md={3}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">Settings Menu</h5>
                        </Card.Header>
                        <ListGroup variant="flush">
                            {settings.map((setting) => (
                                <ListGroup.Item
                                    key={setting.id}
                                    action
                                    active={activeSetting === setting.id}
                                    onClick={() => setActiveSetting(setting.id)}
                                    className="d-flex align-items-center py-3"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="d-flex align-items-center flex-grow-1">
                                        <span className="me-3 text-primary">{setting.icon}</span>
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span>{setting.title}</span>
                                                <Badge bg={setting.badge === 'Core' ? 'primary' : 
                                                         setting.badge === 'Security' ? 'danger' : 
                                                         setting.badge === 'Integration' ? 'success' : 'info'}
                                                       className="ms-2">
                                                    {setting.badge}
                                                </Badge>
                                            </div>
                                            <small className="text-muted d-block">{setting.description}</small>
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Card>
                </Col>
                <Col md={9}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            {renderActiveSetting()}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default AdminSettingsPage;