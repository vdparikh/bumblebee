import React, { useState } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';

function OverviewStep({ data, onNext, onData }) {
  const [title, setTitle] = useState(data.title || '');
  const [description, setDescription] = useState(data.description || '');
  const [version, setVersion] = useState(data.version || '');
  const [category, setCategory] = useState(data.category || 'Other');
  const [priority, setPriority] = useState(data.priority || 'medium');
  const [error, setError] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    if (!title.trim() || !version.trim() || !category.trim() || !priority.trim()) {
      setError('Please fill all required fields.');
      return;
    }
    onData({ title, description, version, category, priority });
    onNext();
  };

  return (
    <Form onSubmit={handleNext}>
      {error && <Alert variant="danger">{error}</Alert>}
      <FloatingLabel controlId="formTitle" label="Task Title*" className="mb-3">
        <Form.Control type="text" value={title} onChange={e => setTitle(e.target.value)} required />
      </FloatingLabel>
      <FloatingLabel controlId="formDescription" label="Description" className="mb-3">
        <Form.Control as="textarea" value={description} onChange={e => setDescription(e.target.value)} style={{ height: '80px' }} />
      </FloatingLabel>
      <Row>
        <Col md={6}>
          <FloatingLabel controlId="formVersion" label="Version*" className="mb-3">
            <Form.Control type="text" value={version} onChange={e => setVersion(e.target.value)} required />
          </FloatingLabel>
        </Col>
        <Col md={6}>
          <FloatingLabel controlId="formCategory" label="Category*" className="mb-3">
            <Form.Select value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">Select Category</option>
              <option value="Asset Management">Asset Management</option>
              <option value="Configuration Management">Configuration Management</option>
              <option value="Data Security">Data Security</option>
              <option value="Vulnerability Management">Vulnerability Management</option>
              <option value="Audit">Audit</option>
              <option value="Policy">Policy</option>
              <option value="Other">Other</option>
            </Form.Select>
          </FloatingLabel>
        </Col>
      </Row>
      <FloatingLabel controlId="formPriority" label="Priority*" className="mb-3">
        <Form.Select value={priority} onChange={e => setPriority(e.target.value)} required>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Form.Select>
      </FloatingLabel>
      <div className="d-flex justify-content-end">
        <Button variant="primary" type="submit">Next</Button>
      </div>
    </Form>
  );
}

export default OverviewStep; 