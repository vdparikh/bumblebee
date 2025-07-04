import React, { useState, useEffect, useCallback, useContext } from 'react';
import TaskLibraryView from '../../components/ui/TaskLibraryView';
import { getTasks, createTask, updateTask, getConnectedSystems, getUsers, getDocuments } from '../../services/api';
import { RightPanelContext } from '../../App';
import PageHeader from '../../components/ui/PageHeader';
import { Button, Spinner, Alert } from 'react-bootstrap';
import EntityFormPanel from '../../components/forms/EntityFormPanel';
import { FaPlusCircle } from 'react-icons/fa';

function TaskLibraryPage() {
    const [tasks, setTasks] = useState([]);
    const [connectedSystems, setConnectedSystems] = useState([]);
    const [users, setUsers] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { openRightPanel, closeRightPanel } = useContext(RightPanelContext);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [taskRes, systemsRes, usersRes, docsRes] = await Promise.all([
                getTasks(),
                getConnectedSystems(),
                getUsers(),
                getDocuments(),
            ]);
            setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setConnectedSystems(Array.isArray(systemsRes.data) ? systemsRes.data : []);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
            setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
        } catch (err) {
            setError('Failed to load tasks. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenPanel = (mode, dataToEdit = null) => {
        openRightPanel('entityForm', {
            title: `${mode === 'add' ? 'Add' : 'Edit'} Task`,
            content: (
                <EntityFormPanel
                    show={true}
                    mode={mode}
                    entityType="task"
                    initialData={dataToEdit}
                    onSave={handleSaveEntity}
                    onClose={closeRightPanel}
                    allConnectedSystems={connectedSystems}
                    allUsers={users}
                    allDocuments={documents}
                />
            )
        });
    };

    const handleSaveEntity = async (entityType, data, idToUpdate) => {
        try {
            if (idToUpdate) {
                await updateTask(idToUpdate, data);
            } else {
                await createTask(data);
            }
            fetchData();
            closeRightPanel();
        } catch (err) {
            throw err;
        }
    };

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Loading Tasks...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div className="">
            <PageHeader title="Task Library" subtitle="Manage all tasks" 
                        actions={<Button variant="primary" className="me-2" onClick={() => handleOpenPanel('add')}><FaPlusCircle className="me-1" />Add Task</Button>}

/>
            <TaskLibraryView
                tasks={tasks}
                connectedSystems={connectedSystems}
                onAddTask={() => handleOpenPanel('add')}
                onEditTask={(task) => handleOpenPanel('edit', task)}
            />
        </div>
    );
}

export default TaskLibraryPage; 