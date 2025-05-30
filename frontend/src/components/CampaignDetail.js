/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useParams, Link, useNavigate } // To get campaignId from URL and for navigation
    from 'react-router-dom';
import {
    getCampaignById, // API to fetch campaign details
    getCampaignSelectedRequirements, // API to fetch selected requirements for this campaign
    getCampaignTaskInstances, // API to fetch task instances for this campaign
    updateCampaign, // API to update the campaign (including requirements and status)
    deleteCampaign, // API to delete a campaign
    updateCampaignTaskInstance, // API to assign owners/assignees, update status
    getUsers,
    getComplianceStandards,
    getRequirements as getAllMasterRequirements, // To display full text if needed
    getTasks as getAllMasterTasks // To display master task info if needed
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
    OverlayTrigger, // Added for popovers
    Dropdown, // For status change    
    // ButtonGroup // For view toggle (though not used in this request, good to have if needed later)
} from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
// import { Pie, Bar } from 'react-chartjs-2'; // Will be used by reusable components
import {
    FaBullhorn,
    FaInfoCircle,
    FaCalendarAlt,
    // FaClipboardList, // Will be part of TaskListItem or specific icons
    // FaTasks as FaTasksIcon, // Will be part of StatusIcon or TaskListItem
    FaUserShield,
    FaUserCheck,
    FaEdit,
    FaLink,
    FaTrashAlt, // For delete icon
    FaCheckCircle,
    FaSpinner,
    // FaHourglassHalf, // Part of StatusIcon
    // FaTimesCircle, // Part of StatusIcon
    FaCogs,         // For automated check details
    FaEllipsisV, // For action menu
    FaSearch,       // For search icon
    FaFilter,       // For filter indication
    // FaExclamationCircle // Part of StatusIcon
} from 'react-icons/fa';
import Popover from 'react-bootstrap/Popover';

import PageHeader from './common/PageHeader';
import ConfirmModal from './common/ConfirmModal';
import TaskListItem from './common/TaskListItem';
import StatusIcon from './common/StatusIcon'; // Re-importing as TaskStatusIcon was local
import UserDisplay from './common/UserDisplay'; // Import reusable component
import PieChartCard from './common/PieChartCard';
import BarChartCard from './common/BarChartCard';
import KeyMetricsCard from './common/KeyMetricsCard';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { getStatusColor } from '../utils/displayUtils'; // Import utility

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);


function CampaignDetail() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth(); // Get current user for role-based access
    const [campaign, setCampaign] = useState(null);
    const [selectedRequirements, setSelectedRequirements] = useState([]);
    const [taskInstances, setTaskInstances] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for modals
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [currentTaskInstanceForAssignment, setCurrentTaskInstanceForAssignment] = useState(null);
    const [selectedOwner, setSelectedOwner] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState('');

    // State for requirements editing modal
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [availableRequirementsForModal, setAvailableRequirementsForModal] = useState([]);
    const [currentSelectedRequirementsForCampaign, setCurrentSelectedRequirementsForCampaign] = useState([]); // Used in the modal
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

    // State for new filtering and search
    const [selectedRequirementFilterId, setSelectedRequirementFilterId] = useState(null); // ID of requirement clicked in left col
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState(null); // From chart
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null); // From chart
    const [filteredTaskInstances, setFilteredTaskInstances] = useState([]);

    // Determine if the current user can edit campaign details
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
            // Initialize for modal editing - ensure all necessary fields are present for the modal's logic
            setCurrentSelectedRequirementsForCampaign(currentReqs.map(r => ({ requirement_id: r.requirement_id, is_applicable: r.is_applicable, control_id_reference: r.control_id_reference, requirement_text: r.requirement_text })));

            const tasksRes = await getCampaignTaskInstances(campaignId); // You'll need to create this API endpoint and service
            setTaskInstances(Array.isArray(tasksRes.data) ? tasksRes.data : []);

            const usersRes = await getUsers();
            setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);

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

    // Effect to apply filters for task instances
    useEffect(() => {
        let tempTasks = [...taskInstances];

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            tempTasks = tempTasks.filter(task =>
                task.title?.toLowerCase().includes(lowerSearchTerm) ||
                task.description?.toLowerCase().includes(lowerSearchTerm) ||
                task.owner_user_name?.toLowerCase().includes(lowerSearchTerm) ||
                task.assignee_user_name?.toLowerCase().includes(lowerSearchTerm)
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
        setFilteredTaskInstances(tempTasks);
    }, [taskInstances, searchTerm, selectedRequirementFilterId, activeStatusFilter, activeCategoryFilter]);
    const handleOpenAssignModal = (taskInstance) => {
        setCurrentTaskInstanceForAssignment(taskInstance);
        setSelectedOwner(taskInstance.owner_user_id || '');
        setSelectedAssignee(taskInstance.assignee_user_id || '');
        // Format due date for the input type="date"
        setSelectedDueDate(taskInstance.due_date ? new Date(taskInstance.due_date).toISOString().split('T')[0] : '');
        setShowAssignModal(true);
    };

    const handleAssignTask = async () => {
        if (!currentTaskInstanceForAssignment) return;

        const updatedTaskData = {
            // ... copy other fields if your update API expects the full object
            // or just send the fields to be updated
            owner_user_id: selectedOwner || null,
            assignee_user_id: selectedAssignee || null,
            due_date: selectedDueDate || null, // Add due date
        };

        try {
            await updateCampaignTaskInstance(currentTaskInstanceForAssignment.id, updatedTaskData); // API to update task instance
            setShowAssignModal(false);
            fetchCampaignData(); // Refresh data
            // Add success message
        } catch (err) {
            console.error("Error assigning task:", err);
            // Add error message
        }
    };

    const handleCampaignStatusChange = async (newStatus) => {
        if (!campaign || campaign.status === newStatus) return;
        setError('');
        try {
            // Send only the status field for update, or the full campaign object
            // The backend UpdateCampaignHandler is designed for partial updates on basic fields

               
            const campaignUpdateData = { ...campaign, status: newStatus,
                selected_requirements: currentSelectedRequirementsForCampaign.map(({ requirement_id, is_applicable }) => ({ requirement_id, is_applicable }))
             };
            const updatedCampaign = await updateCampaign(campaignId, campaignUpdateData);
            setCampaign(updatedCampaign.data); // Update local state with the response
            // Add success message if desired
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
            const allReqsRes = await getAllMasterRequirements(); // Fetches all requirements
            const filteredReqs = Array.isArray(allReqsRes.data)
                ? allReqsRes.data.filter(r => r.standardId === campaign.standard_id)
                : [];
            setAvailableRequirementsForModal(filteredReqs);
            // currentSelectedRequirementsForCampaign is already initialized from fetchCampaignData
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
                // Ensure all properties needed by the modal display are included
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
            ...campaign, // Send existing campaign data
            // Only send requirement_id and is_applicable for the update payload
            selected_requirements: currentSelectedRequirementsForCampaign.map(({ requirement_id, is_applicable }) => ({ requirement_id, is_applicable })),
        };
        try {
            await updateCampaign(campaignId, campaignUpdateData);
            setShowRequirementsModal(false);
            fetchCampaignData(); // Refresh all campaign data, including tasks and selected reqs
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
            // Add success message, maybe via query param or state on navigation
            navigate('/campaigns', { state: { successMessage: `Campaign "${campaign?.name}" deleted successfully.` } });
        } catch (err) {
            console.error("Error deleting campaign:", err);
            setError(`Failed to delete campaign. ${err.response?.data?.error || err.message}`);
            setShowDeleteConfirmModal(false); // Keep modal open on error if desired, or close
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
    // const getUserNameById = (userId) => allUsers.find(u => u.id === userId)?.name || userId;

    // Chart and Metrics data preparation (adapted from MyTasks.js)
    const taskStats = useMemo(() => {
        if (!taskInstances || taskInstances.length === 0) {
            return { statusCounts: {}, overdueCount: 0, categoryCounts: {}, totalTasks: 0 };
        }
        const statusCounts = taskInstances.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
        const overdueCount = taskInstances.filter(task => task.status !== "Closed" && isOverdue(task.due_date, task.status)).length;
        const categoryCounts = taskInstances.reduce((acc, task) => {
            const category = task.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        return { statusCounts, overdueCount, categoryCounts, totalTasks: taskInstances.length };
    }, [taskInstances]);


    const statusChartRef = React.useRef(null);
    const categoryChartRef = React.useRef(null);

    const statusChartData = useMemo(() => ({
        labels: Object.keys(taskStats.statusCounts),
        datasets: [{
            label: 'Tasks by Status',
            data: Object.values(taskStats.statusCounts),
            // backgroundColor: Object.keys(taskStats.statusCounts).map(status => getStatusColor(status) + '99'), // Opacity
            // borderColor: Object.keys(taskStats.statusCounts).map(status => getStatusColor(status)),
             backgroundColor: [
                'rgba(75, 192, 192, 0.6)', // Open
                'rgba(54, 162, 235, 0.6)', // In Progress
                'rgba(255, 206, 86, 0.6)', // Pending Review
                'rgba(153, 102, 255, 0.6)', // Closed
                'rgba(255, 99, 132, 0.6)',  // Failed / Overdue (adjust as needed)
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
            setSelectedRequirementFilterId(null); // Clear requirement filter when chart filter is used
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
            setSelectedRequirementFilterId(null); // Clear requirement filter
        }
    };

    const handleRequirementClick = (reqId) => {
        setSelectedRequirementFilterId(prev => prev === reqId ? null : reqId);
        // Optionally clear chart filters when a requirement is clicked
        // setActiveStatusFilter(null);
        // setActiveCategoryFilter(null);
    };

    if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /> Loading campaign details...</Container>;
    if (error) return <Container><Alert variant="danger">{error}</Alert></Container>;
    if (!campaign) return <Container><Alert variant="warning">Campaign not found.</Alert></Container>;

    
    return (
        <Container fluid>
            <PageHeader
                icon={<FaBullhorn />}
                title={`Campaign: ${campaign.name}`}
                actions={
                    <>
                        {canEditCampaign ? (
                            <>
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

            {/* Campaign Overview Section */}
            <Card className="mb-3">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <Card.Title className="mb-0">Campaign Details</Card.Title>
                        {canEditCampaign && (
                            <Button variant="outline-secondary" size="sm" onClick={handleOpenRequirementsModal} disabled={campaign.status !== 'Draft'}>
                                <FaEdit className="me-1" /> Edit Requirements Scope
                            </Button>
                        )}
                    </div>
                    <p><strong>Description:</strong> {campaign.description || 'N/A'}</p>
                    <p><strong>Standard:</strong> {campaign.standard_name || 'N/A'}</p>
                    <p>
                        <strong>Dates: </strong>
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'} -
                        {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A'}
                    </p>
                    {/* Add more campaign metadata as needed */}
                </Card.Body>
            </Card>

            {/* Charts and Metrics Section */}
            {taskInstances.length > 0 && (
                <Row className="mb-4">
                     <Col md={4}>
                        <PieChartCard
                            title="Task Status Overview"
                            chartRef={statusChartRef}
                            chartData={statusChartData}
                            onClickHandler={handleStatusChartClick}
                        />
                    </Col>
                     <Col md={5}>
                        <BarChartCard
                            title="Tasks by Category"
                            chartRef={categoryChartRef}
                            chartData={categoryChartData}
                            onClickHandler={handleCategoryChartClick}
                            options={{ indexAxis: 'y' }}
                        />
                    </Col>
                    <Col md={3}>
                        <KeyMetricsCard title="Key Metrics" metrics={[
                            { label: "Total Tasks", value: taskStats.totalTasks },
                            { label: "Overdue Tasks", value: taskStats.overdueCount, variant: "danger" }
                        ]} />
                    </Col>
                </Row>
            )}

            {/* Search and Filter Controls */}
            <Row className="mb-3 gx-2">
                <Col md={10}>
                    <Form.Control
                        type="search"
                        placeholder="Search campaign tasks by title, description, owner, assignee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className=""
                    />
                </Col>
                <Col md={2} className="d-flex align-items-center">
                    {(searchTerm || selectedRequirementFilterId || activeStatusFilter || activeCategoryFilter) &&
                        <Button variant="outline-secondary" onClick={clearAllTaskFilters} className="w-100 h-100">Clear Filters</Button>
                    }
                </Col>
            </Row>

            {(selectedRequirementFilterId || activeStatusFilter || activeCategoryFilter || searchTerm) && (
                <Alert variant="info" className="d-flex justify-content-between align-items-center">
                    <span>
                        <FaFilter className="me-1" />Filtering by:
                        {selectedRequirementFilterId && <Badge bg="purple" className="ms-2 me-1">Req: {selectedRequirements.find(r => r.id === selectedRequirementFilterId)?.control_id_reference || 'Selected Req'}</Badge>}
                        {activeStatusFilter && <Badge bg="primary" className="ms-2 me-1">{activeStatusFilter}</Badge>}
                        {activeCategoryFilter && <Badge bg="secondary" className="ms-2 me-1">{activeCategoryFilter}</Badge>}
                        {searchTerm && <Badge bg="dark" className="ms-2 me-1">Search: "{searchTerm}"</Badge>}
                    </span>
                </Alert>
            )}

            {/* Main Content: Requirements and Tasks */}
            <Row>
                {/* Left Column: Scoped Requirements */}
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

                {/* Right Column: Campaign Tasks */}
                <Col md={8}>
                    <Card>
                        <Card.Header as="h5">Campaign Tasks ({filteredTaskInstances.length} / {taskInstances.length})</Card.Header>
                        <ListGroup variant="flush">
                            {filteredTaskInstances.map(task => {
                                const taskActionMenu = (
                                    <div className="d-flex align-items-center">
                                        {/* Badge is now part of TaskListItem, but if you want it outside, keep it here */}
                                        {/* <Badge bg={getStatusColor(task.status)} className="me-2">{task.status}</Badge> */}
                                                <Dropdown>
                                                    <Dropdown.Toggle variant="link" id={`dropdown-cti-actions-${task.id}`} className="p-0 text-secondary no-caret">
                                                        <FaEllipsisV size="1.2em" />
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu align="end">
                                                        <Dropdown.Item as={Link} to={`/campaign-task/${task.id}`} state={{ from: `/campaigns/${campaignId}` }} className="small">View/Edit Task Details</Dropdown.Item>
                                                        {canEditCampaign && (
                                                            <Dropdown.Item onClick={() => handleOpenAssignModal(task)} className="small">Assign Users & Due Date</Dropdown.Item>
                                                        )}
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </div>
                                );
                                return (
                                    <TaskListItem
                                        key={task.id}
                                        task={task}
                                        allUsers={allUsers}
                                        // linkTo={`/campaign-task/${task.id}`}
                                        // linkState={{ from: `/campaigns/${campaignId}` }}
                                        isOverdueFn={isOverdue}
                                        showCampaignInfo={false} // Already in campaign context
                                        showOwnerInfo={true}
                                        actionMenu={taskActionMenu}
                                        className="p-3"
                                    />
                                );
                            })}
                            {filteredTaskInstances.length === 0 && taskInstances.length > 0 && <ListGroup.Item>No tasks match the current filters.</ListGroup.Item>}
                            {taskInstances.length === 0 && <ListGroup.Item>No task instances found for this campaign.</ListGroup.Item>}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>


            {/* Modal for Assigning Owner/Assignee to a Campaign Task Instance */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Assign Users for Task: {currentTaskInstanceForAssignment?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Owner</Form.Label>
                            <Form.Select value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)}>
                                <option value="">Select Owner</option>
                                {allUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Assignee</Form.Label>
                            <Form.Select value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)}>
                                <option value="">Select Assignee</option>
                                {allUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </Form.Select>
                        </Form.Group>
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

            {/* Modal for Deleting Campaign */}
            <ConfirmModal
                show={showDeleteConfirmModal}
                title="Confirm Deletion"
                body={<>Are you sure you want to delete the campaign "<strong>{campaign?.name}</strong>"? This action cannot be undone and will also delete all associated task instances.</>}
                onConfirm={handleDeleteCampaign}
                onCancel={() => setShowDeleteConfirmModal(false)}
                confirmButtonText={canEditCampaign ? "Delete Campaign" : "Cannot Delete"}
                confirmVariant="danger"
            />

            {/* Modal for Editing Selected Requirements */}
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
                                            onClick={(e) => e.stopPropagation()} // Prevent row click when toggling switch
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
