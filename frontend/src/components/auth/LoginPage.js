import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Card, Container, Alert, Spinner, Image } from 'react-bootstrap';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            // Navigation is handled by AuthContext's login method
        } catch (err) {
            setError(err.message || 'Failed to log in. Please check your credentials.');
        }
        setLoading(false);
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div style={{ maxWidth: '400px', width: '100%' }}>
                <Card className="shadow-lg">
                    <Card.Body className="p-4">
                        <div className="text-center mb-4">
                             <Image src={process.env.PUBLIC_URL + '/logo.webp'} alt="Logo" height="60" className="mb-3" />
                            <h3 className="fw-bold">Login</h3>
                        </div>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="formBasicEmail">
                                <Form.Label>Email address</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Enter email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formBasicPassword">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                                {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Logging in...</> : 'Login'}
                            </Button>
                        </Form>
                        <div className="mt-3 text-center">
                            <small>Don't have an account? <Link to="/register">Sign Up</Link></small>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default LoginPage;