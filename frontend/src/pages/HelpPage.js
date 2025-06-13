import React from 'react';
import { Container, Row, Col, Card, Nav, Tab, Accordion, ListGroup } from 'react-bootstrap';
import { 
    FaBook, FaQuestionCircle, FaTasks, FaBullhorn, FaFileUpload, 
    FaUserShield, FaCogs, FaChartLine, FaUsers, FaHistory,
    FaFileAlt, FaLink, FaCode, FaDatabase, FaServer, FaShieldAlt
} from 'react-icons/fa';
import PageHeader from '../components/common/PageHeader';

const HelpPage = () => {
    return (
        <Container fluid>
            <PageHeader 
                title="Help & Documentation" 
                subtitle="Comprehensive guides and documentation for the Compliance Automation Platform"
            />

            <Row>
                <Col md={3}>
                    <Card className="mb-4">
                        <Card.Header>
                            <FaBook className="me-2" /> Navigation
                        </Card.Header>
                        <ListGroup variant="flush">
                            <ListGroup.Item action href="#getting-started">Getting Started</ListGroup.Item>
                            <ListGroup.Item action href="#campaigns">Campaigns</ListGroup.Item>
                            <ListGroup.Item action href="#tasks">Tasks & Evidence</ListGroup.Item>
                            <ListGroup.Item action href="#automation">Automated Checks</ListGroup.Item>
                            <ListGroup.Item action href="#roles">User Roles & Permissions</ListGroup.Item>
                            <ListGroup.Item action href="#library">Compliance Library</ListGroup.Item>
                            <ListGroup.Item action href="#audit">Audit & Reporting</ListGroup.Item>
                        </ListGroup>
                    </Card>
                </Col>

                <Col md={9}>
                    <section id="getting-started" className="mb-5">
                        <h2><FaQuestionCircle className="me-2" /> Getting Started</h2>
                        <Card className="mb-4">
                            <Card.Body>
                                <h5>Welcome to the Compliance Automation Platform</h5>
                                <p>This platform helps organizations manage and automate their compliance requirements efficiently. Here's how to get started:</p>
                                
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>Platform Overview</Accordion.Header>
                                        <Accordion.Body>
                                            <p>The platform consists of several key components:</p>
                                            <ul>
                                                <li><strong>Campaigns:</strong> Manage compliance initiatives and track progress</li>
                                                <li><strong>Tasks:</strong> Individual compliance requirements to be completed</li>
                                                <li><strong>Evidence:</strong> Documentation and proof of compliance</li>
                                                <li><strong>Automated Checks:</strong> Automated verification of compliance requirements</li>
                                                <li><strong>Library:</strong> Central repository of compliance standards and requirements</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>First Steps</Accordion.Header>
                                        <Accordion.Body>
                                            <ol>
                                                <li>Review your assigned tasks in the "My Tasks" section</li>
                                                <li>Familiarize yourself with the compliance standards in the Library</li>
                                                <li>Start working on your assigned tasks and upload evidence</li>
                                                <li>Use automated checks where available to streamline compliance verification</li>
                                            </ol>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Card.Body>
                        </Card>
                    </section>

                    <section id="campaigns" className="mb-5">
                        <h2><FaBullhorn className="me-2" /> Campaigns</h2>
                        <Card className="mb-4">
                            <Card.Body>
                                <h5>Managing Compliance Campaigns</h5>
                                <p>Campaigns are the primary way to organize and track compliance initiatives.</p>
                                
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>Creating a Campaign</Accordion.Header>
                                        <Accordion.Body>
                                            <ol>
                                                <li>Navigate to the Campaigns section</li>
                                                <li>Click "New Campaign"</li>
                                                <li>Select the compliance standard</li>
                                                <li>Choose requirements to include</li>
                                                <li>Set start and end dates</li>
                                                <li>Assign team members</li>
                                            </ol>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>Campaign Management</Accordion.Header>
                                        <Accordion.Body>
                                            <ul>
                                                <li>Track overall progress and status</li>
                                                <li>Monitor individual task completion</li>
                                                <li>Review and approve evidence</li>
                                                <li>Generate compliance reports</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Card.Body>
                        </Card>
                    </section>

                    <section id="tasks" className="mb-5">
                        <h2><FaTasks className="me-2" /> Tasks & Evidence</h2>
                        <Card className="mb-4">
                            <Card.Body>
                                <h5>Working with Tasks and Evidence</h5>
                                <p>Tasks represent individual compliance requirements that need to be completed.</p>
                                
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>Task Management</Accordion.Header>
                                        <Accordion.Body>
                                            <ul>
                                                <li>View assigned tasks in "My Tasks"</li>
                                                <li>Update task status as you progress</li>
                                                <li>Add comments and notes</li>
                                                <li>Request reviews when ready</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>Evidence Collection</Accordion.Header>
                                        <Accordion.Body>
                                            <p>Types of evidence you can upload:</p>
                                            <ul>
                                                <li>Document files (PDF, Word, etc.)</li>
                                                <li>Images and screenshots</li>
                                                <li>Links to external resources</li>
                                                <li>Text descriptions</li>
                                                <li>Automated check results</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Card.Body>
                        </Card>
                    </section>

                    <section id="automation" className="mb-5">
                        <h2><FaCogs className="me-2" /> Automated Checks</h2>
                        <Card className="mb-4">
                            <Card.Body>
                                <h5>Using Automated Compliance Checks</h5>
                                <p>The platform supports various types of automated checks to verify compliance requirements.</p>
                                
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>Available Check Types</Accordion.Header>
                                        <Accordion.Body>
                                            <ul>
                                                <li><FaDatabase /> Database Query Checks</li>
                                                <li><FaServer /> AWS Security Group Checks</li>
                                                <li><FaShieldAlt /> Azure Policy Checks</li>
                                                <li><FaCode /> GitHub Repository Checks</li>
                                                <li><FaFileAlt /> File Permission Checks</li>
                                                <li><FaLink /> SSL Certificate Checks</li>
                                                <li><FaCogs /> System Configuration Checks</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>Running Automated Checks</Accordion.Header>
                                        <Accordion.Body>
                                            <ol>
                                                <li>Select the appropriate check type</li>
                                                <li>Configure check parameters</li>
                                                <li>Run the check</li>
                                                <li>Review results</li>
                                                <li>Use results as evidence</li>
                                            </ol>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Card.Body>
                        </Card>
                    </section>

                    <section id="roles" className="mb-5">
                        <h2><FaUserShield className="me-2" /> User Roles & Permissions</h2>
                        <Card className="mb-4">
                            <Card.Body>
                                <h5>Understanding User Roles</h5>
                                <p>Different user roles have different permissions and responsibilities.</p>
                                
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>Role Types</Accordion.Header>
                                        <Accordion.Body>
                                            <ul>
                                                <li><strong>Admin:</strong> Full system access and management</li>
                                                <li><strong>Auditor:</strong> Review and approve compliance evidence</li>
                                                <li><strong>User:</strong> Complete assigned tasks and upload evidence</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>Role Permissions</Accordion.Header>
                                        <Accordion.Body>
                                            <h6>Admin Permissions</h6>
                                            <ul>
                                                <li>Manage users and roles</li>
                                                <li>Configure system settings</li>
                                                <li>Manage compliance library</li>
                                                <li>Access all features</li>
                                            </ul>
                                            <h6>Auditor Permissions</h6>
                                            <ul>
                                                <li>Review and approve evidence</li>
                                                <li>Generate reports</li>
                                                <li>View audit logs</li>
                                            </ul>
                                            <h6>User Permissions</h6>
                                            <ul>
                                                <li>Complete assigned tasks</li>
                                                <li>Upload evidence</li>
                                                <li>View own progress</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Card.Body>
                        </Card>
                    </section>

                    <section id="library" className="mb-5">
                        <h2><FaBook className="me-2" /> Compliance Library</h2>
                        <Card className="mb-4">
                            <Card.Body>
                                <h5>Managing Compliance Standards</h5>
                                <p>The Compliance Library is your central repository for standards and requirements.</p>
                                
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>Library Structure</Accordion.Header>
                                        <Accordion.Body>
                                            <ul>
                                                <li><strong>Standards:</strong> Top-level compliance frameworks</li>
                                                <li><strong>Requirements:</strong> Specific compliance requirements</li>
                                                <li><strong>Tasks:</strong> Actionable items for each requirement</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>Library Management</Accordion.Header>
                                        <Accordion.Body>
                                            <p>Administrators can:</p>
                                            <ul>
                                                <li>Add new compliance standards</li>
                                                <li>Create and edit requirements</li>
                                                <li>Define tasks and check types</li>
                                                <li>Organize content hierarchically</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Card.Body>
                        </Card>
                    </section>

                    <section id="audit" className="mb-5">
                        <h2><FaHistory className="me-2" /> Audit & Reporting</h2>
                        <Card className="mb-4">
                            <Card.Body>
                                <h5>Audit Trail and Reporting</h5>
                                <p>Track all activities and generate compliance reports.</p>
                                
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>Audit Logs</Accordion.Header>
                                        <Accordion.Body>
                                            <p>The system maintains detailed audit logs of:</p>
                                            <ul>
                                                <li>User actions and changes</li>
                                                <li>Evidence uploads and modifications</li>
                                                <li>Task status changes</li>
                                                <li>Review and approval activities</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>Reporting</Accordion.Header>
                                        <Accordion.Body>
                                            <p>Available reports include:</p>
                                            <ul>
                                                <li>Campaign progress reports</li>
                                                <li>Compliance status summaries</li>
                                                <li>Evidence review reports</li>
                                                <li>User activity reports</li>
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Card.Body>
                        </Card>
                    </section>
                </Col>
            </Row>
        </Container>
    );
};

export default HelpPage; 