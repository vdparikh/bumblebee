import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col } from 'react-bootstrap';
import { FaFileSignature, FaFingerprint, FaAlignLeft, FaInfoCircle, FaLink, FaBuilding, FaEdit, FaPlusCircle, FaWindowClose } from 'react-icons/fa';

function StandardForm({ initialData, onSubmit, onCancel, mode }) {
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [description, setDescription] = useState('');
    const [version, setVersion] = useState('');
    const [issuingBody, setIssuingBody] = useState('');
    const [officialLink, setOfficialLink] = useState('');

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setName(initialData.name || '');
            setShortName(initialData.shortName || '');
            setDescription(initialData.description || '');
            setVersion(initialData.version || '');
            setIssuingBody(initialData.issuing_body || '');
            setOfficialLink(initialData.official_link || '');
        } else {
            setName('');
            setShortName('');
            setDescription('');
            setVersion('');
            setIssuingBody('');
            setOfficialLink('');
        }
    }, [initialData, mode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            name,
            shortName,
            description,
            version: version || null,
            issuing_body: issuingBody || null,
            official_link: officialLink || null,
        });
    };

    return (
        <Form onSubmit={handleSubmit}>
            <Row>
                <Col md={8}>
                    <FloatingLabel controlId="formStandardName" label={<><FaFileSignature className="me-1" />Standard Name*</>} className="mb-3">
                        <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard Name" required />
                    </FloatingLabel>
                </Col>
                <Col md={4}>
                    <FloatingLabel controlId="formShortName" label={<><FaFingerprint className="me-1" />Short Name*</>} className="mb-3">
                        <Form.Control type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Short Name" required />
                    </FloatingLabel>
                </Col>
            </Row>
            <Row>
                <Col md={4}>
                    <FloatingLabel controlId="formVersion" label={<><FaInfoCircle className="me-1" />Version</>} className="mb-3">
                        <Form.Control type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g., v1.2" />
                    </FloatingLabel>
                </Col>
                <Col md={8}>
                    <FloatingLabel controlId="formIssuingBody" label={<><FaBuilding className="me-1" />Issuing Body</>} className="mb-3">
                        <Form.Control type="text" value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} placeholder="e.g., ISO, NIST" />
                    </FloatingLabel>
                </Col>
            </Row>
            <FloatingLabel controlId="formDescription" label={<><FaAlignLeft className="me-1" />Description</>} className="mb-3">
                <Form.Control as="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" style={{ height: '100px' }} />
            </FloatingLabel>
            <FloatingLabel controlId="formOfficialLink" label={<><FaLink className="me-1" />Link to Official Document</>} className="mb-3">
                <Form.Control type="url" value={officialLink} onChange={(e) => setOfficialLink(e.target.value)} placeholder="https://example.com/doc.pdf" />
            </FloatingLabel>

            <div className="mt-3">
                <Button variant="primary" type="submit" className="me-2">
                    {mode === 'edit' ? <><FaEdit className="me-1" />Update Standard</> : <><FaPlusCircle className="me-1" />Add Standard</>}
                </Button>
                <Button variant="outline-secondary" onClick={onCancel}>
                    <FaWindowClose className="me-1" />Cancel
                </Button>
            </div>
        </Form>
    );
}

export default StandardForm;