import React, { useState, useCallback } from 'react';
import { Row, Col, Card, ListGroup, Button, Alert, Badge } from 'react-bootstrap';
import { FaEdit, FaPlusCircle, FaExclamationTriangle } from 'react-icons/fa';
import UserDisplay from './UserDisplay';
import RiskDetailModal from '../modals/RiskDetailModal';

function RiskManagementView({ risks, allUsers, onAddRisk, onEditRisk }) {
    const [showRiskDetailModal, setShowRiskDetailModal] = useState(false);
    const [selectedRiskData, setSelectedRiskData] = useState(null);

    const handleOpenRiskDetailModal = useCallback((risk) => {
        setSelectedRiskData(risk);
        setShowRiskDetailModal(true);
    }, []);

    const handleCloseRiskDetailModal = useCallback(() => {
        setShowRiskDetailModal(false);
        setSelectedRiskData(null);
    }, []);

    return (
        <Row>
            {/* Left Column: Risk List */}
            <Col md={5}>
                <Card className="h-100">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <h5>All Risks ({risks.length})</h5>
                        <Button variant="primary" size="sm" onClick={onAddRisk}>
                            <FaPlusCircle className="me-2" />Add Risk
                        </Button>
                    </Card.Header>
                    <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                        {risks.length > 0 ? (
                            risks.map(risk => (
                                <ListGroup.Item
                                    key={risk.id}
                                    action
                                    onClick={() => handleOpenRiskDetailModal(risk)}
                                    className="d-flex justify-content-between align-items-center"
                                >
                                    <div>
                                        <strong className="me-2">{risk.riskId}</strong> - {risk.title}
                                        <div className="text-muted small">
                                            <Badge bg="secondary" className="me-2">{risk.category || 'Uncategorized'}</Badge>
                                            Status: {risk.status} | Impact: {risk.impact || 'N/A'} | Likelihood: {risk.likelihood || 'N/A'}
                                        </div>
                                        {risk.ownerUserId && (
                                            <div className="text-muted small mt-1">
                                                Owner: <UserDisplay userId={risk.ownerUserId} allUsers={allUsers} />
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); onEditRisk(risk); }}
                                        title="Edit Risk"
                                    >
                                        <FaEdit />
                                    </Button>
                                </ListGroup.Item>
                            ))
                        ) : (
                            <ListGroup.Item className="text-muted">No risks found.</ListGroup.Item>
                        )}
                    </ListGroup>
                </Card>
            </Col>

            {/* Right Column: Risk Details */}
            <Col md={7}>
                <Card className="h-100">
                    <Card.Header>
                        <h5><FaExclamationTriangle className="me-2" />
                        { selectedRiskData ? selectedRiskData.riskId : 'Risk Details'}
</h5>
                    </Card.Header>
                    <Card.Body className="" flush>
                        {selectedRiskData ? (
                            <RiskDetailModal
                                show={showRiskDetailModal}
                                onHide={handleCloseRiskDetailModal}
                                risk={selectedRiskData}
                                allUsers={allUsers}
                                displayMode='inline'
                            />
                        ) : (
                            <Alert variant="info" className="text-center">
                                Select a risk from the list to view its details.
                            </Alert>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}

export default RiskManagementView;