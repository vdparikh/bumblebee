import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';
import { FaFileAlt, FaAlignLeft, FaEdit, FaPlusCircle, FaWindowClose, FaCalendarAlt, FaLink, FaTag, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

function RequirementForm({ initialData, onSubmit, onCancel, mode, standards }) {
    const [standardId, setStandardId] = useState('');
    const [controlIdReference, setControlIdReference] = useState('');
    const [requirementText, setRequirementText] = useState('');
    const [version, setVersion] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [officialLink, setOfficialLink] = useState('');
    const [priority, setPriority] = useState('medium');
    const [status, setStatus] = useState('active');
    const [tags, setTags] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setStandardId(initialData.standard_id || initialData.standardId || '');
            setControlIdReference(initialData.controlIdReference || '');
            setRequirementText(initialData.requirementText || '');
            setVersion(initialData.version || '');
            setEffectiveDate(initialData.effective_date || '');
            setExpiryDate(initialData.expiry_date || '');
            setOfficialLink(initialData.officialLink || '');
            setPriority(initialData.priority || 'medium');
            setStatus(initialData.status || 'active');
            setTags(initialData.tags || []);
        } else {
            setStandardId('');
            setControlIdReference('');
            setRequirementText('');
            setVersion('');
            setEffectiveDate('');
            setExpiryDate('');
            setOfficialLink('');
            setPriority('medium');
            setStatus('active');
            setTags([]);
        }
    }, [initialData, mode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!standardId) {
            setError('Please select a compliance standard');
            return;
        }
        if (!controlIdReference.trim()) {
            setError('Requirement ID is required');
            return;
        }
        if (!requirementText.trim()) {
            setError('Requirement Text is required');
            return;
        }
        if (!version.trim()) {
            setError('Version is required');
            return;
        }

        onSubmit({
            standardId: standardId,
            controlIdReference,
            requirementText,
            version,
            effectiveDate,
            expiryDate,
            officialLink,
            priority,
            status,
            tags
        });
    };

    const priorityOptions = [
        { value: 'high', label: 'High', icon: <FaExclamationTriangle className="text-danger" /> },
        { value: 'medium', label: 'Medium', icon: <FaExclamationTriangle className="text-warning" /> },
        { value: 'low', label: 'Low', icon: <FaExclamationTriangle className="text-info" /> }
    ];

    const statusOptions = [
        { value: 'active', label: 'Active', icon: <FaCheckCircle className="text-success" /> },
        { value: 'deprecated', label: 'Deprecated', icon: <FaExclamationTriangle className="text-warning" /> },
        { value: 'pending', label: 'Pending Review', icon: <FaExclamationTriangle className="text-info" /> }
    ];

    return (
        <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <FloatingLabel controlId="formStandard" label="Compliance Standard*" className="mb-3">
                <Form.Select
                    value={standardId}
                    onChange={(e) => setStandardId(e.target.value)}
                    required
                >
                    <option value="">Select Standard</option>
                    {standards.map(standard => (
                        <option key={standard.id} value={standard.id}>
                            {standard.name} ({standard.shortName})
                        </option>
                    ))}
                </Form.Select>
            </FloatingLabel>

            <Row>
                <Col md={6}>
                    <FloatingLabel controlId="formControlIdReference" label={<><FaTag className="me-1" />Requirement ID*</>} className="mb-3">
                        <Form.Control
                            type="text"
                            value={controlIdReference}
                            onChange={(e) => setControlIdReference(e.target.value)}
                            placeholder="e.g., REQ-001"
                            required
                        />
                    </FloatingLabel>
                </Col>
                <Col md={6}>
                    <FloatingLabel controlId="formVersion" label={<><FaTag className="me-1" />Version*</>} className="mb-3">
                        <Form.Control
                            type="text"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            placeholder="e.g., v1.0"
                            required
                        />
                    </FloatingLabel>
                </Col>
            </Row>

            <FloatingLabel controlId="formRequirementText" label={<><FaFileAlt className="me-1" />Requirement Text*</>} className="mb-3">
                <Form.Control
                    as="textarea"
                    value={requirementText}
                    onChange={(e) => setRequirementText(e.target.value)}
                    placeholder="Requirement Text"
                    style={{ height: '100px' }}
                    required
                />
            </FloatingLabel>

            {/* <Row>
                <Col md={6}>
                    <FloatingLabel controlId="formEffectiveDate" label={<><FaCalendarAlt className="me-1" />Effective Date</>} className="mb-3">
                        <Form.Control
                            type="date"
                            value={effectiveDate}
                            onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                    </FloatingLabel>
                </Col>
                <Col md={6}>
                    <FloatingLabel controlId="formExpiryDate" label={<><FaCalendarAlt className="me-1" />Expiry Date</>} className="mb-3">
                        <Form.Control
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                        />
                    </FloatingLabel>
                </Col>
            </Row> */}

            <FloatingLabel controlId="formOfficialLink" label={<><FaLink className="me-1" />Official Link</>} className="mb-3">
                <Form.Control
                    type="url"
                    value={officialLink}
                    onChange={(e) => setOfficialLink(e.target.value)}
                    placeholder="https://"
                />
            </FloatingLabel>

            <Row>
                <Col md={6}>
                    <FloatingLabel controlId="formPriority" label="Priority" className="mb-3">
                        <Form.Select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                        >
                            {priorityOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.icon} {opt.label}
                                </option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
                <Col md={6}>
                    <FloatingLabel controlId="formStatus" label="Status" className="mb-3">
                        <Form.Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.icon} {opt.label}
                                </option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
            </Row>

            <div className="mt-3">
                <Button variant="primary" type="submit" className="me-2">
                    {mode === 'edit' ? <><FaEdit className="me-1" />Update Requirement</> : <><FaPlusCircle className="me-1" />Add Requirement</>}
                </Button>
                <Button variant="outline-secondary" onClick={onCancel}>
                    <FaWindowClose className="me-1" />Cancel
                </Button>
            </div>
        </Form>
    );
}

export default RequirementForm;