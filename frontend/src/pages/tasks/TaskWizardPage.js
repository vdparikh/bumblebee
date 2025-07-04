import React, { useState } from 'react';
import { Container, Card, Button, ProgressBar, Alert } from 'react-bootstrap';
import OverviewStep from '../../components/task_wizard/OverviewStep';
import AutomationStep from '../../components/task_wizard/AutomationStep';
import EvidenceStep from '../../components/task_wizard/EvidenceStep';
import ReviewStep from '../../components/task_wizard/ReviewStep';

const steps = [
  { label: 'Overview' },
  { label: 'Automation' },
  { label: 'Evidence' },
  { label: 'Review & Submit' },
];

function TaskWizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const goToStep = (step) => setCurrentStep(step);
  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleStepData = (data) => setFormData((prev) => ({ ...prev, ...data }));

  const handleSubmit = () => {
    // TODO: Implement API call
    setSuccess('Task submitted! (API integration pending)');
    setError('');
  };

  return (
    <Container className="py-4">
      <Card className="mb-4">
        <Card.Body>
          <h3 className="mb-3">Task Wizard</h3>
          <ProgressBar now={((currentStep + 1) / steps.length) * 100} label={steps[currentStep].label} className="mb-4" />
          <div className="d-flex justify-content-between mb-3">
            {steps.map((step, idx) => (
              <div key={step.label} className={`text-center flex-fill ${idx === currentStep ? 'fw-bold text-primary' : 'text-muted'}`}>{step.label}</div>
            ))}
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          {currentStep === 0 && <OverviewStep data={formData} onNext={nextStep} onData={handleStepData} />}
          {currentStep === 1 && <AutomationStep data={formData} onNext={nextStep} onPrev={prevStep} onData={handleStepData} />}
          {currentStep === 2 && <EvidenceStep data={formData} onNext={nextStep} onPrev={prevStep} onData={handleStepData} />}
          {currentStep === 3 && <ReviewStep data={formData} onPrev={prevStep} onSubmit={handleSubmit} />}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default TaskWizardPage; 