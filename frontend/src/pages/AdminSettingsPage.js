import React, { useState } from 'react';
import { Container, Row, Col, Nav, Card, ListGroup, ListGroupItem } from 'react-bootstrap';
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
                        <ListGroup variant='flush' className="flex-column p-2">
                            <ListGroupItem>
                                <Nav.Link
                                    active={activeSetting === 'userManagement'}
                                    onClick={() => setActiveSetting('userManagement')}
                                    href="#"
                                >
                                    <FaUsersCog className="me-2" />User Management
                                </Nav.Link>
                            </ListGroupItem>
                            {/* <Nav.Item>
                                <Nav.Link
                                    active={activeSetting === 'systemSettings'}
                                    onClick={() => setActiveSetting('systemSettings')}
                                    href="#"
                                >
                                    <FaCogs className="me-2" />System Settings
                                </Nav.Link>
                            </Nav.Item> */}
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