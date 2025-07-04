import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaLayerGroup, FaTasks, FaExclamationTriangle, FaCogs, FaFileContract } from 'react-icons/fa';
import PageHeader from '../components/common/PageHeader';
import Dashboard from '../components/Dashboard';
import { getComplianceStandards, getRequirements, getTasks, getRisks } from '../services/api';

function DashboardPage() {
    const [metrics, setMetrics] = useState({
        totalStandards: 0,
        totalRequirements: 0,
        totalTasks: 0,
        totalRisks: 0,
        automatedChecks: 0,
        manualChecks: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [stdRes, reqRes, taskRes, riskRes] = await Promise.all([
                getComplianceStandards(),
                getRequirements(),
                getTasks(),
                getRisks(),
            ]);
            setMetrics({
                totalStandards: stdRes.data.length,
                totalRequirements: reqRes.data.length,
                totalTasks: taskRes.data.length,
                totalRisks: riskRes.data.length,
                automatedChecks: taskRes.data.filter(t => t.checkType).length,
                manualChecks: taskRes.data.filter(t => !t.checkType).length,
            });
        } catch (err) {
            setError('Failed to load dashboard metrics. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

    return (
        <div className="">
            <PageHeader title="Dashboard" subtitle="Compliance Automation Overview" />
            {error && <Alert variant="danger">{error}</Alert>}
            <Row xs={1} md={2} xl={4} className="mb-4">
                <Col md={3}>
                    <Link to="/standards" style={{ textDecoration: 'none' }}>
                        <Card className="mb-3 metric-card-link">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Total Standards</h6>
                                        <h3>{loading ? <Spinner animation="border" size="sm" /> : metrics.totalStandards}</h3>
                                    </div>
                                    <FaLayerGroup size={24} className="text-primary" />
                                </div>
                            </Card.Body>
                        </Card>
                    </Link>
                </Col>
                <Col md={3}>
                    <Link to="/requirements" style={{ textDecoration: 'none' }}>
                        <Card className="mb-3 metric-card-link">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Requirements</h6>
                                        <h3>{loading ? <Spinner animation="border" size="sm" /> : metrics.totalRequirements}</h3>
                                    </div>
                                    <FaFileContract size={24} className="text-success" />
                                </div>
                            </Card.Body>
                        </Card>
                    </Link>
                </Col>
                <Col md={3}>
                    <Link to="/tasks" style={{ textDecoration: 'none' }}>
                        <Card className="mb-3 metric-card-link">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Tasks</h6>
                                        <h3>{loading ? <Spinner animation="border" size="sm" /> : metrics.totalTasks}</h3>
                                    </div>
                                    <FaTasks size={24} className="text-warning" />
                                </div>
                            </Card.Body>
                        </Card>
                    </Link>
                </Col>
                <Col md={3}>
                    <Link to="/tasks?filter=automated" style={{ textDecoration: 'none' }}>
                        <Card className="mb-3 metric-card-link">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Automated Checks</h6>
                                        <h3>{loading ? <Spinner animation="border" size="sm" /> : metrics.automatedChecks}</h3>
                                    </div>
                                    <FaCogs size={24} className="text-info" />
                                </div>
                            </Card.Body>
                        </Card>
                    </Link>
                </Col>
                <Col md={3}>
                    <Link to="/risks" style={{ textDecoration: 'none' }}>
                        <Card className="mb-3 metric-card-link">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Identified Risks</h6>
                                        <h3>{loading ? <Spinner animation="border" size="sm" /> : metrics.totalRisks}</h3>
                                    </div>
                                    <FaExclamationTriangle size={24} className="text-danger" />
                                </div>
                            </Card.Body>
                        </Card>
                    </Link>
                </Col>
            </Row>
            {/* Render the main dashboard widgets and metrics below */}
            <Dashboard />
        </div>
    );
}

export default DashboardPage; 