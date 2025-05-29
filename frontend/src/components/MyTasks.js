import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getUserCampaignTasks, getUsers, getCampaigns } from '../services/api';
import ListGroup from 'react-bootstrap/ListGroup';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import {
    FaTasks,
    FaUserCircle,
    FaBullhorn,
    FaRegClock,
    FaTag,
    FaSearch,
    FaListUl, FaThLarge,
    FaFilter
} from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { defaults } from 'chart.js';

import StatusIcon from './common/StatusIcon';
import UserDisplay from './common/UserDisplay';
import PageHeader from './common/PageHeader';
import TaskListItem from './common/TaskListItem';
import PieChartCard from './common/PieChartCard';
import BarChartCard from './common/BarChartCard';
import KeyMetricsCard from './common/KeyMetricsCard';
import { getStatusColor } from '../utils/displayUtils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function MyTasks() {
    defaults.font.family = 'Lato';

    const [myTasks, setMyTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [allCampaigns, setAllCampaigns] = useState([]);
    const [activeStatusFilter, setActiveStatusFilter] = useState(null);
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);
    // const [activeCampaignFilter, setActiveCampaignFilter] = useState(''); // Kept for potential future use with dropdown
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedCampaignIdForColumnView, setSelectedCampaignIdForColumnView] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('list');

    const loggedInUserId = "36a95829-f890-43dc-aff3-289c50ce83c2";
    const statusChartRef = useRef(null);
    const categoryChartRef = useRef(null);

    const fetchData = useCallback(async () => {
        if (!loggedInUserId) {
            setError("User ID not available. Cannot fetch tasks.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const tasksPromise = getUserCampaignTasks(loggedInUserId, "owner", "Active");
            const usersPromise = getUsers();
            const campaignsPromise = getCampaigns("Active");

            const [tasksResponse, usersResponse, campaignsResponse] = await Promise.all([tasksPromise, usersPromise, campaignsPromise]);

            const fetchedTasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
            setMyTasks(fetchedTasks);
        if (usersResponse?.data) { // Added optional chaining for safety
                setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
            } else {
                console.warn("No data in users response or response format unexpected", usersResponse);
                setUsers([]);
            }
            if (campaignsResponse.data) {
                setAllCampaigns(Array.isArray(campaignsResponse.data) ? campaignsResponse.data : []);
            } else {
                console.warn("No data in campaigns response or response format unexpected", campaignsResponse);
                setAllCampaigns([]);
            }
        } catch (err) {
            console.error("Error fetching my tasks:", err);
            setError('Failed to fetch your tasks, user data, or campaign data.');
            setMyTasks([]);
            setUsers([]);
            setAllCampaigns([]);
        }
        finally {
            setLoading(false);
        }
    }, [loggedInUserId]);

    useEffect(() => {
        fetchData();
}, [fetchData]); // fetchData is already memoized with loggedInUserId

    // This useEffect now directly uses myTasks which is pre-filtered by the API
    useEffect(() => { 
        let tasksToFilter = [...myTasks]; // myTasks is now already filtered for "In Progress" campaigns

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            tasksToFilter = tasksToFilter.filter(task =>
                task.title?.toLowerCase().includes(lowerSearchTerm) ||
                task.campaign_name?.toLowerCase().includes(lowerSearchTerm) ||
                task.description?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        if (activeStatusFilter) {
            tasksToFilter = tasksToFilter.filter(task => task.status === activeStatusFilter);
        }
        if (activeCategoryFilter) {
            tasksToFilter = tasksToFilter.filter(task => (task.category || 'Uncategorized') === activeCategoryFilter);
        }
        // if (activeCampaignFilter) { // Kept for potential future use with dropdown
        //     tasksToFilter = tasksToFilter.filter(task => task.campaign_id === activeCampaignFilter);
        // }
        if (selectedCampaignIdForColumnView) {
            tasksToFilter = tasksToFilter.filter(task => task.campaign_id === selectedCampaignIdForColumnView);
        }

        setFilteredTasks(tasksToFilter);
    }, [myTasks, activeStatusFilter, activeCategoryFilter, searchTerm, selectedCampaignIdForColumnView]);

    const isOverdue = (dueDate, status) => { // Added status to align with TaskListItem
        if (!dueDate || status === "Closed") return false;
        return new Date(dueDate) < new Date() && new Date(dueDate).setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0);
    };

    const taskStats = useMemo(() => {
        if (!myTasks || myTasks.length === 0) {
            return {
                statusCounts: {},
                overdueCount: 0,
                categoryCounts: {},
                totalTasks: 0,
            };
        }

        const statusCounts = myTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});

        const overdueCount = myTasks.filter(task => task.status !== "Closed" && isOverdue(task.due_date, task.status)).length;

        const categoryCounts = myTasks.reduce((acc, task) => {
            const category = task.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        return {
            statusCounts,
            overdueCount,
            categoryCounts,
            totalTasks: myTasks.length,
        };
    }, [myTasks]);

    const kanbanColumns = useMemo(() => [
        { id: 'Open', title: 'Open' },
        { id: 'In Progress', title: 'In Progress' },
        { id: 'Pending Review', title: 'Pending Review' },
        { id: 'Closed', title: 'Closed' },
        { id: 'Failed', title: 'Failed' },
    ], []);

    const tasksByStatus = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            const status = task.status || 'Open';
            if (!acc[status]) acc[status] = [];
            acc[status].push(task);
            return acc;
        }, {});
    }, [filteredTasks]);


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
        }
    };


    if (loading) {
        return (
            <div className="text-center mt-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Loading your tasks...</p>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                icon={<FaTasks />}
                title="My Tasks"
                actions={
                    <ButtonGroup>
                        <Button variant={viewMode === 'list' ? "primary" : "outline-secondary"} onClick={() => setViewMode('list')} title="List View">
                            <FaListUl />
                        </Button>
                        <Button variant={viewMode === 'board' ? "primary" : "outline-secondary"} onClick={() => setViewMode('board')} title="Board View">
                            <FaThLarge />
                        </Button>
                    </ButtonGroup>
                }
            />

            {error && <Alert variant="danger">{error}</Alert>}

            {myTasks.length > 0 && !loading && (
                <Row className="mb-4">
                    <Col md={4}>
                        <PieChartCard
                            title="Task Status Overview"
                            chartRef={statusChartRef}
                            chartData={statusChartData}
                            onClickHandler={handleStatusChartClick}
                            options={{
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            label: function (context) {
                                                let label = context.dataset.label || '';
                                                if (label) { label += ': '; }
                                                if (context.parsed !== null) { label += context.parsed; }
                                                return label + (activeStatusFilter === context.label ? ' (Active Filter)' : '');
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </Col>
                    <Col md={5}>
                        <BarChartCard
                            title="Tasks by Category"
                            chartRef={categoryChartRef}
                            chartData={categoryChartData}
                            onClickHandler={handleCategoryChartClick}
                            options={{
                                indexAxis: 'y',
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            label: function (context) {
                                                let label = context.dataset.label || '';
                                                if (label) { label += ': '; }
                                                if (context.parsed !== null) { label += context.parsed; }
                                                return label + (activeCategoryFilter === context.label ? ' (Active Filter)' : '');
                                            }
                                        }
                                    }
                                }
                            }}
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

            <Row className="mb-3 gx-2">
                <Col md={12}>
                    <Form.Control
                        type="search"
                        placeholder="Search tasks by title, campaign..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-100"
                    />
                </Col>
            </Row>

            <Row className="mb-4 gx-3">
                <Col md={3}>
                    <Card>
                        <Card.Header as="h6">Filter by Campaign</Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <ListGroup.Item
                                action
                                active={!selectedCampaignIdForColumnView}
                                onClick={() => setSelectedCampaignIdForColumnView('')}
                            >
                                All My Tasks
                            </ListGroup.Item>
                            {allCampaigns.map(campaign => (
                                <ListGroup.Item
                                    key={campaign.id}
                                    action
                                    active={selectedCampaignIdForColumnView === campaign.id}
                                    onClick={() => {
                                        setSelectedCampaignIdForColumnView(prev => prev === campaign.id ? '' : campaign.id);
                                    }}
                                >
                                    {campaign.name}
                                </ListGroup.Item>
                            ))}
                            {allCampaigns.length === 0 && !loading && <ListGroup.Item>No campaigns found.</ListGroup.Item>}
                        </ListGroup>
                    </Card>
                </Col>
                <Col md={9}>
                    {(activeStatusFilter || activeCategoryFilter || searchTerm || selectedCampaignIdForColumnView) && (
                        <Alert variant="info" className="d-flex justify-content-between align-items-center mb-3">
                            <span>
                                <FaFilter className="me-1" />Filtering by:
                                {selectedCampaignIdForColumnView && <Badge bg="info" className="ms-2 me-1">Campaign: {allCampaigns.find(c => c.id === selectedCampaignIdForColumnView)?.name || 'Selected'}</Badge>}
                                {activeStatusFilter && <Badge bg="primary" className="ms-2 me-1">{activeStatusFilter}</Badge>}
                                {activeCategoryFilter && <Badge bg="secondary" className="ms-2 me-1">{activeCategoryFilter}</Badge>}
                                {searchTerm && <Badge bg="dark" className="ms-2 me-1">Search: "{searchTerm}"</Badge>}
                            </span>
                        </Alert>
                    )}

                    {filteredTasks.length === 0 && myTasks.length > 0 && !loading &&
                        (activeStatusFilter ||
                            activeCategoryFilter ||
                            // activeCampaignFilter || // Kept for potential future use with dropdown
                            searchTerm ||
                            selectedCampaignIdForColumnView) &&
                        <Alert variant="warning">No tasks match the current filter criteria.</Alert>
                    }

                    {viewMode === 'board' && (
                        <Row className="kanban-board gx-3">
                            {kanbanColumns.map(column => (
                                <Col key={column.id} md={6} lg className="kanban-column mb-3">
                                    <Card>
                                        <Card.Header className="fw-bold text-center" style={{ backgroundColor: getStatusColor(column.id) + '33' }}>
                                            {column.title} ({tasksByStatus[column.id]?.length || 0})
                                        </Card.Header>
                                        <Card.Body style={{ minHeight: '200px', maxHeight: 'calc(60vh - 50px)', overflowY: 'auto' }} className="p-2">
                                            {(tasksByStatus[column.id] || []).map(task => (
                                                <Card key={task.id} className="mb-4 kanban-card">
                                                    <Card.Body as={Link} to={`/campaign-task/${task.id}`} state={{ from: '/my-tasks' }} className="text-decoration-none p-2">
                                                        <Card.Title className="h6 mb-1">{task.title}</Card.Title>
                                                        <Card.Text className="small text-muted mb-1">
                                                            <FaBullhorn size="0.8em" className="me-1" /> {task.campaign_name || 'N/A'}
                                                        </Card.Text>
                                                        <Card.Text className="small text-muted mb-1">
                                                            <FaRegClock size="0.8em" className="me-1" /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                                                            {isOverdue(task.due_date, task.status) && (
                                                                <Badge bg="danger" pill className="ms-1 float-end">Overdue</Badge>
                                                            )}
                                                        </Card.Text>
                                                        <Card.Text className="small text-muted">
                                                            <FaUserCircle size="0.8em" className="me-1" /> <UserDisplay userId={task.assignee_user_id} allUsers={users} />
                                                        </Card.Text>
                                                    </Card.Body>
                                                </Card>
                                            ))}
                                            {(!tasksByStatus[column.id] || tasksByStatus[column.id].length === 0) && <p className="text-muted text-center small mt-3">No tasks</p>}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                    {viewMode === 'list' && (
                        <Card>
                            <Card.Header as="h5">Tasks ({filteredTasks.length} / {myTasks.length})</Card.Header>
                            <ListGroup variant='flush' className="shadow-none border-0">
                                {filteredTasks.map(task => (
                                    <TaskListItem
                                        key={task.id}
                                        task={task}
                                        allUsers={users}
                                        linkTo={`/campaign-task/${task.id}`}
                                        linkState={{ from: '/my-tasks' }}
                                        isOverdueFn={isOverdue}
                                        showCampaignInfo={true}
                                        showAssigneeInfo={true}
                                        showOwnerInfo={false} // Owner is the loggedInUserId for "My Tasks"
                                    />
                                ))}
                            </ListGroup>
                        </Card>
                    )}

                    {myTasks.length === 0 && !loading && !error && (
                        <div className='text-center m-3'>
                            <FaTasks size="10em" className="ms-2 text-muted" />
                            <Alert variant="info" className="mt-3">You currently have no tasks assigned as owner.</Alert>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
}

export default MyTasks;
