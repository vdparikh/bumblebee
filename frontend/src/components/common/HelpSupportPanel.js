import React from 'react';
import { Card, ListGroup, Button, Image, Row, Col } from 'react-bootstrap';
import { FaQuestionCircle, FaLink, FaSlack, FaBook, FaLifeRing, FaExternalLinkAlt } from 'react-icons/fa';

const HelpSupportPanel = () => {
    return (
        <div className="help-support-panel">
            <Card className="mb-3 shadow-sm">
                <Card.Header as="h5" className="d-flex align-items-center">
                    <FaLifeRing className="me-2 text-primary" /> Help & Support
                </Card.Header>
                <Card.Body>
                    <p>
                        Welcome to the Compliance Automation Platform! Find resources below to help you get started and troubleshoot any issues.
                    </p>
                </Card.Body>
            </Card>

            <Card className="mb-3 shadow-sm">
                <Card.Header as="h6">
                    <FaQuestionCircle className="me-2 text-success" /> Frequently Asked Questions
                </Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item action href="#faq-1" onClick={(e) => e.preventDefault()}>How do I create a new campaign?</ListGroup.Item>
                    <ListGroup.Item action href="#faq-2" onClick={(e) => e.preventDefault()}>Where can I find my assigned tasks?</ListGroup.Item>
                    <ListGroup.Item action href="#faq-3" onClick={(e) => e.preventDefault()}>How to upload evidence?</ListGroup.Item>
                    <ListGroup.Item action href="#faq-4" onClick={(e) => e.preventDefault()}>Understanding task statuses.</ListGroup.Item>
                </ListGroup>
            </Card>

            <Card className="mb-3 shadow-sm">
                <Card.Header as="h6">
                    <FaBook className="me-2 text-info" /> Documentation & Guides
                </Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item action href="https://example.com/user-guide" target="_blank" rel="noopener noreferrer">
                        User Guide <FaExternalLinkAlt size="0.8em" className="ms-1" />
                    </ListGroup.Item>
                    <ListGroup.Item action href="https://example.com/api-docs" target="_blank" rel="noopener noreferrer">
                        API Documentation <FaExternalLinkAlt size="0.8em" className="ms-1" />
                    </ListGroup.Item>
                    <ListGroup.Item action href="https://example.com/tutorials" target="_blank" rel="noopener noreferrer">
                        Video Tutorials <FaExternalLinkAlt size="0.8em" className="ms-1" />
                    </ListGroup.Item>
                </ListGroup>
            </Card>

            <Card className="mb-3 shadow-sm">
                <Card.Header as="h6">
                    <FaLink className="me-2 text-warning" /> Useful Links
                </Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item action href="https://internal.example.com/compliance-portal" target="_blank" rel="noopener noreferrer">
                        Internal Compliance Portal <FaExternalLinkAlt size="0.8em" className="ms-1" />
                    </ListGroup.Item>
                    <ListGroup.Item action href="https://example.com/security-policies" target="_blank" rel="noopener noreferrer">
                        Company Security Policies <FaExternalLinkAlt size="0.8em" className="ms-1" />
                    </ListGroup.Item>
                </ListGroup>
            </Card>

            <Card className="shadow-sm">
                <Card.Header as="h6">
                    <FaSlack className="me-2" style={{ color: '#4A154B' }} /> Get Support
                </Card.Header>
                <Card.Body>
                    <Row className="align-items-center">
                        <Col xs="auto">
                            <Image src="https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png" rounded width={60} alt="Slack Logo" />
                        </Col>
                        <Col>
                            <p className="mb-1">
                                Need direct assistance? Reach out to us on our dedicated Slack channel.
                            </p>
                            <Button variant="primary" href="slack://channel?team=YOUR_TEAM_ID&id=YOUR_CHANNEL_ID" target="_blank" size="sm">
                                #compliance-support <FaExternalLinkAlt size="0.8em" className="ms-1" />
                            </Button>
                            <p className="mt-2 mb-0 small text-muted">
                                You can also email <a href="mailto:support@example.com">support@example.com</a>.
                            </p>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
};

export default HelpSupportPanel;
