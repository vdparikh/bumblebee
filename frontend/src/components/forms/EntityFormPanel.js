import React, { useState, useEffect } from 'react';
import { Form, Button, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import StandardForm from './StandardForm';
import RequirementForm from './RequirementForm';
import TaskForm from './TaskForm';
import RiskForm from './RiskForm';

function EntityFormPanel({
    show, // unused now
    mode, // 'add' or 'edit'
    entityType, // 'standard', 'requirement', 'task'
    initialData,
    parentId, // e.g., standardId for new requirement, requirementId for new task
    onSave,
    onClose,
    allStandards = [],
    allRequirements = [],
    allUsers = [],
    allConnectedSystems = [],
    allDocuments = []
}) {

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

        const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setError('');
            let data = initialData || {};

            // Set parentId for new entities
            if (mode === 'add') {
                if (entityType === 'requirement' && parentId) {
                    data.standardId = parentId;
                } else if (entityType === 'task' && parentId) {
                    // For tasks, parentId is requirementId
                    data.requirementIds = [parentId];
                }
            }

            // Handle specific data transformations for editing
            if (mode === 'edit' && initialData) {
                if (entityType === 'task') {
                    // Ensure parameters is an object for the form
                    data.parameters = initialData.parameters || {};
                    // Ensure linkedDocumentIDs is an array
                    data.linkedDocumentIDs = initialData.linked_documents?.map(doc => doc.id) || [];
                    // Ensure requirementIds is an array
                    data.requirementIds = initialData.requirements?.map(req => req.id) || [];
                } else if (entityType === 'risk') {
                    // Ensure requirementIds is an array
                    data.requirementIds = initialData.requirements?.map(req => req.id) || [];
                }
            }

            setFormData(data);
        }
    }, [show, mode, entityType, initialData, parentId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleMultiSelectChange = (name, selectedOptions) => {
        setFormData(prev => ({
            ...prev,
            [name]: selectedOptions ? selectedOptions.map(option => option.value) : [],
        }));
    };

    const handleParameterChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            parameters: {
                ...prev.parameters,
                [key]: value,
            },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await onSave(entityType, formData, mode === 'edit' ? formData.id : null);
            setLoading(false);
            onClose(); // Close panel on successful save
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
            setLoading(false);
        }
    };


    const renderForm = () => {
        switch (entityType) {
            case 'risk':
                return (
                    <RiskForm
                        initialData={initialData}
                        onSubmit={handleFormSubmit}
                        onCancel={onClose}
                        mode={mode}
                        allUsers={allUsers}
                        allRequirements={allRequirements}
                    />
                );
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

    return (
        <div>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {renderForm()}
        </div>
    );
}

export default EntityFormPanel;