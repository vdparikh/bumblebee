import React, { useState, useEffect, useCallback } from 'react';
import { Card, ListGroup, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../../services/api';
import { getStatusColor } from '../../utils/displayUtils';

const ActiveCampaignsWidget = () => {
    const [activeCampaigns, setActiveCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchActiveCampaigns = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getCampaigns("Active");
            if (response.data) {
                setActiveCampaigns(Array.isArray(response.data) ? response.data : []);
            } else {
                setActiveCampaigns([]);
            }
        } catch (err) {
            console.error("Error fetching active campaigns:", err);
            setError('Failed to load active campaigns. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActiveCampaigns();
    }, [fetchActiveCampaigns]);

    if (loading) return <Card><Card.Body><Spinner animation="border" size="sm" /> Loading active campaigns...</Card.Body></Card>;
    if (error) return <Card><Card.Body><p className="text-danger">{error}</p></Card.Body></Card>;

    return (
        <Card>
            <Card.Header as="p">

                <div className="d-flex justify-content-between align-items-center  mb-1 p-2">
                    <h6 className="mb-0">Active Campaigns ({activeCampaigns.length})</h6>
                    <Link to="/campaigns" className="small">View All Campaigns</Link>
                </div>

            </Card.Header>
            {activeCampaigns.length > 0 ? (
                <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {activeCampaigns.map(campaign => (
                        <ListGroup.Item key={campaign.id} action as={Link} to={`/campaigns/${campaign.id}`}>
                            <div className="d-flex justify-content-between">
                                <strong>{campaign.name}</strong>
                                <Badge bg={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                            </div>
                            {campaign.task_summary && campaign.task_summary.total_tasks > 0 && (
                                <ProgressBar
                                    now={((campaign.task_summary.closed || 0) / campaign.task_summary.total_tasks) * 100}
                                    label={`${Math.round(((campaign.task_summary.closed || 0) / campaign.task_summary.total_tasks) * 100)}%`}
                                    variant="success"
                                    style={{ height: '10px' }}
                                    className="mt-1"
                                />
                            )}
                            <small className="text-muted d-block mt-1">
                                Standard: {campaign.standard_name || 'N/A'}
                            </small>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            ) : (
                <Card.Body><p className="text-muted">No active campaigns.</p></Card.Body>
            )}
        </Card>
    );
};

export default ActiveCampaignsWidget;