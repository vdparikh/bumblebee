import React from 'react';
import { Card, ListGroup, Button, Image, Row, Col, Accordion } from 'react-bootstrap';
import { FaQuestionCircle, FaLink, FaSlack, FaBook, FaLifeRing, FaExternalLinkAlt } from 'react-icons/fa';

const HelpSupportPanel = () => {
    return (
        <div className="help-support-panel">
            <Card className="mb-3 shadow-sm">
                <Card.Header as="h5" className="d-flex align-items-center">
                    <FaLifeRing className="me-2 text-secondary" /> Help & Support
                </Card.Header>
                <Card.Body>
                    <div className='text-center mb-2'><Image height={150} src={process.env.PUBLIC_URL + '/logo.webp'} /></div>
                    <p>
                        Welcome to the <strong>Bumblebee</strong> - Your Compliance Automation Platform! Find resources below to help you get started and troubleshoot any issues.
                    </p>
                </Card.Body>
            </Card>

            <Card className="mb-3 shadow-sm">
                <Card.Header as="h6">
                    <FaQuestionCircle className="me-2 text-success" /> Frequently Asked Questions
                </Card.Header>
                <Accordion flush>
                    <Accordion.Item eventKey="0">
                        <Accordion.Header>How do I create a new campaign?</Accordion.Header>
                        <Accordion.Body>
                            To create a new campaign, navigate to the "Campaigns" section from the sidebar. Click on the "New Campaign" button. You'll be prompted to fill in details such as the campaign name, description, select a compliance standard, set start and end dates, and choose the specific requirements to include in the campaign. Once all necessary information is provided, save the campaign. Task instances will be automatically generated for applicable requirements.
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="1">
                        <Accordion.Header>Where can I find my assigned tasks?</Accordion.Header>
                        <Accordion.Body>
                            You can find all tasks assigned to you or that you own by clicking on "My Tasks" in the sidebar. This page lists all your active and pending campaign task instances, allowing you to manage their status, due dates, and evidence.
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="2">
                        <Accordion.Header>How to upload evidence?</Accordion.Header>
                        <Accordion.Body>
                            When viewing a specific task instance (from "My Tasks" or a Campaign's detail page), navigate to the "Evidence" tab. You can upload files directly, provide links to external resources, or add textual evidence. Ensure you provide a clear description for each piece of evidence. You can also copy evidence from other tasks if applicable.
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="3">
                        <Accordion.Header>Understanding task statuses.</Accordion.Header>
                        <Accordion.Body>
                            Task statuses help track progress:
                            <ul>
                                <li><strong>Open:</strong> The task is new and work has not started.</li>
                                <li><strong>In Progress:</strong> Work has begun on the task.</li>
                                <li><strong>Pending Review:</strong> The task is completed and awaiting review/approval.</li>
                                <li><strong>Closed:</strong> The task has been successfully completed and verified.</li>
                                <li><strong>Failed:</strong> The task could not be completed successfully or did not meet requirements.</li>
                            </ul>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
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
