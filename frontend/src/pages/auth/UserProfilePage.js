import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Card, Row, Col, Badge, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaUserCircle, FaEnvelope, FaUserTag, FaKey, FaLock } from 'react-icons/fa';
import PageHeader from '../../components/ui/PageHeader'; 
import { changePassword as changePasswordApi } from '../../services/api'; 

const UserProfilePage = () => {
    const { currentUser } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loadingPasswordChange, setLoadingPasswordChange] = useState(false);

    if (!currentUser) {
        return (
            <Container className="mt-5">
                <p>Loading user profile...</p>
            </Container>
        );
    }

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'danger', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 8) {
            setMessage({ type: 'danger', text: 'New password must be at least 8 characters long.' });
            return;
        }

        setLoadingPasswordChange(true);
        try {
            await changePasswordApi({ currentPassword, newPassword, confirmPassword });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setMessage({ type: 'danger', text: error.response?.data?.error || 'Failed to change password.' });
        } finally {
            setLoadingPasswordChange(false);
        }
    };

    return (
        <Container fluid>
            <PageHeader
                icon={<FaUserCircle />}
                title="User Profile"
            />
            <Row className="justify-content-center mt-4">
                <Col md={8} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Header as="h4" className="text-center bg-light">
                            <FaUserCircle size={70} className="mb-2 text-primary" />
                            <div>{currentUser.name}</div>
                        </Card.Header>
                        <Card.Body>
                            <Card.Text>
                                <FaEnvelope className="me-2 text-muted" />
                                <strong>Email:</strong> {currentUser.email}
                            </Card.Text>
                            <Card.Text>
                                <FaUserTag className="me-2 text-muted" />
                                <strong>Role:</strong> <Badge bg="info" className="text-capitalize">{currentUser.role}</Badge>
                            </Card.Text>
                            <Card.Text>
                                <strong className="text-muted">User ID:</strong> <small>{currentUser.id}</small>
                            </Card.Text>
                            
                        </Card.Body>
                    </Card>

                    <Card className="shadow-sm mt-4">
                        <Card.Header as="h5">
                            <FaKey className="me-2" /> Change Password
                        </Card.Header>
                        <Card.Body>
                            {message.text && <Alert variant={message.type}>{message.text}</Alert>}
                            <Form onSubmit={handleChangePassword}>
                                <Form.Group className="mb-3" controlId="currentPassword">
                                    <Form.Label>Current Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="newPassword">
                                    <Form.Label>New Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="confirmPassword">
                                    <Form.Label>Confirm New Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                <Button variant="primary" type="submit" disabled={loadingPasswordChange}>
                                    {loadingPasswordChange ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />Updating...</> : <><FaLock className="me-1" />Change Password</>}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default UserProfilePage;