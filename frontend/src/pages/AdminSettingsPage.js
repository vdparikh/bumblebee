import React, { useState } from 'react';
import { Container, Row, Col, Card, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FaUsersCog, FaCogs } from 'react-icons/fa';
import UserManagement from '../components/admin/UserManagement';
// import SystemSettings from '../components/admin/SystemSettings'; // Placeholder for future

function AdminSettingsPage() {
    const [activeSetting, setActiveSetting] = useState('userManagement');

    const renderActiveSetting = () => {
        switch (activeSetting) {
            case 'userManagement':
                return <UserManagement />;
            // case 'systemSettings':
            //     return <SystemSettings />; // Placeholder
            default:
                return <p>Select a setting to manage.</p>;
        }
    };

    return (
        <Container fluid className="p-3">
            <h2 className="mb-4">Admin Settings</h2>
            <Row>
                <Col md={3}>
                    <Card>
                        <Card.Header as="h5">Navigation</Card.Header>
                        <ListGroup variant='flush' className="p-2">
                            <ListGroup.Item
                                action
                                active={activeSetting === 'userManagement'}
                                onClick={() => setActiveSetting('userManagement')}
                                style={{ cursor: 'pointer' }}
                            >
                                <FaUsersCog className="me-2" />User Management
                            </ListGroup.Item>
                            {/* Example for a future "System Settings" item:
                            <ListGroup.Item
                                action
                                    active={activeSetting === 'systemSettings'}
                                    onClick={() => setActiveSetting('systemSettings')}
                                style={{ cursor: 'pointer' }}                            >
                                    <FaCogs className="me-2" />System Settings
                            </ListGroup.Item> */}
                        </ListGroup>
                    </Card>
                </Col>
                <Col md={9}>
                    {renderActiveSetting()}
                </Col>
            </Row>
        </Container>
    );
}

export default AdminSettingsPage;