import React, { useState, useEffect } from 'react';
import { Offcanvas, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import Select from 'react-select'; // Import react-select

function EntityFormPanel({
    show,
    mode,
    entityType,
    initialData,
    parentId,
    onSave,
    onClose,
    allStandards,
    allRequirements,
    allConnectedSystems,
    allUsers, // Added for Risk owner
    allDocuments, // Added for Task linked documents
}) {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setError('');
            let data = initialData || {};

            // Set parentId for new entities
            if (mode === 'add') {
                if (entityType === 'requirement' && parentId) {
                    data.standardId = parentId;
                } else if (entityType === 'task' && parentId) {
                    // For tasks, parentId is requirementId
                    data.requirementIds = [parentId];
                }
            }

            // Handle specific data transformations for editing
            if (mode === 'edit' && initialData) {
                if (entityType === 'task') {
                    // Ensure parameters is an object for the form
                    data.parameters = initialData.parameters || {};
                    // Ensure linkedDocumentIDs is an array
                    data.linkedDocumentIDs = initialData.linked_documents?.map(doc => doc.id) || [];
                    // Ensure requirementIds is an array
                    data.requirementIds = initialData.requirements?.map(req => req.id) || [];
                } else if (entityType === 'risk') {
                    // Ensure requirementIds is an array
                    data.requirementIds = initialData.requirements?.map(req => req.id) || [];
                }
            }

            setFormData(data);
        }
    }, [show, mode, entityType, initialData, parentId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleMultiSelectChange = (name, selectedOptions) => {
        setFormData(prev => ({
            ...prev,
            [name]: selectedOptions ? selectedOptions.map(option => option.value) : [],
        }));
    };

    const handleParameterChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            parameters: {
                ...prev.parameters,
                [key]: value,
            },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await onSave(entityType, formData, mode === 'edit' ? formData.id : null);
            setLoading(false);
            onClose(); // Close panel on successful save
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
            setLoading(false);
        }
    };

    const renderFormFields = () => {
        switch (entityType) {
            case 'standard':
                return (
                    <>
                        <Form.Group className="mb-3">
                            <Form.Label>Name*</Form.Label>
                            <Form.Control type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Short Name*</Form.Label>
                            <Form.Control type="text" name="shortName" value={formData.shortName || ''} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} name="description" value={formData.description || ''} onChange={handleChange} />
                        </Form.Group>
                        {/* Add other standard fields like version, issuingBody, etc. */}
                    </>
                );
            case 'requirement':
                return (
                    <>
                        <Form.Group className="mb-3">
                            <Form.Label>Standard*</Form.Label>
                            <Form.Select name="standardId" value={formData.standardId || ''} onChange={handleChange} required disabled={mode === 'edit'}>
                                <option value="">Select Standard...</option>
                                {allStandards.map(std => (
                                    <option key={std.id} value={std.id}>{std.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Control ID Reference*</Form.Label>
                            <Form.Control type="text" name="controlIdReference" value={formData.controlIdReference || ''} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Requirement Text*</Form.Label>
                            <Form.Control as="textarea" rows={3} name="requirementText" value={formData.requirementText || ''} onChange={handleChange} required />
                        </Form.Group>
                        {/* Add other requirement fields */}
                    </>
                );
            case 'task':
                return (
                    <>
                        <Form.Group className="mb-3">
                            <Form.Label>Title*</Form.Label>
                            <Form.Control type="text" name="title" value={formData.title || ''} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} name="description" value={formData.description || ''} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Category</Form.Label>
                            <Form.Control type="text" name="category" value={formData.category || ''} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Linked Requirements</Form.Label>
                            <Select
                                isMulti
                                options={allRequirements.map(req => ({ value: req.id, label: `${req.controlIdReference} - ${req.requirementText.substring(0, 50)}...` }))}
                                value={formData.requirementIds?.map(id => {
                                    const req = allRequirements.find(r => r.id === id);
                                    return req ? { value: req.id, label: `${req.controlIdReference} - ${req.requirementText.substring(0, 50)}...` } : null;
                                }).filter(Boolean) || []}
                                onChange={(selectedOptions) => handleMultiSelectChange('requirementIds', selectedOptions)}
                                placeholder="Select requirements to link..."
                                closeMenuOnSelect={false}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Linked Documents</Form.Label>
                            <Select
                                isMulti
                                options={allDocuments.map(doc => ({ value: doc.id, label: doc.name }))}
                                value={formData.linkedDocumentIDs?.map(id => {
                                    const doc = allDocuments.find(d => d.id === id);
                                    return doc ? { value: doc.id, label: doc.name } : null;
                                }).filter(Boolean) || []}
                                onChange={(selectedOptions) => handleMultiSelectChange('linkedDocumentIDs', selectedOptions)}
                                placeholder="Select documents to link..."
                                closeMenuOnSelect={false}
                            />
                        </Form.Group>
                        {/* Add check_type, target, parameters fields */}
                        <Form.Group className="mb-3">
                            <Form.Label>Check Type</Form.Label>
                            <Form.Control type="text" name="checkType" value={formData.checkType || ''} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Target</Form.Label>
                            <Form.Control type="text" name="target" value={formData.target || ''} onChange={handleChange} />
                        </Form.Group>
                        {/* Dynamic parameters input - simplified for now */}
                        {formData.parameters && Object.keys(formData.parameters).length > 0 && (
                            <Form.Group className="mb-3">
                                <Form.Label>Parameters (JSON)</Form.Label>
                                {Object.entries(formData.parameters).map(([key, value]) => (
                                    <Form.Control
                                        key={key}
                                        type="text"
                                        placeholder={key}
                                        value={value}
                                        onChange={(e) => handleParameterChange(key, e.target.value)}
                                        className="mb-2"
                                    />
                                ))}
                            </Form.Group>
                        )}
                    </>
                );
            case 'risk':
                return (
                    <>
                        <Form.Group className="mb-3">
                            <Form.Label>Risk ID*</Form.Label>
                            <Form.Control
                                type="text"
                                name="riskId"
                                value={formData.riskId || ''}
                                onChange={handleChange}
                                required
                                placeholder="e.g., RISK-001"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Title*</Form.Label>
                            <Form.Control
                                type="text"
                                name="title"
                                value={formData.title || ''}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="description"
                                value={formData.description || ''}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Category</Form.Label>
                                    <Form.Select name="category" value={formData.category || ''} onChange={handleChange}>
                                        <option value="">Select Category...</option>
                                        <option value="Financial">Financial</option>
                                        <option value="Operational">Operational</option>
                                        <option value="Security">Security</option>
                                        <option value="Compliance">Compliance</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select name="status" value={formData.status || 'Open'} onChange={handleChange}>
                                        <option value="Open">Open</option>
                                        <option value="Mitigated">Mitigated</option>
                                        <option value="Accepted">Accepted</option>
                                        <option value="Closed">Closed</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Likelihood</Form.Label>
                                    <Form.Select name="likelihood" value={formData.likelihood || ''} onChange={handleChange}>
                                        <option value="">Select Likelihood...</option>
                                        <option value="Very Low">Very Low</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Very High">Very High</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Impact</Form.Label>
                                    <Form.Select name="impact" value={formData.impact || ''} onChange={handleChange}>
                                        <option value="">Select Impact...</option>
                                        <option value="Very Low">Very Low</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Very High">Very High</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Owner</Form.Label>
                            <Form.Select name="ownerUserId" value={formData.ownerUserId || ''} onChange={handleChange}>
                                <option value="">Select Owner...</option>
                                {allUsers.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Linked Requirements</Form.Label>
                            <Select
                                isMulti
                                options={allRequirements.map(req => ({ value: req.id, label: `${req.controlIdReference} - ${req.requirementText.substring(0, 50)}...` }))}
                                value={formData.requirementIds?.map(id => {
                                    const req = allRequirements.find(r => r.id === id);
                                    return req ? { value: req.id, label: `${req.controlIdReference} - ${req.requirementText.substring(0, 50)}...` } : null;
                                }).filter(Boolean) || []}
                                onChange={(selectedOptions) => handleMultiSelectChange('requirementIds', selectedOptions)}
                                placeholder="Select requirements to link..."
                                closeMenuOnSelect={false}
                            />
                        </Form.Group>
                    </>
                );
            default:
                return <Alert variant="warning">Invalid entity type selected.</Alert>;
        }
    };

    const getTitle = () => {
        const action = mode === 'add' ? 'Add New' : 'Edit';
        const type = entityType.charAt(0).toUpperCase() + entityType.slice(1);
        return `${action} ${type}`;
    };

    return (
        <Offcanvas show={show} onHide={onClose} placement="end" backdrop="static">
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>{getTitle()}</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                    {renderFormFields()}
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="secondary" onClick={onClose} className="ms-2">
                        Cancel
                    </Button>
                </Form>
            </Offcanvas.Body>
        </Offcanvas>
    );
}

export default EntityFormPanel;