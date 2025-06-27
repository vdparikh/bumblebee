import React from 'react';
import { Card, Button, ListGroup } from 'react-bootstrap';

function ReviewStep({ data, onPrev, onSubmit }) {
  return (
    <Card>
      <Card.Header>Review & Submit</Card.Header>
      <Card.Body>
        <ListGroup variant="flush">
          {Object.entries(data).map(([key, value]) => (
            <ListGroup.Item key={key}>
              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </ListGroup.Item>
          ))}
        </ListGroup>
        <div className="d-flex justify-content-between mt-3">
          <Button variant="secondary" onClick={onPrev}>Back</Button>
          <Button variant="success" onClick={onSubmit}>Submit</Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ReviewStep; 