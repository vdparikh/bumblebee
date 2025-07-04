import React from 'react';
import { Card, ListGroup, Button, Image, Row, Col, Accordion } from 'react-bootstrap';
import { FaQuestionCircle, FaLink, FaSlack, FaBook, FaLifeRing, FaExternalLinkAlt, FaTasks, FaBullhorn, FaFileUpload, FaUserShield, FaCogs, FaChartLine, FaUsers, FaHistory } from 'react-icons/fa';
import { Link } from 'react-router-dom';

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
                    <Button as={Link} to="/help" variant="primary" className="w-100">
                        <FaBook className="me-2" /> View Full Documentation
                    </Button>
                </Card.Body>
            </Card>

            <Card className="mb-3 shadow-sm">
                <Card.Header as="h6">
                    <FaQuestionCircle className="me-2 text-success" /> Quick Help
                </Card.Header>
                <Accordion flush>
                    <Accordion.Item eventKey="0">
                        <Accordion.Header>
                            <FaTasks className="me-2 text-primary" /> Tasks & Evidence
                        </Accordion.Header>
                        <Accordion.Body>
                            <Accordion>
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>How do I upload evidence?</Accordion.Header>
                                    <Accordion.Body>
                                        <ol>
                                            <li>Navigate to the task details page</li>
                                            <li>Click the "Evidence" tab</li>
                                            <li>Click "Upload Evidence"</li>
                                            <li>Choose your evidence type:
                                                <ul>
                                                    <li>File upload for documents</li>
                                                    <li>URL for external resources</li>
                                                    <li>Text for descriptions</li>
                                                    <li>Automated check results</li>
                                                </ul>
                                            </li>
                                            <li>Add a description and submit</li>
                                        </ol>
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="1">
                                    <Accordion.Header>How do I update task status?</Accordion.Header>
                                    <Accordion.Body>
                                        <ol>
                                            <li>Open the task details</li>
                                            <li>Click the status dropdown</li>
                                            <li>Select the new status:
                                                <ul>
                                                    <li>Open: Not started</li>
                                                    <li>In Progress: Working on it</li>
                                                    <li>Pending Review: Ready for review</li>
                                                    <li>Closed: Completed and approved</li>
                                                    <li>Failed: Could not complete</li>
                                                </ul>
                                            </li>
                                            <li>Add any relevant comments</li>
                                            <li>Save changes</li>
                                        </ol>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="1">
                        <Accordion.Header>
                            <FaBullhorn className="me-2 text-warning" /> Campaigns
                        </Accordion.Header>
                        <Accordion.Body>
                            <Accordion>
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>How do I create a campaign?</Accordion.Header>
                                    <Accordion.Body>
                                        <ol>
                                            <li>Go to "Campaigns" in the sidebar</li>
                                            <li>Click "New Campaign"</li>
                                            <li>Fill in the details:
                                                <ul>
                                                    <li>Campaign name and description</li>
                                                    <li>Select compliance standard</li>
                                                    <li>Choose requirements to include</li>
                                                    <li>Set start and end dates</li>
                                                    <li>Assign team members</li>
                                                </ul>
                                            </li>
                                            <li>Review and save</li>
                                        </ol>
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="1">
                                    <Accordion.Header>How do I track campaign progress?</Accordion.Header>
                                    <Accordion.Body>
                                        <ul>
                                            <li>View the campaign dashboard for overall progress</li>
                                            <li>Check task completion rates</li>
                                            <li>Monitor evidence collection status</li>
                                            <li>Review pending approvals</li>
                                            <li>Generate progress reports</li>
                                        </ul>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="2">
                        <Accordion.Header>
                            <FaCogs className="me-2 text-info" /> Automated Checks
                        </Accordion.Header>
                        <Accordion.Body>
                            <Accordion>
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>What types of checks are available?</Accordion.Header>
                                    <Accordion.Body>
                                        <ul>
                                            <li>Database Query Checks</li>
                                            <li>AWS Security Group Checks</li>
                                            <li>Azure Policy Checks</li>
                                            <li>GitHub Repository Checks</li>
                                            <li>File Permission Checks</li>
                                            <li>SSL Certificate Checks</li>
                                            <li>System Configuration Checks</li>
                                        </ul>
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="1">
                                    <Accordion.Header>How do I run an automated check?</Accordion.Header>
                                    <Accordion.Body>
                                        <ol>
                                            <li>Select the appropriate check type</li>
                                            <li>Configure the check parameters</li>
                                            <li>Run the check</li>
                                            <li>Review the results</li>
                                            <li>Use the results as evidence</li>
                                        </ol>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="3">
                        <Accordion.Header>
                            <FaUserShield className="me-2 text-danger" /> Roles & Permissions
                        </Accordion.Header>
                        <Accordion.Body>
                            <Accordion>
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>What are the different user roles?</Accordion.Header>
                                    <Accordion.Body>
                                        <ul>
                                            <li><strong>Admin:</strong> Full system access</li>
                                            <li><strong>Auditor:</strong> Review and approve evidence</li>
                                            <li><strong>User:</strong> Complete assigned tasks</li>
                                        </ul>
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="1">
                                    <Accordion.Header>How do I request role changes?</Accordion.Header>
                                    <Accordion.Body>
                                        <p>Contact your system administrator to request role changes. You can:</p>
                                        <ul>
                                            <li>Email: admin@example.com</li>
                                            <li>Use the #admin-support Slack channel</li>
                                            <li>Submit a ticket in the help desk</li>
                                        </ul>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            </Card>

            <Card className="mb-3 shadow-sm">
                <Card.Header as="h6">
                    <FaBook className="me-2 text-info" /> Documentation & Guides
                </Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item action as={Link} to="/help">
                        <FaBook className="me-2" /> User Guide
                    </ListGroup.Item>
                    <ListGroup.Item action as={Link} to="/help#automation">
                        <FaCogs className="me-2" /> Automation Guide
                    </ListGroup.Item>
                    <ListGroup.Item action as={Link} to="/help#roles">
                        <FaUserShield className="me-2" /> Role Management
                    </ListGroup.Item>
                    <ListGroup.Item action as={Link} to="/help#audit">
                        <FaHistory className="me-2" /> Audit & Reporting
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
