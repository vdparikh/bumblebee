import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useParams, Link, useNavigate } 
    from 'react-router-dom';
import {
    getCampaignById, 
    getCampaignSelectedRequirements, 
    getCampaignTaskInstances, 
    updateCampaign, 
    deleteCampaign, 
    updateCampaignTaskInstance, 
    getUsers,
    getComplianceStandards,
    getRequirements as getAllMasterRequirements, 
    getTasks as getAllMasterTasks,
    getTeams
} from '../services/api';
import {
    Container,
    Row,
    Col,
    Card,
    ListGroup,
    Badge,
    Spinner,
    Alert,
    Button,
    Form,
    Modal,
    OverlayTrigger, 
    Dropdown,
    Table, 
    ListGroupItem, 
    
} from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import Select from 'react-select'; 

import {
    FaBullhorn,
    FaInfoCircle,
    FaCalendarAlt,
    
    
    FaUserShield,
    FaUserCheck,
    FaEdit,
    FaLink,
    FaTrashAlt, 
    FaCheckCircle,
    FaSpinner,
    
    
    FaCogs,         
    FaEllipsisV, 
    FaSearch,       
    FaFilter,
    FaAddressBook,
    FaUserEdit,
    FaExternalLinkAlt,
    FaThList, 
    FaTable, 
    FaSort, FaSortUp, FaSortDown 

    
} from 'react-icons/fa';
import Popover from 'react-bootstrap/Popover';

import PageHeader from './common/PageHeader';
import ConfirmModal from './common/ConfirmModal';
import TaskListItem from './common/TaskListItem';
import StatusIcon from './common/StatusIcon'; 
import UserDisplay from './common/UserDisplay'; 
import PieChartCard from './common/PieChartCard';
import BarChartCard from './common/BarChartCard';
import KeyMetricsCard from './common/KeyMetricsCard';
import TeamDisplay from './common/TeamDisplay'; // Import TeamDisplay
import { useAuth } from '../contexts/AuthContext'; 
import { getStatusColor } from '../utils/displayUtils'; 

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);


function CampaignDetail() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth(); 
    const [campaign, setCampaign] = useState(null);
    const [selectedRequirements, setSelectedRequirements] = useState([]);
    const [taskInstances, setTaskInstances] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

        const [allTeams, setAllTeams] = useState([]); // State for all teams

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [currentTaskInstanceForAssignment, setCurrentTaskInstanceForAssignment] = useState(null);
    const [selectedOwnerIDs, setSelectedOwnerIDs] = useState([]); 
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState('');
    const [selectedOwnerTeam, setSelectedOwnerTeam] = useState(''); // State for selected owner team
    const [selectedAssigneeTeam, setSelectedAssigneeTeam] = useState(''); // State for selected assignee team

    
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [availableRequirementsForModal, setAvailableRequirementsForModal] = useState([]);
    const [currentSelectedRequirementsForCampaign, setCurrentSelectedRequirementsForCampaign] = useState([]); 
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

    
    const [selectedRequirementFilterId, setSelectedRequirementFilterId] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState(null); 
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null); 
    const [filteredTaskInstances, setFilteredTaskInstances] = useState([]);
    const [taskViewMode, setTaskViewMode] = useState('list'); 
    const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'ascending' });

    
    const canEditCampaign = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.role === 'admin' || currentUser.role === 'auditor';
    }, [currentUser]);

    const fetchCampaignData = useCallback(async () => {
        if (!campaignId) return;
        setLoading(true);
        setError('');
        try {
            const campaignRes = await getCampaignById(campaignId);
            setCampaign(campaignRes.data);

            const reqRes = await getCampaignSelectedRequirements(campaignId);
            const currentReqs = Array.isArray(reqRes.data) ? reqRes.data : [];
            setSelectedRequirements(currentReqs);
            
            setCurrentSelectedRequirementsForCampaign(currentReqs.map(r => ({ requirement_id: r.requirement_id, is_applicable: r.is_applicable, control_id_reference: r.control_id_reference, requirement_text: r.requirement_text })));

            const tasksRes = await getCampaignTaskInstances(campaignId); 
            setTaskInstances(Array.isArray(tasksRes.data) ? tasksRes.data : []);

            const usersRes = await getUsers();
            setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);

                        const teamsRes = await getTeams(); // Fetch teams
            setAllTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);


        } catch (err) {
            console.error("Error fetching campaign details:", err);
            setError('Failed to load campaign details. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [campaignId]);

    useEffect(() => {
        fetchCampaignData();
    }, [fetchCampaignData]);

    
    useEffect(() => {
        let tempTasks = [...taskInstances];

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            tempTasks = tempTasks.filter(task =>
                task.title?.toLowerCase().includes(lowerSearchTerm) ||
                task.description?.toLowerCase().includes(lowerSearchTerm) ||
                task.owner_user_name?.toLowerCase().includes(lowerSearchTerm) ||
                task.assignee_user_name?.toLowerCase().includes(lowerSearchTerm) ||
                task.owner_team?.name?.toLowerCase().includes(lowerSearchTerm) ||
                task.assignee_team?.name?.toLowerCase().includes(lowerSearchTerm)

            );
        }
        if (selectedRequirementFilterId) {
            tempTasks = tempTasks.filter(task => task.campaign_selected_requirement_id === selectedRequirementFilterId);
        }
        if (activeStatusFilter) {
            tempTasks = tempTasks.filter(task => task.status === activeStatusFilter);
        }
        if (activeCategoryFilter) {
            tempTasks = tempTasks.filter(task => (task.category || 'Uncategorized') === activeCategoryFilter);
        }

        
        if (sortConfig.key !== null) {
            tempTasks.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                
                if (sortConfig.key === 'due_date') {
                    valA = a.due_date ? new Date(a.due_date) : new Date(0); 
                    valB = b.due_date ? new Date(b.due_date) : new Date(0);
                } else if (sortConfig.key === 'assignee_user_id') {
                    
                    const userA = allUsers.find(u => u.id === a.assignee_user_id);
                    const userB = allUsers.find(u => u.id === b.assignee_user_id);
                    valA = userA ? userA.name.toLowerCase() : (a.assignee_user_id || '').toLowerCase();
                    valB = userB ? userB.name.toLowerCase() : (b.assignee_user_id || '').toLowerCase();
                }


                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        setFilteredTaskInstances(tempTasks);
    }, [taskInstances, searchTerm, selectedRequirementFilterId, activeStatusFilter, activeCategoryFilter, sortConfig, allUsers]);
    const handleOpenAssignModal = (taskInstance) => {
        setCurrentTaskInstanceForAssignment(taskInstance);
        
        const currentOwnerIds = taskInstance.owners ? taskInstance.owners.map(owner => owner.id) : [];
        
        setSelectedOwnerIDs(allUsers.filter(u => currentOwnerIds.includes(u.id)).map(u => ({ value: u.id, label: u.name })));
        setSelectedAssignee(taskInstance.assignee_user_id || (currentUser ? currentUser.id : ''));
        
                setSelectedOwnerTeam(taskInstance.owner_team_id || '');
        setSelectedAssigneeTeam(taskInstance.assignee_team_id || '');


        setSelectedDueDate(taskInstance.due_date ? new Date(taskInstance.due_date).toISOString().split('T')[0] : '');
        setShowAssignModal(true);
    };

    const handleAssignTask = async () => {
        if (!currentTaskInstanceForAssignment) return;

        const updatedTaskData = {
            
            
            owner_user_ids: selectedOwnerIDs.map(owner => owner.value) || [], 
            assignee_user_id: selectedAssignee || null,
                        owner_team_id: selectedOwnerTeam || null,
            assignee_team_id: selectedAssigneeTeam || null,

            due_date: selectedDueDate || null, 
        };

        try {
            await updateCampaignTaskInstance(currentTaskInstanceForAssignment.id, updatedTaskData); 
            setShowAssignModal(false);
            fetchCampaignData(); 
                        setSelectedOwnerTeam('');
            setSelectedAssigneeTeam('');

        } catch (err) {
            console.error("Error assigning task:", err);
            
        }
    };

    const handleCampaignStatusChange = async (newStatus) => {
        if (!campaign || campaign.status === newStatus) return;
        setError('');
        try {
            
            

               
            const campaignUpdateData = { ...campaign, status: newStatus,
                selected_requirements: currentSelectedRequirementsForCampaign.map(({ requirement_id, is_applicable }) => ({ requirement_id, is_applicable }))
             };
            const updatedCampaign = await updateCampaign(campaignId, campaignUpdateData);
            setCampaign(updatedCampaign.data); 
            
        } catch (err) {
            console.error("Error updating campaign status:", err);
            setError(`Failed to update campaign status. ${err.response?.data?.error || err.message}`);
        }
    };

    const handleOpenRequirementsModal = async () => {
        if (!campaign?.standard_id) {
            setError("Campaign standard is not set. Cannot fetch requirements.");
            return;
        }
        try {
            const allReqsRes = await getAllMasterRequirements(); 
            const filteredReqs = Array.isArray(allReqsRes.data)
                ? allReqsRes.data.filter(r => r.standardId === campaign.standard_id)
                : [];
            setAvailableRequirementsForModal(filteredReqs);
            
            setShowRequirementsModal(true);
        } catch (err) {
            console.error("Error fetching requirements for modal:", err);
            setError("Failed to load requirements for selection.");
        }
    };

    const handleModalRequirementSelectionChange = (reqId, controlIdRef, reqText) => {
        setCurrentSelectedRequirementsForCampaign(prev => {
            const existing = prev.find(r => r.requirement_id === reqId);
            if (existing) {
                return prev.filter(r => r.requirement_id !== reqId);
            } else {
                
                return [...prev, { requirement_id: reqId, is_applicable: true, control_id_reference: controlIdRef, requirement_text: reqText }];
            }
        });
    };

    const handleModalApplicabilityChange = (reqId, isApplicable) => {
        setCurrentSelectedRequirementsForCampaign(prev => prev.map(r =>
            r.requirement_id === reqId ? { ...r, is_applicable: isApplicable } : r
        ));
    };

    const handleSaveRequirementsUpdate = async () => {
        if (!campaign) return;
        const campaignUpdateData = {
            ...campaign, 
            
            selected_requirements: currentSelectedRequirementsForCampaign.map(({ requirement_id, is_applicable }) => ({ requirement_id, is_applicable })),
        };
        try {
            await updateCampaign(campaignId, campaignUpdateData);
            setShowRequirementsModal(false);
            fetchCampaignData(); 
        } catch (err) {
            console.error("Error updating campaign requirements:", err);
            setError("Failed to update campaign requirements. " + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteCampaign = async () => {
        if (!campaignId) return;
        setError('');
        try {
            await deleteCampaign(campaignId);
            
            navigate('/campaigns', { state: { successMessage: `Campaign "${campaign?.name}" deleted successfully.` } });
        } catch (err) {
            console.error("Error deleting campaign:", err);
            setError(`Failed to delete campaign. ${err.response?.data?.error || err.message}`);
            setShowDeleteConfirmModal(false); 
        }
    };

    const clearAllTaskFilters = () => {
        setSearchTerm('');
        setSelectedRequirementFilterId(null);
        setActiveStatusFilter(null);
        setActiveCategoryFilter(null);
    };

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === "Closed") return false;
        return new Date(dueDate) < new Date() && new Date(dueDate).setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0);
    };
    

    
    const taskStats = useMemo(() => {
        if (!taskInstances || taskInstances.length === 0) {
            return { statusCounts: {}, overdueCount: 0, categoryCounts: {}, totalTasks: 0, completedTasksCount: 0, overallCompletionPercentage: 0 };
        }
        const statusCounts = taskInstances.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
        const overdueCount = taskInstances.filter(task => task.status !== "Closed" && isOverdue(task.due_date, task.status)).length;
        const completedTasksCount = taskInstances.filter(task => task.status === "Closed").length;
        const categoryCounts = taskInstances.reduce((acc, task) => {
            const category = task.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        const overallCompletionPercentage = taskInstances.length > 0 ? (completedTasksCount / taskInstances.length) * 100 : 0;
        return { statusCounts, overdueCount, categoryCounts, totalTasks: taskInstances.length, completedTasksCount, overallCompletionPercentage };
    }, [taskInstances]);


    const statusChartRef = React.useRef(null);
    const categoryChartRef = React.useRef(null);

    const statusChartData = useMemo(() => ({
        labels: Object.keys(taskStats.statusCounts),
        datasets: [{
            label: 'Tasks by Status',
            data: Object.values(taskStats.statusCounts),
            
            
             backgroundColor: [
                'rgba(75, 192, 192, 0.6)', 
                'rgba(54, 162, 235, 0.6)', 
                'rgba(255, 206, 86, 0.6)', 
                'rgba(153, 102, 255, 0.6)', 
                'rgba(255, 99, 132, 0.6)',  
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 1,
        }],
    }), [taskStats.statusCounts]);

    const categoryChartData = useMemo(() => ({
        labels: Object.keys(taskStats.categoryCounts),
        datasets: [{
            label: 'Tasks by Category',
            data: Object.values(taskStats.categoryCounts),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
        }],
    }), [taskStats.categoryCounts]);

    const handleStatusChartClick = (event) => {
        const chart = statusChartRef.current;
        if (!chart) return;
        const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (points.length) {
            const firstPoint = points[0];
            const label = chart.data.labels[firstPoint.index];
            setActiveStatusFilter(prevFilter => (prevFilter === label ? null : label));
            setSelectedRequirementFilterId(null); 
        }
    };

    const handleCategoryChartClick = (event) => {
        const chart = categoryChartRef.current;
        if (!chart) return;
        const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (points.length) {
            const firstPoint = points[0];
            const label = chart.data.labels[firstPoint.index];
            setActiveCategoryFilter(prevFilter => (prevFilter === label ? null : label));
            setSelectedRequirementFilterId(null); 
        }
    };

    const handleRequirementClick = (reqId) => {
        setSelectedRequirementFilterId(prev => prev === reqId ? null : reqId);
        
        
        
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <FaSort size="0.8em" className="ms-1 text-muted" />;
        if (sortConfig.direction === 'ascending') return <FaSortUp size="0.8em" className="ms-1" />;
        return <FaSortDown size="0.8em" className="ms-1" />;
    };

    if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /> Loading campaign details...</Container>;
    if (error) return <Container><Alert variant="danger">{error}</Alert></Container>;
    if (!campaign) return <Container><Alert variant="warning">Campaign not found.</Alert></Container>;

    
    return (
        <Container fluid>
            <div className='mb-2'><Badge className="small mb-1">{campaign.standard_name || 'N/A'}</Badge></div>
            
            <PageHeader
                icon={<FaBullhorn />}
                title={`Campaign / ${campaign.name}`}
                actions={
                    <>
                        {canEditCampaign ? (
                            <>
                            {canEditCampaign && (
                            <Button className='me-2' variant="outline-info" size="sm" onClick={handleOpenRequirementsModal} disabled={campaign.status !== 'Draft'}>
                                <FaEdit className="me-1" /> Edit Requirements Scope
                            </Button>
                        )}

                                <Dropdown className="d-inline me-2">
                                    <Dropdown.Toggle variant={getStatusColor(campaign.status)} id="dropdown-campaign-status" size="sm">
                                        {campaign.status}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <Dropdown.Item onClick={() => handleCampaignStatusChange('Draft')} active={campaign.status === 'Draft'} disabled={!canEditCampaign}>Draft</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleCampaignStatusChange('Active')} active={campaign.status === 'Active'} disabled={!canEditCampaign}>Active</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleCampaignStatusChange('In Progress')} active={campaign.status === 'In Progress'} disabled={!canEditCampaign}>In Progress</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleCampaignStatusChange('Pending Review')} active={campaign.status === 'Pending Review'} disabled={!canEditCampaign}>Pending Review</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleCampaignStatusChange('Completed')} active={campaign.status === 'Completed'} disabled={!canEditCampaign}>Completed</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleCampaignStatusChange('Archived')} active={campaign.status === 'Archived'} disabled={!canEditCampaign}>Archived</Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                                <Button variant="outline-danger" size="sm" onClick={() => setShowDeleteConfirmModal(true)} title="Delete Campaign" className="ms-1">
                                    <FaTrashAlt />
                                </Button>
                            </>
                        ) : (
                            <Badge bg={getStatusColor(campaign.status)} className="p-2 fs-6">{campaign.status}</Badge>
                        )}
                    </>
                }
            />

            
            <Card className="mb-3">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <Card.Title as="p" className="mb-0">
                        

                             {campaign.description || ''}
                       

                                                   

                        </Card.Title>
                    </div>

                                            <strong>Dates: </strong>
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'} -
                        {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A'}


                    </Card.Body>

            </Card>

            
            {taskInstances.length > 0 && (
                <Row className="mb-4">
                     <Col md={4} className="mb-3 mb-md-0">
                        <PieChartCard
                            title="Task Status Overview"
                            chartRef={statusChartRef}
                            chartData={statusChartData}
                            onClickHandler={handleStatusChartClick}
                        />
                    </Col>
                     <Col md={5} className="mb-3 mb-md-0">
                        <BarChartCard
                            title="Tasks by Category"
                            chartRef={categoryChartRef}
                            chartData={categoryChartData}
                            onClickHandler={handleCategoryChartClick}
                            options={{ indexAxis: 'y' }}
                        />
                    </Col>
                    <Col md={3} className="mb-3 mb-md-0">
                        <KeyMetricsCard title="Key Metrics" metrics={[
                            { label: "Total Tasks", value: taskStats.totalTasks },
                            { label: "Overdue Tasks", value: taskStats.overdueCount, variant: "danger" },
                            { label: "Overall Completion", value: `${taskStats.overallCompletionPercentage.toFixed(1)}%`, variant: "success" }
                        ]} />
                    </Col>
                </Row>
            )}

            
            <Row className="mb-3 gx-2">
                <Col>
                <div className='bg-white rounded-pill p-3'>
                    <Form.Control
                        type="search"
                        placeholder="Search campaign tasks by title, description, owner, assignee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-100 border-0"
                    />
                    </div>
                </Col>
                
                    {(searchTerm || selectedRequirementFilterId || activeStatusFilter || activeCategoryFilter) &&
                    <Col md={2} className="d-flex align-items-center">
                        <Button variant="outline-secondary" onClick={clearAllTaskFilters} className="w-100 h-100">Clear Filters</Button>
                    </Col>
                    }
                
            </Row>

            {(selectedRequirementFilterId || activeStatusFilter || activeCategoryFilter || searchTerm) && (
                <Alert variant="info" className="d-flex justify-content-between align-items-center">
                    <span>
                        <FaFilter className="me-1" />Filtering by:
                        {selectedRequirementFilterId && <Badge bg="info" className="ms-2 me-1">Req: {selectedRequirements.find(r => r.id === selectedRequirementFilterId)?.control_id_reference || 'Selected Req'}</Badge>}
                        {activeStatusFilter && <Badge bg="secondary" className="ms-2 me-1">{activeStatusFilter}</Badge>}
                        {activeCategoryFilter && <Badge bg="secondary" className="ms-2 me-1">{activeCategoryFilter}</Badge>}
                        {searchTerm && <Badge bg="dark" className="ms-2 me-1">Search: "{searchTerm}"</Badge>}
                    </span>
                </Alert>
            )}

            
            <Row>
                
                <Col md={4}>
                    <Card>
                        <Card.Header as="h5">Scoped Requirements ({selectedRequirements.length})</Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {selectedRequirements.map(req => (
                                <ListGroup.Item
                                    key={req.id || req.requirement_id}
                                    action
                                    active={selectedRequirementFilterId === req.id}
                                    onClick={() => handleRequirementClick(req.id)}
                                    className="d-flex justify-content-between align-items-center"
                                >
                                    <div>
                                        <strong>{req.control_id_reference}</strong>
                                        <small className="d-block">{req.requirement_text?.substring(0, 70)}...</small>
                                    </div>
                                    <Badge bg={req.is_applicable ? "success" : "secondary"} pill>
                                        {req.is_applicable ? "Applicable" : "N/A"}
                                    </Badge>
                                </ListGroup.Item>
                            ))}
                            {selectedRequirements.length === 0 && <ListGroup.Item>No requirements scoped.</ListGroup.Item>}
                        </ListGroup>
                    </Card>
                </Col>

                
                <Col md={8}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5>Tasks ({filteredTaskInstances.length})</h5>
                        <div>
                            <Button variant={taskViewMode === 'list' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setTaskViewMode('list')} className="me-2" title="Card View">
                                <FaThList />
                            </Button>
                            <Button variant={taskViewMode === 'table' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setTaskViewMode('table')} title="Table View">
                                <FaTable />
                            </Button>
                        </div>
                    </div>
                    {taskViewMode === 'list' && (
                        <div>
                            {filteredTaskInstances.map(task => {
                                const taskActionMenu = (
                                    <div className="d-flex align-items-center">
                                        
                                        
                                        
                                        {canEditCampaign && (
                                                            <Button style={{ lineHeight: "1em"}}  variant='transparent' onClick={() => handleOpenAssignModal(task)} className="small p-0 m-0 me-2"><FaUserEdit size="1.2em" /></Button>
                                                        )}
                                          
                                          <Button style={{ lineHeight: "1em"}} variant='transparent' as={Link} to={`/campaign-task/${task.id}`} state={{ from: `/campaigns/${campaignId}` }} className="small p-0 m-0"><FaExternalLinkAlt size="1em" /></Button>

                                                
                                            </div>
                                );
                                return (
                                    <TaskListItem
                                        key={task.id}
                                        task={task}
                                        allUsers={allUsers}
                                        
                                        
                                        isOverdueFn={isOverdue}
                                        showCampaignInfo={false} 
                                        showOwnerInfo={true}
                                        ownerTeam={task.owner_team} 
                                        assigneeTeam={task.assignee_team}

                                        
                                        owners={task.owners} 
                                        actionMenu={taskActionMenu} 
                                    />
                                );
                            })}
                            {filteredTaskInstances.length === 0 && taskInstances.length > 0 && <ListGroup.Item>No tasks match the current filters.</ListGroup.Item>}
                            {taskInstances.length === 0 && <ListGroup.Item>No task instances found for this campaign.</ListGroup.Item>}
                        </div>
                    )}
                    {taskViewMode === 'table' && (
                        <Card>
                            <Table responsive hover striped size="sm">
                                <thead>
                                    <tr>
                                        <th onClick={() => requestSort('title')} style={{ cursor: 'pointer' }}>Title {getSortIcon('title')}</th>
                                        <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>Status {getSortIcon('status')}</th>
                                        <th width="100px" onClick={() => requestSort('assignee_user_id')} style={{ cursor: 'pointer' }}>Assignee {getSortIcon('assignee_user_id')}</th>
                                        <th>Owner(s)</th> 
                                                                                <th>Team(s)</th>

                                        <th width="100px" onClick={() => requestSort('due_date')} style={{ cursor: 'pointer' }}>Due Date {getSortIcon('due_date')}</th>
                                        <th>Actions </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTaskInstances.map(task => (
                                        <tr key={task.id} className={isOverdue(task.due_date, task.status) ? 'table-danger-light' : ''}>
                                            <td>
                                                <Link to={`/campaign-task/${task.id}`} state={{ from: `/campaigns/${campaignId}` }}>
                                                    {task.title}
                                                </Link>
                                                {task.category && <Badge pill bg="light" text="dark" className="ms-2 fw-normal">{task.category}</Badge>}
                                            </td>
                                            <td><Badge bg={getStatusColor(task.status)}>{task.status}</Badge></td>
                                            <td><UserDisplay userId={task.assignee_user_id} allUsers={allUsers} /></td>
                                            <td>
                                                {task.owners && task.owners.map((owner, index) => (
                                                    <React.Fragment key={owner.id}>
                                                        <UserDisplay userId={owner.id} userName={owner.name} allUsers={allUsers} />
                                                        {index < task.owners.length - 1 && ', '}
                                                    </React.Fragment>
                                                ))}
                                            </td>
                                             <td>
                                                {task.owner_team && task.owner_team.name && (
                                                    <div className="mb-1">
                                                        <small className="text-muted me-1">Own:</small>
                                                        <TeamDisplay teamId={task.owner_team.id} teamName={task.owner_team.name} teamDescription={task.owner_team.description} teamMembers={task.owner_team.members} allTeams={allTeams} />
                                                    </div>
                                                )}
                                                {task.assignee_team && task.assignee_team.name && (
                                                    <div>
                                                        <small className="text-muted me-1">Assign:</small>
                                                        <TeamDisplay teamId={task.assignee_team.id} teamName={task.assignee_team.name} teamDescription={task.assignee_team.description} teamMembers={task.assignee_team.members} allTeams={allTeams} />
                                                    </div>
                                                )}
                                                {!task.owner_team && !task.assignee_team && <small className="text-muted">N/A</small>}
                                            </td>
                                            <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</td>
                                            <td>
                                                {canEditCampaign && (
                                                    <Button variant='link' size="sm" onClick={() => handleOpenAssignModal(task)} title="Assign Users & Due Date" className="p-0 me-2"><FaUserEdit /></Button>
                                                )}
                                                <Button variant='link' size="sm" as={Link} to={`/campaign-task/${task.id}`} state={{ from: `/campaigns/${campaignId}` }} title="View Details" className="p-0"><FaExternalLinkAlt /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            {filteredTaskInstances.length === 0 && <Card.Body className="text-center text-muted">No tasks match the current filters or no tasks available.</Card.Body>}
                        </Card>
                    )}
                </Col>
            </Row>


            
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Assign Users for Task: {currentTaskInstanceForAssignment?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group>
                            <Form.Label>Assignee</Form.Label>
                            <Form.Select value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)}>
                                <option value="">Select Assignee</option>
                                {allUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </Form.Select>
                        </Form.Group>

                        <Row>
                            <Col>
                            <Form.Group className="mt-3">
                            <Form.Label>Owners</Form.Label>
                            <Select
                                isMulti
                                options={allUsers.map(user => ({ value: user.id, label: user.name }))}
                                value={selectedOwnerIDs}
                                onChange={setSelectedOwnerIDs}
                                placeholder="Select Owners..."
                                closeMenuOnSelect={false}
                            />
                        </Form.Group>
                        
                             </Col>
                             <Col>
                             <Form.Group className="mt-3">
                            <Form.Label>Owner Team</Form.Label>
                            <Form.Select value={selectedOwnerTeam} onChange={e => setSelectedOwnerTeam(e.target.value)}>
                                <option value="">Select Owner Team</option>
                                {allTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                             </Col>
                        </Row>
                        {/* <Form.Group className="mt-3">
                            <Form.Label>Assignee Team</Form.Label>
                            <Form.Select value={selectedAssigneeTeam} onChange={e => setSelectedAssigneeTeam(e.target.value)}>
                                <option value="">Select Assignee Team</option>
                                {allTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                            </Form.Select>
                        </Form.Group> */}
                        <Form.Group className="mt-3">
                            <Form.Label>Due Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={selectedDueDate} onChange={e => setSelectedDueDate(e.target.value)} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAssignTask} disabled={!canEditCampaign}>Save Assignments</Button>
                </Modal.Footer>
            </Modal>

            
            <ConfirmModal
                show={showDeleteConfirmModal}
                title="Confirm Deletion"
                body={<>Are you sure you want to delete the campaign "<strong>{campaign?.name}</strong>"? This action cannot be undone and will also delete all associated task instances.</>}
                onConfirm={handleDeleteCampaign}
                onCancel={() => setShowDeleteConfirmModal(false)}
                confirmButtonText={canEditCampaign ? "Delete Campaign" : "Cannot Delete"}
                confirmVariant="danger"
            />

            
            <Modal show={showRequirementsModal} onHide={() => setShowRequirementsModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Scoped Requirements for: {campaign?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {availableRequirementsForModal.length === 0 && <p>No requirements found for this campaign's standard.</p>}
                    <ListGroup>
                        {availableRequirementsForModal.map(req => {
                            const isSelected = currentSelectedRequirementsForCampaign.some(sr => sr.requirement_id === req.id);
                            const selectedReqDetails = currentSelectedRequirementsForCampaign.find(sr => sr.requirement_id === req.id);
                            return (
                                <ListGroup.Item
                                    key={req.id}
                                    action
                                    onClick={() => handleModalRequirementSelectionChange(req.id, req.controlIdReference, req.requirementText)}
                                    active={isSelected}
                                    className="d-flex justify-content-between align-items-center"
                                >
                                    <span><strong>{req.controlIdReference}</strong>: {req.requirementText.substring(0, 100)}...</span>
                                    {isSelected && (
                                        <Form.Check
                                            type="switch"
                                            id={`modal-switch-req-${req.id}`}
                                            label={selectedReqDetails?.is_applicable ? "Applicable" : "Not Applicable"}
                                            checked={selectedReqDetails?.is_applicable}
                                            onChange={(e) => { e.stopPropagation(); handleModalApplicabilityChange(req.id, e.target.checked); }}
                                            onClick={(e) => e.stopPropagation()} 
                                        />
                                    )}
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRequirementsModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveRequirementsUpdate} disabled={!canEditCampaign}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default CampaignDetail;
