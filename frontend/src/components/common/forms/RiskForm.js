import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

function RiskForm({ initialData, onSubmit, onCancel, mode, allUsers, allRequirements }) {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setFormData({
                ...initialData,
                // Ensure requirementIds is an array of IDs for react-select
                requirementIds: initialData.requirements?.map(req => req.id) || [],
            });
        } else {
            setFormData({
                riskId: '',
                title: '',
                description: '',
                category: '',
                likelihood: '',
                impact: '',
                status: 'Open',
                ownerUserId: '',
                requirementIds: [],
            });
        }
    }, [initialData, mode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCategoryChange = (selectedOption) => {
        setFormData(prev => ({
            ...prev,
            category: selectedOption ? selectedOption.value : '',
        }));
    };

    const handleMultiSelectChange = (name, selectedOptions) => {
        setFormData(prev => ({
            ...prev,
            [name]: selectedOptions ? selectedOptions.map(option => option.value) : [],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.riskId || !formData.title) {
            setError("Risk ID and Title are required.");
            setLoading(false);
            return;
        }

        try {
            await onSubmit(formData); // onSubmit is passed from EntityFormPanel
            setLoading(false);
            // onClose is handled by EntityFormPanel after successful save
        } catch (err) {
            setError(err.message || 'An unexpected error occurred during save.');
            setLoading(false);
        }
    };

    const defaultCategoryOptions = [
        { value: 'Financial', label: 'Financial' },
        { value: 'Operational', label: 'Operational' },
        { value: 'Security', label: 'Security' },
        { value: 'Compliance', label: 'Compliance' },
    ];

    return (
        <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-3">
                <Form.Label>Risk ID*</Form.Label>
                <Form.Control type="text" name="riskId" value={formData.riskId || ''} onChange={handleChange} required placeholder="e.g., RISK-001" />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Title*</Form.Label>
                <Form.Control type="text" name="title" value={formData.title || ''} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={3} name="description" value={formData.description || ''} onChange={handleChange} />
            </Form.Group>
            <Row>
                <Col>
                    <Form.Group className="mb-3">
                        <Form.Label>Category</Form.Label>
                        <CreatableSelect
                            isClearable
                            options={defaultCategoryOptions}
                            value={formData.category ? { value: formData.category, label: formData.category } : null}
                            onChange={handleCategoryChange}
                            placeholder="Select or create a category..."
                            formatCreateLabel={inputValue => `Create "${inputValue}"`}
                        />
                    </Form.Group>
                </Col>
            </Row>
            <Row>
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
                    {allUsers.map(user => (<option key={user.id} value={user.id}>{user.name}</option>))}
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

            <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Saving...' : (mode === 'edit' ? 'Save Changes' : 'Create Risk')}
            </Button>
            <Button variant="secondary" onClick={onCancel} className="ms-2">
                Cancel
            </Button>
        </Form>
    );
}

export default RiskForm;