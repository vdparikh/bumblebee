import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { FaTachometerAlt, FaChartLine, FaUsers, FaTasks, FaExclamationTriangle, FaUserShield, FaBookOpen } from 'react-icons/fa';
import PageHeader from '../../components/ui/PageHeader';
import { getComplianceStandards, getRequirements, getTasks, getRisks } from '../../services/api';
import KeyMetricsCard from '../../components/ui/KeyMetricsCard';
import { getTaskCategoryIcon } from '../../utils/displayUtils';
import { getSystemTypeIcon } from '../../utils/iconMap';
import ActiveCampaignsWidget from '../../components/ui/ActiveCampaignsWidget';
import UserFeedWidget from '../../components/ui/UseFeedWidget';
import EvidenceLibrary from '../../components/ui/EvidenceLibrary';
import PendingReviewPage from '../admin/PendingReviewPage';

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
                        <Col md={8}>
                            {/* <Row className="mb-4">
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
 */}

                                    <div className=''>
                                        <PendingReviewPage />
                                    </div>
                            
                        </Col>
                         <Col md={4}>

                                    <ActiveCampaignsWidget />

                            <UserFeedWidget />
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