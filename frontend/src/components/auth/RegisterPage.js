import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Card, Container, Alert, Spinner, Image } from 'react-bootstrap';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth(); // We'll add this to AuthContext
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError('');
        setLoading(true);
        try {
            await register(name, email, password);
            // Navigation to dashboard or login page will be handled by AuthContext's register method
        } catch (err) {
            setError(err.message || 'Failed to register. Please try again.');
        }
        setLoading(false);
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div style={{ maxWidth: '450px', width: '100%' }}>
                <Card className="shadow-lg">
                    <Card.Body className="p-4">
                        <div className="text-center mb-4">
                            <Image src={process.env.PUBLIC_URL + '/logo.webp'} alt="Logo" height="60" className="mb-3" />
                            <h3 className="fw-bold">Create Account</h3>
                        </div>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="formBasicName">
                                <Form.Label>Full Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formBasicEmailRegister">
                                <Form.Label>Email address</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Enter email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formBasicPasswordRegister">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Password (min. 8 characters)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formBasicConfirmPassword">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                                {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Registering...</> : 'Register'}
                            </Button>
                        </Form>
                        <div className="mt-3 text-center">
                            <small>Already have an account? <Link to="/login">Log In</Link></small>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default RegisterPage;