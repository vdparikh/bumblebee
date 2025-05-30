import React, { useState, useEffect, useCallback } from 'react';
import { getComplianceStandards, createComplianceStandard, updateStandard } from '../services/api';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import {
    FaShieldAlt,
    FaPlusCircle,
    FaListUl,
    FaFileSignature,
    FaFingerprint,
    FaAlignLeft,
    FaEdit,
    FaWindowClose
} from 'react-icons/fa';

function Standards() {
    const [standards, setStandards] = useState([]);
    const [newName, setNewName] = useState('');
    const [newShortName, setNewShortName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingStandardId, setEditingStandardId] = useState(null);
    const [activeTabKey, setActiveTabKey] = useState('existing');

    const fetchStandards = useCallback(async () => {
        try {
            const response = await getComplianceStandards();
            setStandards(Array.isArray(response.data) ? response.data : []);
            // setError(''); // Clear previous errors on successful fetch
        } catch (error) {
            console.error("Error fetching compliance standards:", error);
            setError('Failed to fetch compliance standards.');
            setStandards([]); // Ensure standards is an array on error
        }
    }, []);

    useEffect(() => {
        fetchStandards();
    }, [fetchStandards]);

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
        setActiveTabKey('create');
        setError('');
        setSuccess('');
    };

    const handleCancelEdit = () => {
        setEditingStandardId(null);
        setNewName('');
        setNewShortName('');
        setNewDescription('');
        setActiveTabKey('existing');
        setError(''); setSuccess('');
    };

    return (
        <div>
            <h2 className="mb-4"><FaShieldAlt className="me-2"/>Compliance Standards</h2>
            
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Tabs activeKey={activeTabKey} onSelect={(k) => setActiveTabKey(k)} id="standards-tabs" className="mb-3 nav-line-tabs">
                <Tab eventKey="create" title={<><FaPlusCircle className="me-1"/>{editingStandardId ? 'Edit Standard' : 'Create New Standard'}</>}>
                    <Card className="mb-4">
                        {/* <Card.Header as="h5">Create New Standard</Card.Header> */}
                        <Card.Body>
                            <Form onSubmit={handleSubmitStandard}>
                                <FloatingLabel controlId="floatingStandardName" label={<><FaFileSignature className="me-1"/>Standard Name*</>} className="mb-3">
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
        
                                <FloatingLabel controlId="floatingShortName" label={<><FaFingerprint className="me-1"/>Short Name*</>} className="mb-3">
                                    <Form.Control 
                                        type="text" 
                                        value={newShortName} 
                                        onChange={(e) => setNewShortName(e.target.value)} 
                                        placeholder="Short Name (e.g., NYDFS)" 
                                        aria-describedby="shortNameHelp"
                                        required 
                                    />
                                    <Form.Text id="shortNameHelp" muted>
                                        A common abbreviation or short identifier (e.g., PCI DSS, HIPAA, ISO 27001).
                                    </Form.Text>
                                </FloatingLabel>
        
                                <FloatingLabel controlId="floatingDescription" label={<><FaAlignLeft className="me-1"/>Description</>} className="mb-3">
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
                                <Button variant="primary" type="submit" className="me-2">
                                    {editingStandardId ? <><FaEdit className="me-1"/>Update Standard</> : <><FaPlusCircle className="me-1"/>Add Standard</>}
                                </Button>
                                {editingStandardId && (
                                    <Button variant="outline-secondary" onClick={handleCancelEdit}><FaWindowClose className="me-1"/>Cancel Edit</Button>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="existing" title={<><FaListUl className="me-1"/>Existing Standards</>}>
                    {/* <h3 className="mb-3">Existing Standards</h3> */}
                    {standards.length === 0 && <Alert variant="info">No standards found.</Alert>}
                    <div >
                        {standards.map(std => (
<Card key={std.id} className="mb-3 shadow-sm">
                                <Card.Header>
                                    <div className="d-flex w-100 justify-content-between">
                                        <FaShieldAlt size="1.5em" className="text-info"/>
                                        <div className="d-flex ms-2 w-100 justify-content-between">
                                               <h5 className="mb-1">{std.name} ({std.shortName})</h5>
                                            <small className="text-muted">ID: {std.id}</small>
                                            </div>
                                        </div>
                                </Card.Header>
                                <Card.Body className=''>
                                <Row className="align-items-start">
                                    {/* <Col xs="auto" className="pe-2 pt-1">
                                        <FaShieldAlt size="1.5em" className="text-info"/>
                                    </Col> */}
                                    <Col >
                                        {/* <div className="d-flex w-100 justify-content-between">
                                            <h5 className="mb-1">{std.name} ({std.shortName})</h5>
                                            <small className="text-muted">ID: {std.id}</small>
                                        </div> */}
                                        <p className="mb-1">{std.description || "No description provided."}</p>
                                    </Col>
                                    <Col xs="auto" className="d-flex align-items-center">
                                        <Button variant="outline-warning" size="sm" onClick={() => handleEditStandard(std)} title="Edit Standard"><FaEdit/></Button>
                                    </Col>
                                </Row>
                                </Card.Body>                                
                            </Card>
                        ))}
                    </div>
                </Tab>
            </Tabs>

        </div>
    );
}

export default Standards;