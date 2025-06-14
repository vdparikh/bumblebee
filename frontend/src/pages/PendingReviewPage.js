import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getCampaignTasksByStatus, getUsers, getCampaigns } from '../services/api';
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
import Table from 'react-bootstrap/Table';
import { useAuth } from '../contexts/AuthContext';

import {
    FaTasks,
    FaUserCircle,
    FaBullhorn,
    FaRegClock,
    FaSearch,
    FaListUl, FaThLarge,
    FaFilter,
    FaSort, FaSortUp, FaSortDown,
    FaTable,
    FaHourglassHalf
} from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { defaults } from 'chart.js';

import UserDisplay from '../components/common/UserDisplay';
import PageHeader from '../components/common/PageHeader';
import TaskListItem from '../components/common/TaskListItem';
import PieChartCard from '../components/common/PieChartCard';
import BarChartCard from '../components/common/BarChartCard';
import KeyMetricsCard from '../components/common/KeyMetricsCard';
import { getStatusColor } from '../utils/displayUtils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function PendingReviewPage() {
    defaults.font.family = 'Lato';

    const { currentUser } = useAuth();
    const loggedInUserId = currentUser?.id;

    const [allTasks, setAllTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [allCampaigns, setAllCampaigns] = useState([]);
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCampaignIdForColumnView, setSelectedCampaignIdForColumnView] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'ascending' });

    const categoryChartRef = useRef(null);

    const fetchData = useCallback(async () => {
        if (!loggedInUserId) {
            setError("User ID not available. Cannot fetch tasks.");
            setLoading(false);
            return;
        }
    setLoading(true); // Moved setLoading and setError inside the try block for consistency
    setError(''); //
    try {
        const tasksPromise = getCampaignTasksByStatus("Active", "Pending Review");
            const usersPromise = getUsers();
            const campaignsPromise = getCampaigns("Active");

            // Await promises and handle potential individual errors more gracefully
            const [tasksResponse, usersResponse, campaignsResponse] = await Promise.allSettled([tasksPromise, usersPromise, campaignsPromise]);

            let currentErrors = [];

            console.log(tasksResponse)
            if (tasksResponse.status === 'fulfilled' && tasksResponse.value?.data) {
            // No client-side filtering needed if API returns tasks already filtered by status
            setAllTasks(Array.isArray(tasksResponse.value.data) ? tasksResponse.value.data : []);
            } else {
                console.error("Failed to fetch or process tasks:", tasksResponse.status === 'rejected' ? tasksResponse.reason : "No data in tasks response");
                currentErrors.push("Failed to fetch tasks.");
                setAllTasks([]);
            }

            if (usersResponse.status === 'fulfilled' && usersResponse.value?.data) {
                setUsers(Array.isArray(usersResponse.value.data) ? usersResponse.value.data : []);
            } else if (usersResponse.status === 'fulfilled' && !usersResponse.value?.data) {
                console.warn("No data in users response or response format unexpected", usersResponse.value);
                setUsers([]);
            } else {
                 console.error("Failed to fetch users:", usersResponse.reason);
                 currentErrors.push("Failed to fetch user data.");
                setUsers([]);
            }

            if (campaignsResponse.status === 'fulfilled' && campaignsResponse.value?.data) {
                setAllCampaigns(Array.isArray(campaignsResponse.value.data) ? campaignsResponse.value.data : []);
            } else if (campaignsResponse.status === 'fulfilled' && !campaignsResponse.value?.data) {
                console.warn("No data in campaigns response or response format unexpected", campaignsResponse.value);
                setAllCampaigns([]);
            } else {
                console.error("Failed to fetch campaigns:", campaignsResponse.reason);
                currentErrors.push("Failed to fetch campaign data.");
                setAllCampaigns([]);
            }
            if (currentErrors.length > 0) {
                setError(currentErrors.join(' '));
            }
        } catch (err) {
            // This catch block might be less likely to be hit if Promise.allSettled is used,
            // but good to keep for other unexpected errors.
            console.error("Error fetching data for review page:", err);
            setError('An unexpected error occurred while loading data. ' + (err.response?.data?.error || err.message));
            // Ensure states are reset on a general catch too
            setAllTasks([]);
            setUsers([]);
            setAllCampaigns([]);
        }
        finally {
            setLoading(false);
        }
    }, [loggedInUserId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let tasksToFilter = [...allTasks]; // Start with tasks already filtered by "Pending Review"

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            tasksToFilter = tasksToFilter.filter(task =>
                task.title?.toLowerCase().includes(lowerSearchTerm) ||
                task.campaign_name?.toLowerCase().includes(lowerSearchTerm) ||
                task.description?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        if (activeCategoryFilter) {
            tasksToFilter = tasksToFilter.filter(task => (task.category || 'Uncategorized') === activeCategoryFilter);
        }

        if (selectedCampaignIdForColumnView) {
            tasksToFilter = tasksToFilter.filter(task => task.campaign_id === selectedCampaignIdForColumnView);
        }

        if (sortConfig.key !== null && viewMode === 'table') {
            tasksToFilter.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (sortConfig.key === 'due_date') {
                    valA = a.due_date ? new Date(a.due_date) : new Date(0);
                    valB = b.due_date ? new Date(b.due_date) : new Date(0);
                } else if (sortConfig.key === 'campaign_name') {
                    valA = (a.campaign_name || '').toLowerCase();
                    valB = (b.campaign_name || '').toLowerCase();
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

        setFilteredTasks(tasksToFilter);
    }, [allTasks, activeCategoryFilter, searchTerm, selectedCampaignIdForColumnView, sortConfig, viewMode]);

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === "Closed") return false;
        return new Date(dueDate) < new Date() && new Date(dueDate).setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0);
    };

    const taskStats = useMemo(() => {
        if (!allTasks || allTasks.length === 0) {
            return {
                categoryCounts: {},
                totalTasks: 0,
            };
        }

        const categoryCounts = allTasks.reduce((acc, task) => {
            const category = task.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        return {
            categoryCounts,
            totalTasks: allTasks.length,
        };
    }, [allTasks]);

    const kanbanColumns = useMemo(() => [
        { id: 'Pending Review', title: 'Pending Review' },
    ], []);

    const tasksByStatus = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            const status = task.status || 'Pending Review'; // Should always be Pending Review here
            if (!acc[status]) acc[status] = [];
            acc[status].push(task);
            return acc;
        }, {});
    }, [filteredTasks]);

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

    if (loading) {
        return (
            <div className="text-center mt-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Loading tasks pending review...</p>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                icon={<FaHourglassHalf />}
                title="Pending Review Queue"
                actions={
                    <ButtonGroup>
                        <Button variant={viewMode === 'list' ? "primary" : "outline-secondary"} onClick={() => setViewMode('list')} title="List View" className='border-0'>
                            <FaListUl />
                        </Button>
                        <Button variant={viewMode === 'board' ? "primary" : "outline-secondary"} onClick={() => setViewMode('board')} title="Board View" className='border-0'>
                            <FaThLarge />
                        </Button>
                        <Button variant={viewMode === 'table' ? "primary" : "outline-secondary"} onClick={() => setViewMode('table')} title="Table View" className='border-0'>
                            <FaTable />
                        </Button>
                    </ButtonGroup>
                }
            />

            {error && <Alert variant="danger">{error}</Alert>}

            {allTasks.length > 0 && !loading && (
                <Row className="mb-4">
                    <Col md={8}>
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
                    <Col md={4}>
                        <KeyMetricsCard title="Key Metrics" metrics={[
                            { label: "Total Tasks Pending Review", value: taskStats.totalTasks, variant: "warning" },
                        ]} />
                    </Col>
                </Row>
            )}

            <Row className="mb-4 gx-2">
                <Col md={12}>
                    <div className='bg-white rounded-pill p-3'>
                        <Form.Control
                            type="search"
                            placeholder="Search tasks by title, campaign..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-100 border-0"
                        />
                    </div>
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
                                All Campaigns
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
                            {allCampaigns.length === 0 && !loading && <ListGroup.Item>No active campaigns found.</ListGroup.Item>}
                        </ListGroup>
                    </Card>
                </Col>
                <Col md={9}>
                    {(activeCategoryFilter || searchTerm || selectedCampaignIdForColumnView) && (
                        <Alert variant="info" className="d-flex justify-content-between align-items-center mb-3">
                            <span>
                                <FaFilter className="me-1" />Filtering by:
                                {selectedCampaignIdForColumnView && <Badge bg="info" className="ms-2 me-1">Campaign: {allCampaigns.find(c => c.id === selectedCampaignIdForColumnView)?.name || 'Selected'}</Badge>}
                                {activeCategoryFilter && <Badge bg="secondary" className="ms-2 me-1">{activeCategoryFilter}</Badge>}
                                {searchTerm && <Badge bg="dark" className="ms-2 me-1">Search: "{searchTerm}"</Badge>}
                            </span>
                        </Alert>
                    )}

                    {filteredTasks.length === 0 && allTasks.length > 0 && !loading &&
                        (activeCategoryFilter || searchTerm || selectedCampaignIdForColumnView) &&
                        <Alert variant="warning">No tasks match the current filter criteria.</Alert>
                    }

                    {viewMode === 'board' && (
                        <Row className="kanban-board gx-3">
                            {kanbanColumns.map(column => (
                                <Col key={column.id} md={12} className="kanban-column mb-3"> {/* Only one column for Pending Review */}
                                    <div>
                                        <div className="fw-bold text-center" style={{ backgroundColor: getStatusColor(column.id) + '33' }}>
                                            {column.title} ({tasksByStatus[column.id]?.length || 0})
                                        </div>
                                        <div style={{ minHeight: '200px', maxHeight: 'calc(60vh - 50px)', overflowY: 'auto' }} className="p-2">
                                            {(tasksByStatus[column.id] || []).map(task => (
                                                <Card key={task.id} className="mb-4 kanban-card">
                                                    <Card.Body as={Link} to={`/campaign-task/${task.id}`} state={{ from: '/pending-review' }} className="text-decoration-none p-2">
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
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    )}
                    {viewMode === 'list' && (
                        <div>
                            {filteredTasks.map(task => (
                                <TaskListItem
                                    key={task.id}
                                    task={task}
                                    allUsers={users}
                                    linkTo={`/campaign-task/${task.id}`}
                                    linkState={{ from: '/pending-review' }}
                                    isOverdueFn={isOverdue}
                                    showCampaignInfo={true}
                                    showAssigneeInfo={true}
                                    showOwnerInfo={true}
                                    owners={task.owners}
                                    assigneeTeam={task.assignee_team}
                                    ownerTeam={task.owner_team}
                                    evidenceCount={task.evidence_count}
                                    commentCount={task.comment_count}
                                />
                            ))}
                        </div>
                    )}
                    {viewMode === 'table' && (
                        <Card>
                            <Table responsive hover striped size="sm">
                                <thead>
                                    <tr>
                                        <th onClick={() => requestSort('title')} style={{ cursor: 'pointer' }}>Title {getSortIcon('title')}</th>
                                        <th onClick={() => requestSort('campaign_name')} style={{ cursor: 'pointer' }}>Campaign {getSortIcon('campaign_name')}</th>
                                        <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>Status {getSortIcon('status')}</th>
                                        <th onClick={() => requestSort('due_date')} style={{ cursor: 'pointer' }}>Due Date {getSortIcon('due_date')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTasks.map(task => (
                                        <tr key={task.id} className={isOverdue(task.due_date, task.status) ? 'table-danger-light' : ''}>
                                            <td>
                                                <Link to={`/campaign-task/${task.id}`} state={{ from: '/pending-review' }}>
                                                    {task.title}
                                                </Link>
                                                {task.category && <Badge pill bg="light" text="dark" className="ms-2 fw-normal">{task.category}</Badge>}
                                            </td>
                                            <td>
                                                <Link to={`/campaigns/${task.campaign_id}`}>
                                                    {task.campaign_name || 'N/A'}
                                                </Link>
                                            </td>
                                            <td><Badge bg={getStatusColor(task.status)}>{task.status}</Badge></td>
                                            <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            {filteredTasks.length === 0 && <Card.Body className="text-center text-muted">No tasks match the current filters or no tasks available.</Card.Body>}
                        </Card>
                    )}

                    {allTasks.length === 0 && !loading && !error && (
                        <div className='text-center m-3'>
                            <FaHourglassHalf size="10em" className="ms-2 text-muted" />
                            <Alert variant="info" className="mt-3">There are currently no tasks pending review.</Alert>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
}

export default PendingReviewPage;