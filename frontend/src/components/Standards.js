import React, { useState, useEffect, useCallback } from 'react';
import {
    getComplianceStandards, createComplianceStandard, updateStandard,
    getRequirements, // Import getRequirements
    getTasks // Import getTasks
} from '../services/api';
import { Link } from 'react-router-dom'; // Import Link
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Row from 'react-bootstrap/Row';
import Accordion from 'react-bootstrap/Accordion'; // Import Accordion
import Col from 'react-bootstrap/Col';

import {
    FaShieldAlt,
    FaPlusCircle,
    FaListUl,
    FaFileSignature,
    FaFingerprint,
    FaAlignLeft,
    FaEdit,
    FaWindowClose,
    FaInfoCircle,
    FaLink,
    FaBuilding,
    FaTasks as FaTasksIcon, // Alias for task icon
    FaFileContract,
    FaTag,
    FaExclamationCircle,
    FaFileMedicalAlt,
    FaCog,
    FaCogs,
    FaTasks
} from 'react-icons/fa';
import { Badge, Spinner } from 'react-bootstrap';
import ThreeColumnView from './views/ThreeColumnView';

function Standards() {
    const [standards, setStandards] = useState([]);
    const [newName, setNewName] = useState('');
    const [newShortName, setNewShortName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newVersion, setNewVersion] = useState('');
    const [newIssuingBody, setNewIssuingBody] = useState('');
    const [newOfficialLink, setNewOfficialLink] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingStandardId, setEditingStandardId] = useState(null);
    const [activeTabKey, setActiveTabKey] = useState('existing');
    const [allRequirements, setAllRequirements] = useState([]);
    const [allTasks, setAllTasks] = useState([]);

    const [selectedStandardId, setSelectedStandardId] = useState(null);
    const [selectedRequirementId, setSelectedRequirementId] = useState(null);


    const fetchStandards = useCallback(async () => {
        try {
            const response = await getComplianceStandards();
            setStandards(Array.isArray(response.data) ? response.data : []);

        } catch (error) {
            console.error("Error fetching compliance standards:", error);
            setError('Failed to fetch compliance standards.');
            setStandards([]);
        }
    }, []);

    const fetchRequirementsAndTasks = useCallback(async () => {
        try {
            const reqResponse = await getRequirements();
            setAllRequirements(Array.isArray(reqResponse.data) ? reqResponse.data : []);
        } catch (error) {
            console.error("Error fetching requirements:", error);
            setError(prev => prev + ' Failed to fetch requirements.');
        }
        try {
            const taskResponse = await getTasks(); // Assuming getTasks fetches all master tasks
            setAllTasks(Array.isArray(taskResponse.data) ? taskResponse.data : []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setError(prev => prev + ' Failed to fetch tasks.');
        }
    }, []);

    useEffect(() => {
        fetchStandards();
        fetchRequirementsAndTasks(); // Fetch requirements and tasks as well
    }, [fetchStandards, fetchRequirementsAndTasks]);



    const handleSubmitStandard = async (e) => {
        e.preventDefault();
        const name = newName.trim();
        if (!newName.trim() || !newShortName.trim()) {
            setError("Name and Short Name are required.");
            setSuccess('');
            return;
        }

        const standardData = {
            name: name,
            shortName: newShortName.trim(),
            description: newDescription.trim(),
            version: newVersion.trim() || null,
            issuing_body: newIssuingBody.trim() || null,
            official_link: newOfficialLink.trim() || null,
        };

        try {
            if (editingStandardId) {
                await updateStandard(editingStandardId, standardData);
                setSuccess('Compliance standard updated successfully!');
            } else {
                await createComplianceStandard(standardData);
                setSuccess('Compliance standard created successfully!');
            }
            setError('');
            setNewName('');
            setNewShortName('');
            setNewDescription('');
            setNewVersion('');
            setNewIssuingBody('');
            setNewOfficialLink('');
            fetchStandards(); // Refresh the list
            setEditingStandardId(null);
            setActiveTabKey('existing');
        } catch (error) {
            const action = editingStandardId ? "update" : "create";
            console.error(`Error ${action} compliance standard:`, error.response ? error.response.data : error.message);
            setError(`Failed to ${action} compliance standard. ${error.response && error.response.data && error.response.data.error ? error.response.data.error : 'An unexpected error occurred.'}`);
            setSuccess('');
        }
    };

    const handleEditStandard = (std) => {
        setEditingStandardId(std.id);
        setNewName(std.name || '');
        setNewShortName(std.shortName || '');
        setNewDescription(std.description || '');
        setNewVersion(std.version || '');
        setNewIssuingBody(std.issuing_body || '');
        setNewOfficialLink(std.official_link || '');
        setActiveTabKey('create');
        setError('');
        setSuccess('');
    };

    const handleCancelEdit = () => {
        setEditingStandardId(null);
        setNewName('');
        setNewShortName('');
        setNewDescription('');
        setNewVersion('');
        setNewIssuingBody('');
        setNewOfficialLink('');
        setActiveTabKey('existing');
        setError(''); setSuccess('');
    };

    const getPriorityBadgeColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'critical': return 'danger';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'secondary';
            default: return 'light';
        }
    };

    const handleRequirementSelect = (requirementId) => {
        const newSelectedRequirementId = selectedRequirementId === requirementId ? null : requirementId;
        setSelectedRequirementId(newSelectedRequirementId);
        // if (newSelectedRequirementId) {
        //     fetchTasksByRequirement(newSelectedRequirementId);
        // } else {
        //     setTasks([]);
        // }
    };


    const [loadingRequirements, setLoadingRequirements] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);

    return (
        <div>
            <h2 className="mb-4">Compliance Standards</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Tabs activeKey={activeTabKey} onSelect={(k) => setActiveTabKey(k)} id="standards-tabs" className="mb-3 nav-line-tabs">
                <Tab eventKey="create" title={<><FaPlusCircle className="me-1" />{editingStandardId ? 'Edit Standard' : 'Create New Standard'}</>}>
                    <Card className="mb-4">

                        <Card.Body>
                            <Form onSubmit={handleSubmitStandard}>
                                <Row>
                                    <Col md={8}>
                                        <FloatingLabel controlId="floatingStandardName" label={<><FaFileSignature className="me-1" />Standard Name*</>} className="mb-3">
                                            <Form.Control
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                placeholder="Standard Name (e.g., NYDFS Cybersecurity Regulation)"
                                                aria-describedby="standardNameHelp"
                                                required
                                            />
                                            <Form.Text id="standardNameHelp" muted>
                                                The full official name of the compliance standard.
                                            </Form.Text>
                                        </FloatingLabel>
                                    </Col>
                                    <Col md={4}>
                                        <FloatingLabel controlId="floatingShortName" label={<><FaFingerprint className="me-1" />Short Name*</>} className="mb-3">
                                            <Form.Control
                                                type="text"
                                                value={newShortName}
                                                onChange={(e) => setNewShortName(e.target.value)}
                                                placeholder="Short Name (e.g., NYDFS)"
                                                aria-describedby="shortNameHelp"
                                                required
                                            />
                                            <Form.Text id="shortNameHelp" muted>
                                                Common abbreviation (e.g., PCI DSS).
                                            </Form.Text>
                                        </FloatingLabel>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={4}>
                                        <FloatingLabel controlId="floatingVersion" label={<><FaInfoCircle className="me-1" />Version</>} className="mb-3">
                                            <Form.Control
                                                type="text"
                                                value={newVersion}
                                                onChange={(e) => setNewVersion(e.target.value)}
                                                placeholder="e.g., v1.2, 2022 Edition"
                                            />
                                        </FloatingLabel>
                                    </Col>
                                    <Col md={8}>
                                        <FloatingLabel controlId="floatingIssuingBody" label={<><FaBuilding className="me-1" />Issuing Body</>} className="mb-3">
                                            <Form.Control
                                                type="text"
                                                value={newIssuingBody}
                                                onChange={(e) => setNewIssuingBody(e.target.value)}
                                                placeholder="e.g., ISO, NIST, PCI SSC"
                                            />
                                        </FloatingLabel>
                                    </Col>
                                </Row>
                                <FloatingLabel controlId="floatingDescription" label={<><FaAlignLeft className="me-1" />Description</>} className="mb-3">
                                    <Form.Control
                                        as="textarea"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Description"
                                        style={{ height: '100px' }}
                                        aria-describedby="descriptionHelp"
                                    />
                                    <Form.Text id="descriptionHelp" muted>
                                        A brief overview or purpose of the standard.
                                    </Form.Text>
                                </FloatingLabel>
                                <FloatingLabel controlId="floatingOfficialLink" label={<><FaLink className="me-1" />Link to Official Document</>} className="mb-3">
                                    <Form.Control
                                        type="url"
                                        value={newOfficialLink}
                                        onChange={(e) => setNewOfficialLink(e.target.value)}
                                        placeholder="https://example.com/official-standard.pdf"
                                    />
                                </FloatingLabel>
                                <Button variant="primary" type="submit" className="me-2">
                                    {editingStandardId ? <><FaEdit className="me-1" />Update Standard</> : <><FaPlusCircle className="me-1" />Add Standard</>}
                                </Button>
                                {editingStandardId && (
                                    <Button variant="outline-secondary" onClick={handleCancelEdit}><FaWindowClose className="me-1" />Cancel Edit</Button>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="existing" title={<><FaListUl className="me-1" />Existing Standards</>}>

                    {standards.length === 0 && <Alert variant="info">No standards found.</Alert>}
                    <div >

{standards.length > 0 && (
                        <ThreeColumnView
                            showPageHeader={false}
                            standardActions={(std) => (
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleEditStandard(std); }}
                                    title="Edit Standard"
                                >
                                    <FaEdit />
                                </Button>
                            )}
                        />
                    )}
                    
                    </div>
                </Tab>
            </Tabs>

        </div>
    );
}

export default Standards;