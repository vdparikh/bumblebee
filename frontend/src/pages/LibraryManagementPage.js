import React, { useState, useEffect, useCallback } from 'react';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { FaEdit, FaPlusCircle } from 'react-icons/fa';
import ThreeColumnView from '../components/views/ThreeColumnView';
import EntityFormPanel from '../components/common/EntityFormPanel';
import PageHeader from '../components/common/PageHeader';
import {
    getComplianceStandards,
    getRequirements,
    getTasks,
    createComplianceStandard,
    updateStandard,
    createRequirement,
    updateRequirement,
    createTask,
    updateTask,
    getConnectedSystems, // Import
    getDocuments,        // Import
    // Add delete functions if needed
} from '../services/api';

function LibraryManagementPage() {
    const [standards, setStandards] = useState([]);
    const [requirements, setRequirements] = useState([]);
    const [masterTasks, setMasterTasks] = useState([]);
    const [connectedSystems, setConnectedSystems] = useState([]);
    const [documents, setDocuments] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showPanel, setShowPanel] = useState(false);
    const [panelMode, setPanelMode] = useState('add'); // 'add' or 'edit'
    const [panelEntityType, setPanelEntityType] = useState(''); // 'standard', 'requirement', 'task'
    const [panelDataToEdit, setPanelDataToEdit] = useState(null);
    const [panelParentId, setPanelParentId] = useState(null); // For adding req to std, or task to req

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [stdRes, reqRes, taskRes, systemsRes, docsRes] = await Promise.all([
                getComplianceStandards(),
                getRequirements(),
                getTasks(), // Assuming this gets master tasks
                getConnectedSystems(),
                getDocuments()
            ]);
            setStandards(Array.isArray(stdRes.data) ? stdRes.data : []);
            setRequirements(Array.isArray(reqRes.data) ? reqRes.data : []);
            setMasterTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setConnectedSystems(Array.isArray(systemsRes.data) ? systemsRes.data : []);
            setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
        } catch (err) {
            console.error("Error fetching library data:", err);
            setError('Failed to load library data. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenPanel = (mode, entityType, dataToEdit = null, parentId = null) => {
        setPanelMode(mode);
        setPanelEntityType(entityType);
        setPanelDataToEdit(dataToEdit);
        setPanelParentId(parentId);
        setShowPanel(true);
        setError('');
        setSuccess('');
    };

    const handleClosePanel = () => {
        setShowPanel(false);
        setPanelDataToEdit(null);
        setPanelParentId(null);
    };

    const handleSaveEntity = async (entityType, data, idToUpdate) => {
        setSuccess('');
        setError('');
        try {
            let response;
            if (entityType === 'standard') {
                response = idToUpdate ? await updateStandard(idToUpdate, data) : await createComplianceStandard(data);
            } else if (entityType === 'requirement') {
                response = idToUpdate ? await updateRequirement(idToUpdate, data) : await createRequirement(data);
            } else if (entityType === 'task') {
                response = idToUpdate ? await updateTask(idToUpdate, data) : await createTask(data);
            }
            setSuccess(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${idToUpdate ? 'updated' : 'created'} successfully!`);
            fetchData(); // Refresh all data
            handleClosePanel();
            return response;
        } catch (err) {
            console.error(`Error saving ${entityType}:`, err);
            const errorMessage = `Failed to save ${entityType}. ${err.response?.data?.error || err.message}`;
            setError(errorMessage);
            // Keep panel open on error by not calling handleClosePanel()
            throw err; // Re-throw to let the form know about the error
        }
    };

    if (loading) {
        return <Container className="text-center mt-5"><Spinner animation="border" /> Loading Library...</Container>;
    }

    return (
        <Container fluid>
            <PageHeader title="Compliance Library Management" />
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <ThreeColumnView
                // Pass fetched data directly if ThreeColumnView is modified to accept it
                // standards={standards}
                // requirements={requirements}
                // masterTasks={masterTasks}
                // Otherwise, ThreeColumnView will fetch its own data.
                // The fetchData() call after save will ensure this component re-renders,
                // and if ThreeColumnView has its own useEffect for fetching, it might re-fetch.
                // For a more direct refresh, pass a 'key' prop to ThreeColumnView that changes on save.
                key={standards.length + requirements.length + masterTasks.length} // Simple key to force re-render/re-fetch
                showPageHeader={false}
                onAddStandardClick={() => handleOpenPanel('add', 'standard')}
                standardActions={(std) => (
                    <Button variant="outline-primary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'standard', std); }} title="Edit Standard">
                        <FaEdit />
                    </Button>
                )}
                onAddRequirementClick={(standardId) => handleOpenPanel('add', 'requirement', null, standardId)}
                requirementActions={(req) => (
                    <Button variant="outline-primary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'requirement', req); }} title="Edit Requirement">
                        <FaEdit />
                    </Button>
                )}
                onAddTaskClick={(requirementId) => handleOpenPanel('add', 'task', null, requirementId)}
                taskActions={(task) => (
                    <Button variant="outline-primary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'task', task); }} title="Edit Task">
                        <FaEdit />
                    </Button>
                )}
            />

            <EntityFormPanel
                show={showPanel}
                mode={panelMode}
                entityType={panelEntityType}
                initialData={panelDataToEdit}
                parentId={panelParentId}
                onSave={handleSaveEntity}
                onClose={handleClosePanel}
                // Pass lists for dropdowns
                allStandards={standards}
                allRequirements={requirements}
                // allUsers={users} // Pass if TaskForm needs users for assignment (not typical for master tasks)
                allConnectedSystems={connectedSystems}
                allDocuments={documents}
            />
        </Container>
    );
}

export default LibraryManagementPage;