import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getUserCampaignTasks, getCampaigns, getUsers, getUserFeed } from '../services/api'; 
import { Row, Col, Card, Spinner, Alert, ListGroup, Badge, ProgressBar } from 'react-bootstrap';
import { FaTachometerAlt, FaBullhorn, FaComment } from 'react-icons/fa';

import PageHeader from './common/PageHeader'; 
import KeyMetricsCard from './common/KeyMetricsCard';
import PieChartCard from './common/PieChartCard';
import TaskListItem from './common/TaskListItem';
import { getStatusColor } from '../utils/displayUtils';
import UserDisplay from './common/UserDisplay'; 
import { useAuth } from '../contexts/AuthContext';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function Dashboard() {
    const [myTasks, setMyTasks] = useState([]);
    const [activeCampaigns, setActiveCampaigns] = useState([]);
    const [userFeed, setUserFeed] = useState([]); 
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { currentUser } = useAuth();
    const loggedInUserId = currentUser?.id; 


    const statusChartRef = useRef(null);
    

    const fetchData = useCallback(async () => {
        if (!loggedInUserId) {
            setError("User ID not available.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            
            const tasksPromise = getUserCampaignTasks(loggedInUserId, "owner"); 
            const campaignsPromise = getCampaigns("Active"); 
            const feedPromise = getUserFeed({ limit: 7 }); 
            const usersPromise = getUsers();

            const [tasksResponse, campaignsResponse, usersResponse, feedResponse] = await Promise.allSettled([
                tasksPromise, campaignsPromise, usersPromise, feedPromise
            ]);

            if (tasksResponse.status === 'fulfilled' && tasksResponse.value.data) {
                setMyTasks(Array.isArray(tasksResponse.value.data) ? tasksResponse.value.data : []);
            } else {
                console.warn("Failed to fetch tasks or no tasks data:", tasksResponse.reason || "No data");
                setMyTasks([]);
            }

            if (campaignsResponse.status === 'fulfilled' && campaignsResponse.value.data) {
                setActiveCampaigns(Array.isArray(campaignsResponse.value.data) ? campaignsResponse.value.data : []);
            } else {
                console.warn("Failed to fetch campaigns or no campaigns data:", campaignsResponse.reason || "No data");
                setActiveCampaigns([]);
            }

            if (usersResponse.status === 'fulfilled' && usersResponse.value.data) {
                setUsers(Array.isArray(usersResponse.value.data) ? usersResponse.value.data : []);
            } else {
                console.warn("Failed to fetch users or no users data:", usersResponse.reason || "No data");
                setUsers([]);
            }

            if (feedResponse.status === 'fulfilled' && feedResponse.value.data) {
                setUserFeed(Array.isArray(feedResponse.value.data) ? feedResponse.value.data : []);
            } else {
                console.warn("Failed to fetch user feed or no feed data:", feedResponse.reason || "No data");
                setUserFeed([]);
            }

        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            setError('Failed to fetch dashboard data. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [loggedInUserId]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === "Closed") return false;
        return new Date(dueDate) < new Date() && new Date(dueDate).setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0);
    };

    const dashboardStats = useMemo(() => {
        const openTasks = myTasks.filter(task => task.status === 'Open' || task.status === 'In Progress');
        const overdueTasksCount = myTasks.filter(task => task.status !== "Closed" && isOverdue(task.due_date, task.status)).length;
        const activeCampaignsCount = activeCampaigns.length;

        const statusCounts = myTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});

        
        const categoryProgressStats = myTasks.reduce((acc, task) => {
            const category = task.category || "Uncategorized"; 
            if (!acc[category]) {
                acc[category] = { completed: 0, notCompleted: 0, total: 0 };
            }
            if (task.status === "Closed") { 
                acc[category].completed += 1;
            } else {
                acc[category].notCompleted += 1;
            }
            acc[category].total += 1;
            return acc;
        }, {});
        return {
            openTasksCount: openTasks.length,
            overdueTasksCount,
            activeCampaignsCount,
            statusCounts,
            recentOpenTasks: openTasks.slice(0, 5), 
            recentActiveCampaigns: activeCampaigns.slice(0,5),
            categoryProgressStats, 
        };
    }, [myTasks, activeCampaigns]);

    const statusChartData = useMemo(() => ({
        labels: Object.keys(dashboardStats.statusCounts),
        datasets: [{
            label: 'Tasks by Status',
            data: Object.values(dashboardStats.statusCounts),
            
            
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
    }), [dashboardStats.statusCounts]);

    

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /><p>Loading dashboard...</p></div>;
    if (error) return <Alert variant="danger" className="mt-3">{error}</Alert>;

    return (
        <div>
            <PageHeader icon={<FaTachometerAlt />} title="Dashboard Overview" />

            
            <Row className="mb-4">
                <Col>
                    <h5>
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {currentUser?.name || 'User'}!
                    </h5>
                    <p className="text-muted">Here's a quick overview of your compliance activities.</p>
                </Col>
            </Row>

            
            <Row className="mb-4">
                <Col xl={3} md={6} className="mb-3">
                    <KeyMetricsCard title="Key Task Metrics" metrics={[
                        { label: "Open/In Progress Tasks", value: dashboardStats.openTasksCount, variant: "secondary" },
                        { label: "Overdue Tasks", value: dashboardStats.overdueTasksCount, variant: "danger" },
                    ]} />
                </Col>
                <Col xl={3} md={6} className="mb-3">
                     <PieChartCard
                        title="Task Status Overview"
                        chartRef={statusChartRef}
                        chartData={statusChartData}
                        
                    />
                </Col>
                <Col xl={3} md={6} className="mb-3">
                    <KeyMetricsCard title="Campaign Snapshot" metrics={[
                        { label: "Active Campaigns", value: dashboardStats.activeCampaignsCount, variant: "success" },
                        
                    ]} />
                </Col>
                <Col xl={3} md={6} className="mb-3"> 
                    <Card className="h-100">
                        <Card.Header as="h6">Task Progress by Category</Card.Header>
                        <Card.Body style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {Object.keys(dashboardStats.categoryProgressStats).length > 0 ? (
                                Object.entries(dashboardStats.categoryProgressStats).map(([category, data]) => {
                                    const percentage = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                                    return (
                                        <div key={category} className="mb-3">
                                            <div className="d-flex justify-content-between small mb-1">
                                                <span>{category}</span>
                                                <span>{data.completed} / {data.total}</span>
                                            </div>
                                            <ProgressBar
                                                now={percentage}
                                                label={`${Math.round(percentage)}%`}
                                                variant={percentage === 100 ? "success" : (percentage > 50 ? "info" : "warning")}
                                            />
                                        </div>
                                    );
                                })
                            ) : <p className="text-muted text-center small mt-3">No tasks with categories found.</p>}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            
            <Row className="mb-4">
                <Col md={6} className="mb-4">
                        <div className="d-flex justify-content-between small mb-1 p-2">
                                                <h6>My Recent Open Tasks</h6>
                                                <span><Link to="/my-tasks">View All My Tasks</Link></span>
                                            </div>

                        {dashboardStats.recentOpenTasks.length > 0 ? (
                            <div>
                                {dashboardStats.recentOpenTasks.map(task => (
                                    <TaskListItem
                                        key={task.id}
                                        task={task}
                                        allUsers={users}
                                        linkTo={`/campaign-task/${task.id}`}
                                        linkState={{ from: '/' }}
                                        isOverdueFn={isOverdue}
                                        showCampaignInfo={true}
                                        showAssigneeInfo={true}
                                        showOwnerInfo={true} 
                                        owners={task.owners} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card.Body><p className="text-muted">No open tasks at the moment.</p></Card.Body>
                        )}
                </Col>
                <Col md={6} className="mb-4">
                    <Card>
                        <Card.Header as="h5"><FaBullhorn className="me-2"/>Active Campaigns</Card.Header>
                        {dashboardStats.recentActiveCampaigns.length > 0 ? (
                        <ListGroup variant="flush">
                            {dashboardStats.recentActiveCampaigns.map(campaign => (
                                <ListGroup.Item key={campaign.id} action as={Link} to={`/campaigns/${campaign.id}`}>
                                    {campaign.name}
                                    <Badge bg={getStatusColor(campaign.status)} className="float-end">{campaign.status}</Badge>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                        ) : (
                             <Card.Body><p className="text-muted">No active campaigns.</p></Card.Body>
                        )}
                        <Card.Footer className="text-center">
                            <Link to="/campaigns">View All Campaigns</Link>
                        </Card.Footer>
                    </Card>

                    <Card className='mt-3'>
                        <Card.Header as="h5"><FaComment className="me-2"/>Recent Activity</Card.Header>
                        {userFeed.length > 0 ? (
                            <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {userFeed.map(item => (
                                    <ListGroup.Item key={item.id} className="py-2 px-3">
                                        <div className="d-flex w-100 justify-content-between">
                                            <small className="text-muted">
                                                <UserDisplay userId={item.userId} userName={item.userName} allUsers={users} />
                                                {item.campaignTaskInstanceId && item.taskTitle && (
                                                    <> on task <Link to={`/campaign-task/${item.campaignTaskInstanceId}`}>{item.taskTitle.substring(0,30)}...</Link></>
                                                )}
                                            </small>
                                            <small className="text-muted">{new Date(item.createdAt).toLocaleString()}</small>
                                        </div>
                                        {/* <p className="mb-0 mt-1 small" style={{whiteSpace: "pre-wrap"}}>{item.text}</p> */}
                                        <div className="mb-0 mt-1  small" dangerouslySetInnerHTML={{ __html: item.text }} />
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        ) : (
                            <Card.Body><p className="text-muted">No recent activity to display.</p></Card.Body>
                        )}
                        
                    </Card>

                </Col>
            </Row>

           
        </div>
    );
}

export default Dashboard;