import React, { useState, useEffect } from 'react';
import { Offcanvas, Form, Button, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import StandardForm from '../forms/StandardForm'; // We'll create this
import RequirementForm from '../forms/RequirementForm'; // We'll create this
import TaskForm from '../forms/TaskForm'; // We'll create this

function EntityFormPanel({
    show,
    mode, // 'add' or 'edit'
    entityType, // 'standard', 'requirement', 'task'
    initialData,
    parentId, // e.g., standardId for new requirement, requirementId for new task
    onSave,
    onClose,
    allStandards,
    allRequirements,
    allUsers,
    allConnectedSystems,
    allDocuments
}) {
    const [error, setError] = useState('');

    const handleFormSubmit = async (formData) => {
        setError('');
        try {
            // For 'add' mode, ensure parentId is included if necessary
            let dataToSave = { ...formData };
            if (mode === 'add') {
                if (entityType === 'requirement' && parentId) {
                    dataToSave.standardId = parentId;
                } else if (entityType === 'task' && parentId) {
                    // dataToSave.requirementId = parentId;
                }
            }
            await onSave(entityType, dataToSave, initialData?.id);
            // On success, onSave in LibraryManagementPage will close the panel
        } catch (err) {
            // Error is already set by onSave in LibraryManagementPage,
            // but we can set a local one too if needed or reformat.
            setError(err.message || `Failed to ${mode} ${entityType}.`);
        }
    };

    const renderForm = () => {
        switch (entityType) {
            case 'standard':
                return (
                    <StandardForm
                        initialData={initialData}
                        onSubmit={handleFormSubmit}
                        onCancel={onClose}
                        mode={mode}
                    />
                );
            case 'requirement':
                return (
                    <RequirementForm
                        initialData={initialData}
                        onSubmit={handleFormSubmit}
                        onCancel={onClose}
                        mode={mode}
                        standards={allStandards} // Pass standards for dropdown
                        parentId={parentId} // For pre-selecting standard in 'add' mode
                    />
                );
            case 'task':
                return (
                    <TaskForm
                        initialData={initialData}
                        onSubmit={handleFormSubmit}
                        onCancel={onClose}
                        mode={mode}
                        requirements={allRequirements} // Pass requirements for dropdown
                        users={allUsers}
                        connectedSystems={allConnectedSystems}
                        documents={allDocuments}
                        parentId={parentId} // For pre-selecting requirement in 'add' mode
                    />
                );
            default:
                return <p>Invalid entity type selected.</p>;
        }
    };

    const title = `${mode === 'edit' ? 'Edit' : 'Add New'} ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;

    return (
        <Offcanvas show={show} onHide={onClose} placement="end" style={{ width: '500px' }}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>{title}</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {renderForm()}
            </Offcanvas.Body>
        </Offcanvas>
    );
}

export default EntityFormPanel;