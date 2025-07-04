import './App.css';
import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap'; // Import Badge
import { HashRouter as Router, Routes, Route, Link, useLocation, NavLink, Navigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Tasks from './components/Tasks';
import Requirements from './pages/RequirementsPage';
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
import ModernComplianceView from './components/views/ModernComplianceView';
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
import TaskWizardPage from './pages/TaskWizardPage';
import RightSidePanel from './components/common/RightSidePanel';
import StandardsPage from './pages/StandardsPage';
import TaskLibraryPage from './pages/TaskLibraryPage';
import RisksPage from './pages/RisksPage';
import DashboardPage from './pages/DashboardPage';
import UserManagement
 from './components/admin/UserManagement';
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

const RightPanelContext = React.createContext();

function Layout() {
  const location = useLocation();
  const [rightPanel, setRightPanel] = useState({ type: null, props: {} });
  const { currentUser, logout } = useAuth();

  const openRightPanel = (type, props = {}) => setRightPanel({ type, props });
  const closeRightPanel = () => setRightPanel({ type: null, props: {} });

  // Close right panel on route change
  useEffect(() => {
    closeRightPanel();
    // eslint-disable-next-line
  }, [location.pathname]);

  // For backward compatibility, showDetailsPanel toggles help
  const showDetailsPanel = rightPanel.type === 'help';
  const setShowDetailsPanel = (show) => {
    if (show) openRightPanel('help');
    else closeRightPanel();
  };

  return (
    <RightPanelContext.Provider value={{ openRightPanel, closeRightPanel, rightPanel }}>
      <div fluid className="p-0">
        <div>
          <div>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar
                currentUser={currentUser}
                location={location}
                logout={logout}
                showDetailsPanel={showDetailsPanel}
                setShowDetailsPanel={setShowDetailsPanel}
              />
              <Container fluid>
                <Row>
                  <Col className="p-0 ">
                    <Navbar expand="lg" className="d-none border-bottom shadow-0 topnav">
                      <Container fluid className=''>
                        <Navbar.Toggle aria-controls="top-navbar-nav" />
                        <DynamicHeader />
                      </Container>
                    </Navbar>
                    <Row className="g-0 " style={{ height: 'calc(100vh)' }}>
                      <Col className="p-0" style={{ height: '100%', overflowY: 'auto', transition: 'width 0.3s ease-in-out' }}>
                        <div className="content">
                          <Container fluid>
                            <main className="p-4">
                              <Routes>
                                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                                <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TaskLibraryPage /></ProtectedRoute>} />
                                <Route path="/pending-review" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><PendingReviewPage /></ProtectedRoute>} />
                                <Route path="/auditor-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><AuditorDashboard /></ProtectedRoute>} />
                                <Route path="/library" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><LibraryManagementPage /></ProtectedRoute>} />
                                <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
                                <Route path="/documents" element={<ProtectedRoute roles={['admin', 'auditor']}><Documents /></ProtectedRoute>} />
                                <Route path="/requirements" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Requirements /></ProtectedRoute>} />
                                <Route path="/standards" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><StandardsPage /></ProtectedRoute>} />
                                <Route path="/risks" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><RisksPage /></ProtectedRoute>} />
                                <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
                                <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                                <Route path="/campaign-task/:instanceId" element={<ProtectedRoute><CampaignTaskInstanceDetail /></ProtectedRoute>} />
                                <Route path="/teams" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TeamsPage /></ProtectedRoute>} />
                                <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><UserManagement /></ProtectedRoute>} />
                                <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                                <Route path="/admin-settings" element={<ProtectedRoute requiredRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />
                                <Route path="/audit-logs" element={<ProtectedRoute roles={['admin', 'auditor']}><AuditLogsPage /></ProtectedRoute>} />
                                <Route path="/alt-view" element={<ProtectedRoute><ModernComplianceView /></ProtectedRoute>} />
                                <Route path="/campaigns/:campaignId" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
                                <Route path="/admin/system-integrations" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrations /></ProtectedRoute>} />
                                <Route path="/admin/system-integrations/new" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
                                <Route path="/admin/system-integrations/edit/:id" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
                                <Route path="/tasks/new" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TaskWizardPage /></ProtectedRoute>} />
                                <Route path="/tasks/:id/edit" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TaskWizardPage /></ProtectedRoute>} />
                              </Routes>
                            </main>
                          </Container>
                        </div>
                      </Col>
                      {rightPanel.type && (
                        <Col xs={12} md={4} xl={3}
                          className={`details-pane d-md-block`}
                          style={{ height: '100%', overflowY: 'auto', transition: 'display 0.3s ease-in-out' }}
                        >
                          <RightSidePanel
                            show={!!rightPanel.type}
                            onClose={closeRightPanel}
                            title={rightPanel.type === 'help' ? 'Help & Support' : rightPanel.props.title || 'Panel'}
                            width={400}
                          >
                            {rightPanel.type === 'help' && <HelpSupportPanel />}
                            {/* Add more panel types here */}
                            {rightPanel.type !== 'help' && rightPanel.props.content}
                          </RightSidePanel>
                        </Col>
                      )}
                    </Row>
                  </Col>
                </Row>
              </Container>
            </div>
          </div>
        </div>
      </div>
    </RightPanelContext.Provider>
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
        <Route index element={<DashboardPage />} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="library" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><LibraryManagementPage /></ProtectedRoute>} />
        <Route path="documents" element={<ProtectedRoute roles={['admin', 'auditor']}><Documents /></ProtectedRoute>} />
        <Route path="auditor-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><AuditorDashboard /></ProtectedRoute>} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="admin-settings" element={<ProtectedRoute requiredRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute roles={['admin', 'auditor']}><AuditLogsPage /></ProtectedRoute>} />
        <Route path="alt-view" element={<ModernComplianceView />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetail />} />
        <Route path="tasks" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TaskLibraryPage /></ProtectedRoute>} />
        <Route path="pending-review" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><PendingReviewPage /></ProtectedRoute>} />
        <Route path="requirements" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Requirements /></ProtectedRoute>} />
        <Route path="standards" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><StandardsPage /></ProtectedRoute>} />
        <Route path="risks" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><RisksPage /></ProtectedRoute>} />
        <Route path="teams" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TeamsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><UserManagement /></ProtectedRoute>} />
        <Route path="campaign-task/:instanceId" element={<ProtectedRoute><CampaignTaskInstanceDetail /></ProtectedRoute>} />
        <Route path="admin/system-integrations" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrations /></ProtectedRoute>} />
        <Route path="admin/system-integrations/new" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
        <Route path="admin/system-integrations/edit/:id" element={<ProtectedRoute allowedRoles={['admin']}><SystemIntegrationForm /></ProtectedRoute>} />
        <Route path="tasks/new" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TaskWizardPage /></ProtectedRoute>} />
        <Route path="tasks/:id/edit" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><TaskWizardPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default App;

export { RightPanelContext };
