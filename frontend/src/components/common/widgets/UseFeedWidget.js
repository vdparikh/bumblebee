import React, { useState, useEffect, useCallback } from 'react';
import { Card, ListGroup, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getUserFeed, getUsers } from '../../../services/api';
import { getStatusColor } from '../../../utils/displayUtils';
import { FaComment } from 'react-icons/fa';
import UserDisplay from '../UserDisplay';

const UserFeedWidget = () => {
    const [userFeed, setUserFeed] = useState([]); 
        const [users, setUsers] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUserFeed = useCallback(async () => {
        setLoading(true);
        setError('');
        try {

            const userResponse = await getUsers();
            if (userResponse.data) {
                setUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
            } else {
                setUsers([]);
            }


            const response = await getUserFeed({ limit: 7 }); 
            if (response.data) {
                setUserFeed(Array.isArray(response.data) ? response.data : []);
            } else {
                setUserFeed([]);
            }
        } catch (err) {
            console.error("Error fetching user feed:", err);
            setError('Failed to load user feed. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserFeed();
    }, [fetchUserFeed]);

    if (loading) return <Card><Card.Body><Spinner animation="border" size="sm" /> Loading active campaigns...</Card.Body></Card>;
    if (error) return <Card><Card.Body><p className="text-danger">{error}</p></Card.Body></Card>;

    return (
        <Card className='mt-3 shadow-sm'>
            <Card.Header as="h6" className="bg-light text-dark"><FaComment className="me-2" />Recent Activity</Card.Header>
            {loading ? (
                 <Card.Body className="text-center"><Spinner animation="border" size="sm" /></Card.Body>
            ) : userFeed.length > 0 ? (
                <ListGroup variant="flush">
                    {userFeed.map(item => (
                        <ListGroup.Item key={item.id} className="py-3 px-3">
                            <div className="d-flex w-100 justify-content-between align-items-center mb-1">
                                <div className="d-flex align-items-center">
                                    <UserDisplay userId={item.userId} userName={item.userName} allUsers={users} />
                                    {item.campaignTaskInstanceId && item.taskTitle && (
                                        <small className="text-muted ms-2">
                                            on task <Link to={`/campaign-task/${item.campaignTaskInstanceId}`} className="text-decoration-none">{item.taskTitle.substring(0, 30)}{item.taskTitle.length > 30 ? '...' : ''}</Link>
                                        </small>
                                    )}
                                </div>
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
    );
};

export default UserFeedWidget;