import React, { useState, useEffect } from 'react';
import { Offcanvas, Form, Button, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import StandardForm from '../forms/StandardForm'; // We'll create this
import RequirementForm from '../forms/RequirementForm'; // We'll create this
import TaskForm from '../forms/TaskForm'; // We'll create this

function EntityFormPanel({
    show,
    mode, // 'add' or 'edit'
    entityType, // 'standard', 'requirement', 'task'
    initialData,
    parentId, // e.g., standardId for new requirement, requirementId for new task
    onSave,
    onClose,
    allStandards,
    allRequirements,
    allUsers,
    allConnectedSystems,
    allDocuments
}) {

    const handleFormSubmit = async (formData) => {
        setError('');
        try {
            // For 'add' mode, ensure parentId is included if necessary
            let dataToSave = { ...formData };
            if (mode === 'add') {
                if (entityType === 'requirement' && parentId) {
                    dataToSave.standardId = parentId;
                } else if (entityType === 'task' && parentId) {
                    // dataToSave.requirementId = parentId;
                }
            }
            await onSave(entityType, dataToSave, initialData?.id);
            // On success, onSave in LibraryManagementPage will close the panel
        } catch (err) {
            // Error is already set by onSave in LibraryManagementPage,
            // but we can set a local one too if needed or reformat.
            setError(err.message || `Failed to ${mode} ${entityType}.`);
        }
    };

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


    const renderForm = () => {
        switch (entityType) {
case 'risk':
                return (
                    <>
                                    <Form onSubmit={handleSubmit}>

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

                         {error && <Alert variant="danger">{error}</Alert>}
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="secondary" onClick={onClose} className="ms-2">
                        Cancel
                    </Button>
                </Form>
                    </>
                );            
            case 'standard':
                return (
                    <StandardForm
                        initialData={initialData}
                        onSubmit={handleFormSubmit}
                        onCancel={onClose}
                        mode={mode}
                    />
                );
            case 'requirement':
                return (
                    <RequirementForm
                        initialData={initialData}
                        onSubmit={handleFormSubmit}
                        onCancel={onClose}
                        mode={mode}
                        standards={allStandards} // Pass standards for dropdown
                        parentId={parentId} // For pre-selecting standard in 'add' mode
                    />
                );
            case 'task':
                return (
                    <TaskForm
                        initialData={initialData}
                        onSubmit={handleFormSubmit}
                        onCancel={onClose}
                        mode={mode}
                        requirements={allRequirements} // Pass requirements for dropdown
                        users={allUsers}
                        connectedSystems={allConnectedSystems}
                        documents={allDocuments}
                        parentId={parentId} // For pre-selecting requirement in 'add' mode
                    />
                );
            default:
                return <p>Invalid entity type selected.</p>;
        }
    };

    const title = `${mode === 'edit' ? 'Edit' : 'Add New'} ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;

    return (
        <Offcanvas show={show} onHide={onClose} placement="end" style={{ width: '500px' }}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>{title}</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {renderForm()}
            </Offcanvas.Body>
        </Offcanvas>
    );
}

export default EntityFormPanel;