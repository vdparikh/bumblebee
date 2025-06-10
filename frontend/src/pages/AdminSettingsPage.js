import React, { useState } from 'react';
import { Container, Row, Col, Card, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FaUsersCog, FaCogs, FaPlug, FaUsers } from 'react-icons/fa'; 
import UserManagement from '../components/admin/UserManagement';
import SystemIntegrations from '../components/admin/SystemIntegrations'; 
import TeamsPage from '../components/TeamsPage';


function AdminSettingsPage() {
    const [activeSetting, setActiveSetting] = useState('userManagement');

    const renderActiveSetting = () => {
        switch (activeSetting) {
            case 'userManagement':
                return <UserManagement />;
            case 'systemIntegrations':
                return <SystemIntegrations />;
            case 'manageTeams':
                return <TeamsPage />;
            
            
            default:
                return <p>Select a setting to manage.</p>;
        }
    };

    return (
        <Container fluid className="p-3">
            <h2 className="mb-4">Settings</h2>
            <Row>
                <Col md={3}>
                    
                        <ListGroup variant='flush' className="p-2">
                            <ListGroup.Item
                                action
                                active={activeSetting === 'userManagement'}
                                onClick={() => setActiveSetting('userManagement')}
                                style={{ cursor: 'pointer' }}
                            >
                                <FaUsersCog className="me-2" />User Management
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                active={activeSetting === 'systemIntegrations'}
                                onClick={() => setActiveSetting('systemIntegrations')}
                                style={{ cursor: 'pointer' }}
                            >
                                <FaPlug className="me-2" />System Integrations
                            </ListGroup.Item>

                            <ListGroup.Item
                                action
                                active={activeSetting === 'manageTeams'}
                                onClick={() => setActiveSetting('manageTeams')}
                                style={{ cursor: 'pointer' }}
                            >
                                <FaUsers className="me-2" />Manage Teams
                            </ListGroup.Item>
                            
                        </ListGroup>
                    
                </Col>
                <Col md={9}>
                    {renderActiveSetting()}
                </Col>
            </Row>
        </Container>
    );
}

export default AdminSettingsPage;