import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Tabs, Tab, ListGroup, Badge, ProgressBar } from 'react-bootstrap';
import { FaUserShield, FaTasks, FaHourglassHalf, FaBookOpen } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import PendingReviewPage from './PendingReviewPage'; // Reuse the existing page
import KeyMetricsCard from '../components/common/KeyMetricsCard';
import { getCampaigns } from '../services/api'; // Import getCampaigns
import { getStatusColor } from '../utils/displayUtils'; // For campaign status badge
import AuditLogsPage from './AuditLogsPage';
import ActiveCampaignsWidget from '../components/common/widgets/ActiveCampaignsWidget'; // Import the new widget
import UserFeedWidget from '../components/common/widgets/UseFeedWidget';

// Placeholder for EvidenceLibrary component
const EvidenceLibrary = () => {
    return (
        <Card>
            <Card.Header as="h5">Evidence Library</Card.Header>
            <Card.Body>
                <Alert variant="info">The Evidence Library feature is under development. This section will allow auditors to browse and search all submitted evidence.</Alert>
                {/* Future: Add search, filters, and list of evidence items */}
            </Card.Body>
        </Card>
    );
};


function AuditorDashboard() {
    const [loading, setLoading] = useState(true);
    // const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [error, setError] = useState('');
    const [dashboardStats, setDashboardStats] = useState({
        tasksPendingReview: 0,
        campaignsNeedingAttention: 0,
        recentlyApprovedEvidence: 0,
        // Add more relevant stats for auditors
    });
    // const [activeCampaigns, setActiveCampaigns] = useState([]);

    const fetchAuditorData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Placeholder: Replace with actual API call to get auditor-specific stats
            // const statsResponse = await getAuditorDashboardStats();
            // const campaignsResponse = await getCampaigns("Active");
            // setDashboardStats(statsResponse.data);

            // Simulate fetching data
            // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
            setDashboardStats({
                tasksPendingReview: 15, // Example data
                campaignsNeedingAttention: 3, // Example data
                recentlyApprovedEvidence: 25, // Example data
            });
            
            // // setLoadingCampaigns(true);
            // const campaignsResponse = await getCampaigns("Active");
            // if (campaignsResponse.data) {
            //     setActiveCampaigns(Array.isArray(campaignsResponse.data) ? campaignsResponse.data : []);
            // } else {
            //     setActiveCampaigns([]);
            // }

        } catch (err) {
            console.error("Error fetching auditor dashboard data:", err);
            setError('Failed to load auditor dashboard data. ' + (err.response?.data?.error || err.message));
        } finally {
            // setLoadingCampaigns(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAuditorData();
    }, [fetchAuditorData]);

    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" />
                <p>Loading Auditor Dashboard...</p>
            </Container>
        );
    }

    if (error) {
        return <Container><Alert variant="danger" className="mt-3">{error}</Alert></Container>;
    }

    return (
        <div>
            <PageHeader
                icon={<FaUserShield />}
                title="Auditor Dashboard"
                subtitle="Overview of compliance review activities and evidence management."
            />


            <Tabs defaultActiveKey="overview" id="auditor-dashboard-tabs" className="mb-3 nav-line-tabs">
                <Tab eventKey="overview" title={<><FaTasks className="me-1" />Overview</>}>
                    <Row>
                        <Col md={4}>
                            <Row className="mb-4">
                                <Col md={6} className="mb-3">
                                    <KeyMetricsCard title="Pending Reviews" metrics={[
                                        { label: "Tasks Awaiting Review", value: dashboardStats.tasksPendingReview, variant: "warning" },
                                    ]} />
                                </Col>
                                <Col md={6} className="mb-3">
                                    <KeyMetricsCard title="Campaigns" metrics={[
                                        { label: "Active Campaigns", value: dashboardStats.campaignsNeedingAttention, variant: "info" },
                                    ]} />
                                </Col>
                                <Col>
                                <Alert variant="info">Auditor-specific charts and summaries will be displayed here.</Alert>
                                </Col>
                            </Row>

                                    <ActiveCampaignsWidget />

                            <UserFeedWidget />
                        </Col>
                    
                        <Col md={8}>

                                    <div className=''>
                                        <PendingReviewPage />
                                    </div>
                            {/* <Card>
                                <Card.Header as="h6">Active Campaigns ({activeCampaigns.length})</Card.Header>
                                {loading ? <Card.Body><Spinner animation="border" size="sm" /> Loading campaigns...</Card.Body> :
                                    activeCampaigns.length > 0 ? (
                                        <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {activeCampaigns.map(campaign => (
                                                <ListGroup.Item key={campaign.id} action as={Link} to={`/campaigns/${campaign.id}`}>
                                                    <div className="d-flex justify-content-between">
                                                        <span>{campaign.name}</span>
                                                        <Badge bg={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                                                    </div>
                                                    {campaign.task_summary && campaign.task_summary.total_tasks > 0 && (
                                                        <ProgressBar 
                                                            now={((campaign.task_summary.closed || 0) / campaign.task_summary.total_tasks) * 100} 
                                                            label={`${Math.round(((campaign.task_summary.closed || 0) / campaign.task_summary.total_tasks) * 100)}%`} 
                                                            variant="success" 
                                                            style={{height: '10px'}} 
                                                            className="mt-1"
                                                        />
                                                    )}
                                                    <small className="text-muted d-block">
                                                        Standard: {campaign.standard_name || 'N/A'}
                                                    </small>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : (
                                        <Card.Body><p className="text-muted">No active campaigns.</p></Card.Body>
                                    )}
                            </Card> */}
                        </Col>
                        <Col>
                        </Col>

                        <Col md={12} className='mt-2'>
                        
                                            
</Col>
                    </Row>
                    
                </Tab>
                {/* <Tab eventKey="pendingReview" title={<><FaHourglassHalf className="me-1" />Pending Review Queue</>}>
                    <PendingReviewPage />
                </Tab> */}
                <Tab eventKey="evidenceLibrary" title={<><FaBookOpen className="me-1" />Evidence Library</>}>
                    <EvidenceLibrary />
                </Tab>
            </Tabs>
        </div>
    );
}

export default AuditorDashboard;