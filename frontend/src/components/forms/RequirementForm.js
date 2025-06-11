import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col } from 'react-bootstrap';
import { FaFileContract, FaFingerprint, FaAlignLeft, FaEdit, FaPlusCircle, FaWindowClose } from 'react-icons/fa';

function RequirementForm({ initialData, onSubmit, onCancel, mode, standards, parentId }) {
    const [standardId, setStandardId] = useState('');
    const [controlIdReference, setControlIdReference] = useState('');
    const [requirementText, setRequirementText] = useState('');

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setStandardId(initialData.standardId || '');
            setControlIdReference(initialData.controlIdReference || '');
            setRequirementText(initialData.requirementText || '');
        } else {
            setStandardId(parentId || ''); // Pre-select standard if parentId is provided
            setControlIdReference('');
            setRequirementText('');
        }
    }, [initialData, mode, parentId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            standardId,
            controlIdReference,
            requirementText,
        });
    };

    return (
        <Form onSubmit={handleSubmit}>
            <FloatingLabel controlId="formRequirementStandard" label={<><FaFileContract className="me-1" />Compliance Standard*</>} className="mb-3">
                <Form.Select value={standardId} onChange={(e) => setStandardId(e.target.value)} required disabled={mode === 'edit'}>
                    <option value="">Select a Standard</option>
                    {standards.map(std => (
                        <option key={std.id} value={std.id}>{std.name} ({std.shortName})</option>
                    ))}
                </Form.Select>
            </FloatingLabel>

            <FloatingLabel controlId="formControlIdReference" label={<><FaFingerprint className="me-1" />Control ID Reference*</>} className="mb-3">
                <Form.Control type="text" value={controlIdReference} onChange={(e) => setControlIdReference(e.target.value)} placeholder="Control ID Reference" required />
            </FloatingLabel>

            <FloatingLabel controlId="formRequirementText" label={<><FaAlignLeft className="me-1" />Requirement Text*</>} className="mb-3">
                <Form.Control as="textarea" value={requirementText} onChange={(e) => setRequirementText(e.target.value)} placeholder="Requirement Text" style={{ height: '150px' }} required />
            </FloatingLabel>

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