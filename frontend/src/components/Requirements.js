import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getRequirements, createRequirement, updateRequirement, getComplianceStandards } from '../services/api';
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
    FaListUl,
    FaPlusCircle,
    FaFileContract,
    FaFingerprint,
    FaAlignLeft,
    FaBookOpen,
    FaEdit,
    FaWindowClose
} from 'react-icons/fa';

function Requirements() {
    const [requirements, setRequirements] = useState([]);
    const [complianceStandards, setComplianceStandards] = useState([]); 
    const [newStandardId, setNewStandardId] = useState('');
    const [newControlIdRef, setNewControlIdRef] = useState('');
    const [newRequirementText, setNewRequirementText] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedStandardIdForFilter, setSelectedStandardIdForFilter] = useState('');
    const [filteredRequirements, setFilteredRequirements] = useState([]);
    const [editingRequirementId, setEditingRequirementId] = useState(null);
    const [activeTabKey, setActiveTabKey] = useState('existing');

    const fetchRequirements = useCallback(async () => {
        try {
            const response = await getRequirements();
            setRequirements(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching requirements:", error);
            setError('Failed to fetch requirements.');
            setRequirements([]);
        }
    }, []);

    const fetchComplianceStandards = useCallback(async () => {
        try {
            const response = await getComplianceStandards();
            setComplianceStandards(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching compliance standards for dropdown:", error);
            
            setComplianceStandards([]);
        }
    }, []);

    useEffect(() => {
        fetchRequirements();
        fetchComplianceStandards();
    }, [fetchRequirements, fetchComplianceStandards]);

    useEffect(() => {
        if (selectedStandardIdForFilter) {
            setFilteredRequirements(
                requirements.filter(req => req.standardId === selectedStandardIdForFilter)
            );
        } else {
            setFilteredRequirements(requirements);
        }
    }, [requirements, selectedStandardIdForFilter]);

    const handleSubmitRequirement = async (e) => {
        e.preventDefault();
        const standardId = newStandardId.trim();
        if (!standardId || !newControlIdRef.trim() || !newRequirementText.trim()) {
            setError("Standard ID, Control ID Reference, and Requirement Text are required.");
            setSuccess('');
            return;
        }
        const requirementData = {
            standardId: standardId,
            controlIdReference: newControlIdRef.trim(),
            requirementText: newRequirementText.trim(),
        };

        try {
            if (editingRequirementId) {
                await updateRequirement(editingRequirementId, requirementData);
                setSuccess('Requirement updated successfully!');
            } else {
                await createRequirement(requirementData);
                setSuccess('Requirement created successfully!');
            }
            setError('');
            setNewStandardId('');
            setNewControlIdRef('');
            setNewRequirementText('');
            fetchRequirements(); // Refresh the list
            setEditingRequirementId(null);
            setActiveTabKey('existing');
        } catch (error) {
            const action = editingRequirementId ? "update" : "create";
            console.error(`Error ${action} requirement:`, error.response ? error.response.data : error.message);
            setError(`Failed to ${action} requirement. ${error.response && error.response.data && error.response.data.error ? error.response.data.error : 'An unexpected error occurred.'}`);
            setSuccess('');
        }
    };

    const handleEditRequirement = (req) => {
        setEditingRequirementId(req.id);
        setNewStandardId(req.standardId || '');
        setNewControlIdRef(req.controlIdReference || '');
        setNewRequirementText(req.requirementText || '');
        setActiveTabKey('create');
        setError('');
        setSuccess('');
    };

    const handleCancelEdit = () => {
        setEditingRequirementId(null);
        setNewStandardId('');
        setNewControlIdRef('');
        setNewRequirementText('');
        setActiveTabKey('existing');
        setError(''); setSuccess('');
    };

    const uniqueControlIdReferences = useMemo(() => {
        if (!requirements || requirements.length === 0) return [];
        const refs = requirements.map(req => req.controlIdReference).filter(Boolean);
        return [...new Set(refs)].sort();
    }, [requirements]);

    const getStandardNameById = (standardId) => {
        const standard = complianceStandards.find(s => s.id === standardId);
        return standard ? `${standard.name} (${standard.shortName})` : standardId; 
    };

    return (
        <div>
            <h2 className="mb-4"><FaFileContract className="me-2"/>Compliance Requirements</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Tabs activeKey={activeTabKey} onSelect={(k) => setActiveTabKey(k)} id="requirements-tabs" className="mb-3 nav-line-tabs">
                <Tab eventKey="create" title={<><FaPlusCircle className="me-1"/>{editingRequirementId ? 'Edit Requirement' : 'Create New Requirement'}</>}>
                    <Card className="mb-4">
                        
                        <Card.Body>
                            <Form onSubmit={handleSubmitRequirement}>
                                <FloatingLabel controlId="floatingSelectStandard" label="Compliance Standard*" className="mb-3">
                                    <Form.Select 
                                        aria-label="Select Compliance Standard"
                                        value={newStandardId} // This should be the ID of the standard
                                        onChange={(e) => setNewStandardId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select a Standard</option>
                                        {complianceStandards.map(standard => (
                                            <option key={standard.id} value={standard.id}>
                                                {standard.name} ({standard.shortName})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </FloatingLabel>
        
                                <FloatingLabel controlId="floatingControlIdRef" label={<><FaFingerprint className="me-1"/>Control ID Reference*</>} className="mb-3">
                                    <Form.Control 
                                        type="text" 
                                        value={newControlIdRef} 
                                        onChange={(e) => setNewControlIdRef(e.target.value)} 
                                        placeholder="Control ID Reference (e.g., NYDFS 500.02)"
                                        list="controlIdRef-datalist" 
                                        aria-describedby="controlIdRefHelp"
                                        required 
                                    />
                                    <datalist id="controlIdRef-datalist">
                                        {uniqueControlIdReferences.map(ref => (
                                            <option key={ref} value={ref} />
                                        ))}
                                    </datalist>
                                    <Form.Text id="controlIdRefHelp" muted>
                                        Unique identifier for the control within the selected standard (e.g., PCI DSS 3.2.1, ISO 27001 A.12.1.2).
                                    </Form.Text>
                                </FloatingLabel>
        
                                <FloatingLabel controlId="floatingRequirementText" label={<><FaAlignLeft className="me-1"/>Requirement Text*</>} className="mb-3">
                                    <Form.Control 
                                        as="textarea" 
                                        value={newRequirementText} 
                                        onChange={(e) => setNewRequirementText(e.target.value)} 
                                        placeholder="Requirement Text" 
                                        style={{ height: '150px' }}
                                        aria-describedby="requirementTextHelp"
                                        required 
                                    />
                                    <Form.Text id="requirementTextHelp" muted>
                                        The full text of the compliance requirement.
                                    </Form.Text>
                                </FloatingLabel>
                                <Button variant="primary" type="submit" className="me-2">
                                    {editingRequirementId ? <><FaEdit className="me-1"/>Update Requirement</> : <><FaPlusCircle className="me-1"/>Add Requirement</>}
                                </Button>
                                {editingRequirementId && (
                                    <Button variant="outline-secondary" onClick={handleCancelEdit}><FaWindowClose className="me-1"/>Cancel Edit</Button>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="existing" title={<><FaListUl className="me-1"/>Existing Requirements</>}>
                    
                    <Row className="mb-3">
                        <Col md={12}>
                            <FloatingLabel controlId="filterStandardExisting" label="Filter by Standard">
                                <Form.Select
                                    aria-label="Filter by Standard"
                                    value={selectedStandardIdForFilter}
                                    onChange={(e) => setSelectedStandardIdForFilter(e.target.value)}
                                >
                                    <option value="">All Standards</option>
                                    {complianceStandards.map(standard => (
                                        <option key={standard.id} value={standard.id}>
                                            {standard.name} ({standard.shortName})
                                        </option>
                                    ))}
                                </Form.Select>
                            </FloatingLabel>
                        </Col>
                    </Row>

                    {filteredRequirements.length === 0 && <Alert variant="info">{selectedStandardIdForFilter ? 'No requirements found for the selected standard.' : 'No requirements found.'}</Alert>}
                    <div variant="flush">
                        {filteredRequirements.map(req => (
                            <Card key={req.id} className="mb-3 shadow-sm">
                                <Card.Header>
                                    <div className="d-flex w-100 justify-content-between">
                                        <FaBookOpen size="1.5em" className="text-secondary "/>
                                        <div className="d-flex ms-2 w-100 justify-content-between">
                                            <h5 className="mb-1">{req.controlIdReference}</h5>
                                            <small className="text-muted">ID: {req.id}</small>
                                            </div>
                                        </div>
                                </Card.Header>
                                <Card.Body className=''>
                                <Row className="align-items-start">
                                    
                                    <Col >
                                        
                                        <p className="mb-1">{req.requirementText}</p>
                                       
                                    </Col>
                                    <Col xs="auto" className="d-flex align-items-center">
                                        <Button variant="outline-warning" size="sm" onClick={() => handleEditRequirement(req)} title="Edit Requirement"><FaEdit/></Button>
                                    </Col>
                                </Row>
                                </Card.Body>
                                <Card.Footer className='border-none border-top-0'>
                                     <small className="text-muted">
                                            Standard: {getStandardNameById(req.standardId)}
                                        </small>
                                </Card.Footer>
                            </Card>
                        ))}
                    </div>
                </Tab>
            </Tabs>

        </div>
    );
}

export default Requirements;