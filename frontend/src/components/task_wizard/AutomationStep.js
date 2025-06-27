import React, { useState } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';

function AutomationStep({ data, onNext, onPrev, onData }) {
  const [highLevelCheckType, setHighLevelCheckType] = useState(data.highLevelCheckType || 'manual');
  const [checkType, setCheckType] = useState(data.checkType || '');
  const [target, setTarget] = useState(data.target || '');
  const [parameters, setParameters] = useState(data.parameters || {});
  const [error, setError] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    if (highLevelCheckType === 'automated' && (!checkType || !target)) {
      setError('Check type and target are required for automated tasks.');
      return;
    }
    onData({ highLevelCheckType, checkType, target, parameters });
    onNext();
  };

  return (
    <Form onSubmit={handleNext}>
      {error && <Alert variant="danger">{error}</Alert>}
      <FloatingLabel controlId="formHighLevelCheckType" label="Check Type*" className="mb-3">
        <Form.Select value={highLevelCheckType} onChange={e => setHighLevelCheckType(e.target.value)} required>
          <option value="manual">Manual</option>
          <option value="automated">Automated</option>
          <option value="document">Document Upload</option>
          <option value="interview">Interview</option>
        </Form.Select>
      </FloatingLabel>
      {highLevelCheckType === 'automated' && (
        <>
          <FloatingLabel controlId="formCheckType" label="Automated Check Type*" className="mb-3">
            <Form.Control type="text" value={checkType} onChange={e => setCheckType(e.target.value)} required />
          </FloatingLabel>
          <FloatingLabel controlId="formTarget" label="Target System*" className="mb-3">
            <Form.Control type="text" value={target} onChange={e => setTarget(e.target.value)} required />
          </FloatingLabel>
          <FloatingLabel controlId="formParameters" label="Parameters (JSON)" className="mb-3">
            <Form.Control as="textarea" value={JSON.stringify(parameters)} onChange={e => setParameters(JSON.parse(e.target.value || '{}'))} />
          </FloatingLabel>
        </>
      )}
      <div className="d-flex justify-content-between">
        <Button variant="secondary" onClick={onPrev}>Back</Button>
        <Button variant="primary" type="submit">Next</Button>
      </div>
    </Form>
  );
}

export default AutomationStep; 