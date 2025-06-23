import './App.css';
import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap'; // Import Badge
import { HashRouter as Router, Routes, Route, Link, useLocation, NavLink, Navigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col'; 

import Tasks from './components/Tasks'; 
import Requirements from './components/Requirements';
import Standards from './components/Standards';
import MyTasks from './components/MyTasks';
import Campaigns from './components/Campaigns';
import CampaignDetail from './components/CampaignDetail'; 
import Dashboard from './components/Dashboard'; 
import { ThemeProvider } from './contexts/ThemeContext'; 
import ThemeSwitcher from './components/common/ThemeSwitcher'; 
import CampaignTaskInstanceDetail from './components/CampaignTaskInstanceDetail'; 
import { Button, Spinner } from 'react-bootstrap';
import HelpSupportPanel from './components/common/HelpSupportPanel'; 
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage'; 
import ProtectedRoute from './components/auth/ProtectedRoute'; 
import RegisterPage from './components/auth/RegisterPage'; 
import ThreeColumnView from './components/views/ThreeColumnView'; 
import UserProfilePage from './components/auth/UserProfilePage'; 
import AdminSettingsPage from './pages/AdminSettingsPage'; 

import AuditorDashboard from './pages/AuditorDashboard'; // Import AuditorDashboard
import LibraryManagementPage from './pages/LibraryManagementPage'; // Import the new page
import PendingReviewPage from './pages/PendingReviewPage'; // Import PendingReviewPage
import Sidebar from './components/common/Sidebar'; 
import Documents from './components/Documents'; 
import TeamsPage from './components/TeamsPage'; 
import AuditLogsPage from './pages/AuditLogsPage'; // You will create this file
import HelpPage from './pages/HelpPage';
import SystemIntegrations from './components/admin/SystemIntegrations';
import SystemIntegrationForm from './components/admin/SystemIntegrationForm';

function DynamicHeader() {
  const location = useLocation();
  const { currentUser } = useAuth(); // Access currentUser for simulation status
  let headerText = "Dashboard"; 

  switch (location.pathname) {
    case "/":
      headerText = "Dashboard";
      break;
    case "/tasks":
      headerText = "Manage Tasks";
      break;
    case "/requirements":
      headerText = "Manage Requirements";
      break;
    case "/standards":
      headerText = "Manage Standards";
      break;
    case "/my-tasks":
      headerText = "My Tasks";
      break; 
    case "/campaigns":
      headerText = "Campaigns";
      break;
    case "/teams":
      headerText = "Manage Teams";
      break;
    case "/library": // Add case for the new library page
      headerText = "Compliance Library";
      break;
    case "/pending-review": // Add case for Pending Review page
      headerText = "Pending Review";
      break;
    default:
      if (location.pathname.startsWith("/task/")) {
        headerText = "Task Details";
      } else if (location.pathname.startsWith("/campaigns/")) {
        headerText = "Campaign Details";
      } else {
        if (location.pathname.startsWith("/alt-view")) {
          headerText = "Alternate View";
        }
        
        
        headerText = "Home";
      }
      if (location.pathname === "/profile") {
        headerText = "User Profile";
      }
  }

  useEffect(() => {
    document.title = `Bumblebee - ${headerText}`;
  }, [headerText]);

  return (
    <Navbar.Brand>
      <span className='text-dark fw-bold'>{headerText}</span>
      {currentUser && currentUser.isSimulating && (
        <Badge pill bg="warning" text="dark" className="ms-2 align-middle" title={`Simulating ${currentUser.role} role. Actual role: ${currentUser.actualRole}`}>Simulating Role</Badge>
      )}
    </Navbar.Brand>
  );
}

function Layout() { 
  const location = useLocation();
  const [showDetailsPanel, setShowDetailsPanel] = useState(true); 
  const { currentUser, logout } = useAuth();
  return (
    <Container fluid className="p-0"
    > 
      <Row className="g-0">
        <Col md={12}>
          <Container fluid>
            <Row>
              <Sidebar 
                currentUser={currentUser} 
                location={location} 
                logout={logout}
                showDetailsPanel={showDetailsPanel}
                setShowDetailsPanel={setShowDetailsPanel}
              />
              <Col className="p-0 "> 
                <Navbar expand="lg" className="d-none border-bottom shadow-0 topnav">
                  <Container fluid className=''>
                    <Navbar.Toggle aria-controls="top-navbar-nav" />
                    <DynamicHeader /> 
                  </Container>
                </Navbar>

                <Row className="g-0 " style={{ height: 'calc(100vh)'  }}>
                  <Col md={showDetailsPanel ? 8 : 12} xl={showDetailsPanel ? 9 : 12} className="p-0" style={{ height: '100%', overflowY: 'auto', transition: 'width 0.3s ease-in-out' }}>
                    <Container>
                      <main className="p-4"> 
                        <Routes>
                          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                          <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Tasks /></ProtectedRoute>} />
                          <Route path="/pending-review" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><PendingReviewPage /></ProtectedRoute>} />
                          <Route path="/auditor-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><AuditorDashboard /></ProtectedRoute>} /> 
                          <Route path="/library" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><LibraryManagementPage /></ProtectedRoute>} />
                          <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
                          <Route path="/documents" element={<ProtectedRoute roles={['admin', 'auditor']}><Documents /></ProtectedRoute>} />
                          <Route path="/requirements" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Requirements /></ProtectedRoute>} />
                          <Route path="/standards" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Standards /></ProtectedRoute>} />
                          <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
                          <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                          <Route path="/campaign-task/:instanceId" element={<ProtectedRoute><CampaignTaskInstanceDetail /></ProtectedRoute>} />
                          <Route path="/teams" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TeamsPage /></ProtectedRoute>} />
                          <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                          <Route path="/admin-settings" element={<ProtectedRoute requiredRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />
                          <Route path="/audit-logs" element={<ProtectedRoute roles={['admin', 'auditor']}><AuditLogsPage /></ProtectedRoute>} />
                          <Route path="/alt-view" element={<ProtectedRoute><ThreeColumnView /></ProtectedRoute>} />
                          <Route path="/campaigns/:campaignId" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
                          <Route path="/admin/system-integrations" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrations /></ProtectedRoute>} />
                          <Route path="/admin/system-integrations/new" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
                          <Route path="/admin/system-integrations/edit/:id" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
                        </Routes>
                      </main>
                    </Container>
                  </Col>
                  <Col
                    xs={12} md={4} xl={3}
                    className={`p-3 border-start details-pane ${showDetailsPanel ? 'd-md-block' : 'd-none'}`}
                    style={{ height: '100%', overflowY: 'auto', transition: 'display 0.3s ease-in-out' }}
                  >
                    <HelpSupportPanel />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Container>
        </Col>
      </Row>
    </Container>
  );
}

function App() {
  return (
    <Router> 
      <ThemeProvider>
        <AuthProvider> 
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}


function AppRoutes() {
  const { currentUser, loadingAuth } = useAuth();

  console.log(currentUser, loadingAuth)

  if (loadingAuth) {
    return <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}><Spinner animation="border" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="library" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><LibraryManagementPage /></ProtectedRoute>} />
        <Route path="documents" element={<ProtectedRoute roles={['admin', 'auditor']}><Documents /></ProtectedRoute>} />
        <Route path="auditor-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><AuditorDashboard /></ProtectedRoute>} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="admin-settings" element={<ProtectedRoute requiredRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute roles={['admin', 'auditor']}><AuditLogsPage /></ProtectedRoute>} />
        <Route path="alt-view" element={<ThreeColumnView />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetail />} />
        <Route path="tasks" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Tasks /></ProtectedRoute>} />
        <Route path="pending-review" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><PendingReviewPage /></ProtectedRoute>} />
        <Route path="requirements" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Requirements /></ProtectedRoute>} />
        <Route path="standards" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Standards /></ProtectedRoute>} />
        <Route path="teams" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TeamsPage /></ProtectedRoute>} />
        <Route path="campaign-task/:instanceId" element={<ProtectedRoute><CampaignTaskInstanceDetail /></ProtectedRoute>} />
        <Route path="admin/system-integrations" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrations /></ProtectedRoute>} />
        <Route path="admin/system-integrations/new" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
        <Route path="admin/system-integrations/edit/:id" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
