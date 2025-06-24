import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';
import { FaFileSignature, FaFingerprint, FaAlignLeft, FaEdit, FaPlusCircle, FaWindowClose, FaBuilding, FaCalendarAlt, FaLink, FaTag } from 'react-icons/fa';

function StandardForm({ initialData, onSubmit, onCancel, mode }) {
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [description, setDescription] = useState('');
    const [version, setVersion] = useState('');
    const [issuingBody, setIssuingBody] = useState('');
    const [officialLink, setOfficialLink] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [jurisdiction, setJurisdiction] = useState('');
    const [industry, setIndustry] = useState('');
    const [tags, setTags] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setName(initialData.name || '');
            setShortName(initialData.shortName || '');
            setDescription(initialData.description || '');
            setVersion(initialData.version || '');
            setIssuingBody(initialData.issuing_body || '');
            setOfficialLink(initialData.official_link || '');
            setEffectiveDate(initialData.effective_date || '');
            setExpiryDate(initialData.expiry_date || '');
            setJurisdiction(initialData.jurisdiction || '');
            setIndustry(initialData.industry || '');
            setTags(initialData.tags || []);
        } else {
            setName('');
            setShortName('');
            setDescription('');
            setVersion('');
            setIssuingBody('');
            setOfficialLink('');
            setEffectiveDate('');
            setExpiryDate('');
            setJurisdiction('');
            setIndustry('');
            setTags([]);
        }
    }, [initialData, mode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!name.trim()) {
            setError('Standard name is required');
            return;
        }
        if (!shortName.trim()) {
            setError('Short name is required');
            return;
        }
        if (!version.trim()) {
            setError('Version is required');
            return;
        }
        if (!issuingBody.trim()) {
            setError('Issuing body is required');
            return;
        }

        onSubmit({
            name,
            shortName,
            description,
            version,
            issuing_body: issuingBody,
            official_link: officialLink,
            effective_date: effectiveDate,
            expiry_date: expiryDate,
            jurisdiction,
            industry,
            tags
        });
    };

    const industryOptions = [
        'Financial Services',
        'Healthcare',
        'Technology',
        'Manufacturing',
        'Retail',
        'Energy',
        'Telecommunications',
        'Government',
        'Education',
        'Other'
    ];

    const jurisdictionOptions = [
        'Global',
        'North America',
        'Europe',
        'Asia Pacific',
        'Latin America',
        'Middle East',
        'Africa',
        'Other'
    ];

    return (
        <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <FloatingLabel controlId="formStandardName" label={<><FaFileSignature className="me-1" />Standard Name*</>} className="mb-3">
                <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Standard Name"
                    required
                />
            </FloatingLabel>

            <FloatingLabel controlId="formShortName" label={<><FaFingerprint className="me-1" />Short Name*</>} className="mb-3">
                <Form.Control
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="Short Name"
                    required
                />
            </FloatingLabel>

            <FloatingLabel controlId="formDescription" label={<><FaAlignLeft className="me-1" />Description</>} className="mb-3">
                <Form.Control
                    as="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    style={{ height: '100px' }}
                />
            </FloatingLabel>

            <Row>
                <Col md={6}>
                    <FloatingLabel controlId="formVersion" label={<><FaTag className="me-1" />Version*</>} className="mb-3">
                        <Form.Control
                            type="text"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            placeholder="Version"
                            required
                        />
                    </FloatingLabel>
                </Col>
                <Col md={6}>
                    <FloatingLabel controlId="formIssuingBody" label={<><FaBuilding className="me-1" />Issuing Body*</>} className="mb-3">
                        <Form.Control
                            type="text"
                            value={issuingBody}
                            onChange={(e) => setIssuingBody(e.target.value)}
                            placeholder="Issuing Body"
                            required
                        />
                    </FloatingLabel>
                </Col>
            </Row>

            <FloatingLabel controlId="formOfficialLink" label={<><FaLink className="me-1" />Official Link</>} className="mb-3">
                <Form.Control
                    type="url"
                    value={officialLink}
                    onChange={(e) => setOfficialLink(e.target.value)}
                    placeholder="https://"
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

            <Row>
                <Col md={6}>
                    <FloatingLabel controlId="formJurisdiction" label="Jurisdiction" className="mb-3">
                        <Form.Select
                            value={jurisdiction}
                            onChange={(e) => setJurisdiction(e.target.value)}
                        >
                            <option value="">Select Jurisdiction</option>
                            {jurisdictionOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
                <Col md={6}>
                    <FloatingLabel controlId="formIndustry" label="Industry" className="mb-3">
                        <Form.Select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                        >
                            <option value="">Select Industry</option>
                            {industryOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
            </Row>

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