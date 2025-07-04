import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel } from 'react-bootstrap';
import { FaFileSignature, FaFingerprint, FaAlignLeft } from 'react-icons/fa';

const StandardOffcanvasForm = ({ standard, onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (standard) {
            setName(standard.name || '');
            setShortName(standard.shortName || '');
            setDescription(standard.description || '');
        } else {
            setName('');
            setShortName('');
            setDescription('');
        }
    }, [standard]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !shortName.trim()) {
            alert("Name and Short Name are required.");
            return;
        }
        onSave({ name, shortName, description });
    };

    return (
        <Form onSubmit={handleSubmit}>
            <FloatingLabel controlId="offcanvasStandardName" label={<><FaFileSignature className="me-1" />Standard Name*</>} className="mb-3">
                <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Standard Name"
                    required
                />
            </FloatingLabel>

            <FloatingLabel controlId="offcanvasShortName" label={<><FaFingerprint className="me-1" />Short Name*</>} className="mb-3">
                <Form.Control
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="Short Name (e.g., PCI DSS)"
                    required
                />
            </FloatingLabel>

            <FloatingLabel controlId="offcanvasDescription" label={<><FaAlignLeft className="me-1" />Description</>} className="mb-3">
                <Form.Control
                    as="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    style={{ height: '100px' }}
                />
            </FloatingLabel>
            <Button variant="primary" type="submit" className="me-2">Save Standard</Button>
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </Form>
    );
};

export default StandardOffcanvasForm;