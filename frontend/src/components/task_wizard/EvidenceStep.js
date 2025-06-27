import React, { useState } from 'react';
import { Form, Button, FloatingLabel, Alert } from 'react-bootstrap';

function EvidenceStep({ data, onNext, onPrev, onData }) {
  const [evidenceTypesExpected, setEvidenceTypesExpected] = useState(data.evidenceTypesExpected || '');
  const [linkedDocumentIDs, setLinkedDocumentIDs] = useState(data.linkedDocumentIDs || '');
  const [error, setError] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    onData({ evidenceTypesExpected, linkedDocumentIDs });
    onNext();
  };

  return (
    <Form onSubmit={handleNext}>
      {error && <Alert variant="danger">{error}</Alert>}
      <FloatingLabel controlId="formEvidenceTypesExpected" label="Evidence Types Expected" className="mb-3">
        <Form.Control type="text" value={evidenceTypesExpected} onChange={e => setEvidenceTypesExpected(e.target.value)} />
      </FloatingLabel>
      <FloatingLabel controlId="formLinkedDocumentIDs" label="Linked Document IDs" className="mb-3">
        <Form.Control type="text" value={linkedDocumentIDs} onChange={e => setLinkedDocumentIDs(e.target.value)} />
      </FloatingLabel>
      <div className="d-flex justify-content-between">
        <Button variant="secondary" onClick={onPrev}>Back</Button>
        <Button variant="primary" type="submit">Next</Button>
      </div>
    </Form>
  );
}

export default EvidenceStep; 