import React from 'react';
import { Modal, Button, Badge, ListGroup, ListGroupItem, Row, Col } from 'react-bootstrap';
import { FaExclamationTriangle, FaTag, FaUserCircle, FaInfoCircle, FaChartLine, FaWeightHanging, FaCheckCircle } from 'react-icons/fa';
import UserDisplay from '../common/UserDisplay';

const RiskDetailModal = ({ show, onHide, risk, allUsers }) => {
    if (!risk) {
        return null;
    }

    const getLikelihoodImpactColor = (value) => {
        switch (value?.toLowerCase()) {
            case 'very low': return 'success';
            case 'low': return 'info';
            case 'medium': return 'warning';
            case 'high': return 'danger';
            case 'very high': return 'dark';
            default: return 'secondary';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'open': return 'danger';
            case 'mitigated': return 'info';
            case 'accepted': return 'warning';
            case 'closed': return 'success';
            default: return 'secondary';
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title><FaExclamationTriangle className="me-2 text-danger" />Risk Details: {risk.riskId}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ListGroup variant="flush">
                    <ListGroupItem>
                        <strong>Title:</strong> {risk.title}
                    </ListGroupItem>
                    {risk.description && (
                        <ListGroupItem>
                            <strong>Description:</strong> {risk.description}
                        </ListGroupItem>
                    )}
                    <Row>
                        <Col md={6}>
                            <ListGroupItem>
                                <strong>Category:</strong> <Badge bg="secondary">{risk.category || 'N/A'}</Badge>
                            </ListGroupItem>
                        </Col>
                        <Col md={6}>
                            <ListGroupItem>
                                <strong>Status:</strong> <Badge bg={getStatusColor(risk.status)}>{risk.status}</Badge>
                            </ListGroupItem>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <ListGroupItem>
                                <strong>Likelihood:</strong> <Badge bg={getLikelihoodImpactColor(risk.likelihood)}>{risk.likelihood || 'N/A'}</Badge>
                            </ListGroupItem>
                        </Col>
                        <Col md={6}>
                            <ListGroupItem>
                                <strong>Impact:</strong> <Badge bg={getLikelihoodImpactColor(risk.impact)}>{risk.impact || 'N/A'}</Badge>
                            </ListGroupItem>
                        </Col>
                    </Row>
                    <ListGroupItem>
                        <strong>Owner:</strong> <UserDisplay userId={risk.ownerUserId} allUsers={allUsers} />
                    </ListGroupItem>
                    {risk.requirements && risk.requirements.length > 0 && (
                        <ListGroupItem>
                            <strong>Linked Requirements:</strong>
                            {risk.requirements.map(req => (
                                <Badge key={req.id} bg="info" className="ms-2">{req.controlIdReference}</Badge>
                            ))}
                        </ListGroupItem>
                    )}
                </ListGroup>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default RiskDetailModal;