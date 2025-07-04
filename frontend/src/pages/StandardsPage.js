import React, { useState, useEffect, useCallback, useContext } from 'react';
import ModernComplianceView from '../components/views/ModernComplianceView';
import {
    getComplianceStandards,
    createComplianceStandard,
    updateStandard,
    getRequirements,
    createRequirement,
    updateRequirement,
    getTasks,
    createTask,
    updateTask,
    getUsers,
    getConnectedSystems,
    getDocuments,
    linkTaskToRequirements,
    unlinkTaskFromRequirements
} from '../services/api';
import { RightPanelContext } from '../App';
import PageHeader from '../components/common/PageHeader';
import { Button, Spinner, Alert } from 'react-bootstrap';
import EntityFormPanel from '../components/common/EntityFormPanel';
import { FaEdit, FaLink, FaUnlink, FaCheckCircle, FaExclamationCircle, FaTag, FaCogs, FaTasks } from 'react-icons/fa';

function StandardsPage() {
    const [standards, setStandards] = useState([]);
    const [requirements, setRequirements] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [connectedSystems, setConnectedSystems] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAssociatePanel, setShowAssociatePanel] = useState(false);
    const [associateRequirementId, setAssociateRequirementId] = useState(null);
    const [allTasks, setAllTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loadingAllTasks, setLoadingAllTasks] = useState(false);
    const { openRightPanel, closeRightPanel } = useContext(RightPanelContext);

    // Fetch all data
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [stdRes, reqRes, taskRes, usersRes, systemsRes, docsRes] = await Promise.all([
                getComplianceStandards(),
                getRequirements(),
                getTasks(),
                getUsers(),
                getConnectedSystems(),
                getDocuments(),
            ]);
            setStandards(Array.isArray(stdRes.data) ? stdRes.data : []);
            setRequirements(Array.isArray(reqRes.data) ? reqRes.data : []);
            setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
            setConnectedSystems(Array.isArray(systemsRes.data) ? systemsRes.data : []);
            setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
        } catch (err) {
            setError('Failed to load data. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // --- Right Panel Handlers ---
    const handleOpenPanel = (mode, entityType, dataToEdit = null, parentId = null) => {
        openRightPanel('entityForm', {
            title: `${mode === 'add' ? 'Add' : 'Edit'} ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`,
            content: (
                <EntityFormPanel
                    show={true}
                    mode={mode}
                    entityType={entityType}
                    initialData={entityType === 'requirement' && parentId ? { standardId: parentId } : dataToEdit}
                    parentId={parentId}
                    onSave={handleSaveEntity}
                    onClose={closeRightPanel}
                    allStandards={standards}
                    allRequirements={requirements}
                    allConnectedSystems={connectedSystems}
                    allUsers={users}
                    allDocuments={documents}
                />
            )
        });
    };

    // --- Save Handler ---
    const handleSaveEntity = async (entityType, data, idToUpdate) => {
        try {
            if (entityType === 'standard') {
                if (idToUpdate) {
                    await updateStandard(idToUpdate, data);
                } else {
                    await createComplianceStandard(data);
                }
            } else if (entityType === 'requirement') {
                if (idToUpdate) {
                    await updateRequirement(idToUpdate, data);
                } else {
                    await createRequirement(data);
                }
            } else if (entityType === 'task') {
                if (idToUpdate) {
                    await updateTask(idToUpdate, data);
                } else {
                    await createTask(data);
                }
            }
            fetchAll();
            closeRightPanel();
        } catch (err) {
            throw err;
        }
    };

    // --- Associate Task Panel ---
    const openAssociatePanel = async (requirementId) => {
        setAssociateRequirementId(requirementId);
        setShowAssociatePanel(true);
        setLoadingAllTasks(true);
        try {
            const res = await getTasks();
            const all = Array.isArray(res.data) ? res.data : [];
            setAllTasks(all);
            setFilteredTasks(all);
        } catch (err) {
            setError('Failed to load tasks for association. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoadingAllTasks(false);
        }
        openRightPanel('associateTasks', {
            title: 'Associate Tasks with Requirement',
            content: (
                <div style={{ minWidth: 400, maxWidth: 600 }}>
                    <h5 className="mb-3">Associate Tasks with Requirement</h5>
                    <input
                        type="text"
                        className="form-control mb-3"
                        placeholder="Search tasks by title, category, or description..."
                        onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase();
                            setFilteredTasks(allTasks.filter(task =>
                                task.title?.toLowerCase().includes(searchTerm) ||
                                task.category?.toLowerCase().includes(searchTerm) ||
                                task.description?.toLowerCase().includes(searchTerm)
                            ));
                        }}
                    />
                    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                        {loadingAllTasks ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" />
                                <p className="mt-2">Loading available tasks...</p>
                            </div>
                        ) : filteredTasks.length > 0 ? (
                            filteredTasks.map(task => {
                                const isAlreadyAssociated = tasks.some(t => t.id === task.id && t.requirementIds && t.requirementIds.includes(requirementId));
                                return (
                                    <div key={task.id} className={`d-flex align-items-center justify-content-between border-bottom py-2 ${isAlreadyAssociated ? 'bg-light' : ''}`}>
                                        <div>
                                            <span className="fw-bold">{task.title}</span>
                                            {task.category && <span className="ms-2 badge bg-info"><FaTag className="me-1" />{task.category}</span>}
                                            {task.defaultPriority && <span className="ms-2 badge bg-secondary"><FaExclamationCircle className="me-1" />{task.defaultPriority}</span>}
                                            {task.checkType && <span className="ms-2 badge bg-secondary"><FaCogs className="me-1" />{task.checkType}</span>}
                                        </div>
                                        <div>
                                            {!isAlreadyAssociated ? (
                                                <Button variant="outline-primary" size="sm" onClick={async () => {
                                                    try {
                                                        await linkTaskToRequirements(task.id, [requirementId]);
                                                        fetchAll();
                                                        closeRightPanel();
                                                    } catch (error) {
                                                        setError('Failed to associate task. ' + (error.response?.data?.error || error.message));
                                                    }
                                                }}>
                                                    <FaLink className="me-1" />Associate
                                                </Button>
                                            ) : (
                                                <Button variant="outline-danger" size="sm" onClick={async () => {
                                                    try {
                                                        await unlinkTaskFromRequirements(task.id, [requirementId]);
                                                        fetchAll();
                                                        closeRightPanel();
                                                    } catch (error) {
                                                        setError('Failed to remove association. ' + (error.response?.data?.error || error.message));
                                                    }
                                                }}>
                                                    <FaUnlink className="me-1" />Remove
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-4">
                                <FaTasks size={48} className="text-muted mb-3" />
                                <p className="text-muted">No tasks found.</p>
                            </div>
                        )}
                    </div>
                    <Button className="mt-3" variant="secondary" onClick={closeRightPanel}>Close</Button>
                </div>
            )
        });
    };

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Loading Standards...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div className="">
            {/* <PageHeader title="Standards" subtitle="Manage compliance standards" /> */}
            <ModernComplianceView
                showPageHeader={false}
                standardsOnly={true}
                standards={standards}
                onAddStandardClick={() => handleOpenPanel('add', 'standard')}
                standardActions={(std) => (
                    <Button className='nopadding text-warning' variant="transparent" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'standard', std); }} title="Edit Standard">
                        <FaEdit />
                    </Button>
                )}
                onAddRequirementClick={(standardId) => handleOpenPanel('add', 'requirement', null, standardId)}
                requirementActions={(req) => (
                    <Button className='nopadding text-warning' variant="transparent" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'requirement', req); }} title="Edit Requirement">
                        <FaEdit />
                    </Button>
                )}
                onAddTaskClick={(requirementId) => handleOpenPanel('add', 'task', null, requirementId)}
                taskActions={(task) => (
                    <Button className='nopadding text-warning' variant="transparent" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPanel('edit', 'task', task); }} title="Edit Task">
                        <FaEdit />
                    </Button>
                )}
                onAssociateTaskClick={openAssociatePanel}
            />
        </div>
    );
}

export default StandardsPage; 