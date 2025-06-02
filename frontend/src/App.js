import './App.css';
import React, { useState, useEffect } from 'react';

import { BrowserRouter as Router, Routes, Route, Link, useLocation, NavLink, Navigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Image from 'react-bootstrap/Image'; // For user avatar
import Col from 'react-bootstrap/Col'; // Keep Col for layout

import Tasks from './components/Tasks'; // Renamed from ComplianceChecks
import Requirements from './components/Requirements';
import Standards from './components/Standards';
import MyTasks from './components/MyTasks';
// import TaskDetail from './components/TaskDetail'; // Not currently used
import { FaUser, FaQuestionCircle, FaRegQuestionCircle } from 'react-icons/fa'; // Icons used in App.js directly
import Campaigns from './components/Campaigns';
import CampaignDetail from './components/CampaignDetail'; // Import CampaignDetail component
import Dashboard from './components/Dashboard'; // Import the new Dashboard component
import { ThemeProvider } from './contexts/ThemeContext'; // Import ThemeProvider
import ThemeSwitcher from './components/common/ThemeSwitcher'; // Import ThemeSwitcher
import CampaignTaskInstanceDetail from './components/CampaignTaskInstanceDetail'; // Assuming you create this
import { Button, OverlayTrigger, Spinner } from 'react-bootstrap';
import HelpSupportPanel from './components/common/HelpSupportPanel'; // Import the new panel
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage'; // Import LoginPage
import ProtectedRoute from './components/auth/ProtectedRoute'; // Import ProtectedRoute
import RegisterPage from './components/auth/RegisterPage'; // Import RegisterPage
import ThreeColumnView from './components/views/ThreeColumnView'; // Import the new view
import UserProfilePage from './components/auth/UserProfilePage'; // Import UserProfilePage
import AdminSettingsPage from './pages/AdminSettingsPage'; // New Admin Page
// import PrivateRoute from './components/auth/PrivateRoute';
import Sidebar from './components/common/Sidebar'; // Import the new Sidebar component
import Documents from './components/Documents'; // Import the new component

function DynamicHeader() {
  const location = useLocation();
  let headerText = "Dashboard"; // Default header

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
      break; // Added missing break
    case "/campaigns":
      headerText = "Campaigns";
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
        // Add more cases for other routes
        // Optional: handle unknown paths or set a generic title
        headerText = "Home";
      }
      if (location.pathname === "/profile") {
        headerText = "User Profile";
      }
  }

  useEffect(() => {
    document.title = `Bumblebee - ${headerText}`;
  }, [headerText]);

  return <Navbar.Brand><span className='text-dark fw-bold'>{headerText}</span></Navbar.Brand>;
}

function Layout() { // Create a new component that can use useLocation
  const location = useLocation();
  const [showDetailsPanel, setShowDetailsPanel] = useState(true); // State for details panel visibility
  const { currentUser, logout } = useAuth();
  return (
    <Container fluid className="p-0"
    > {/* This container was unclosed, fixed it. */}
      <Row className="g-0">

        <Col md={12}>



          {/* <div className='bg-dark text-white p-4 ps-5 pe-5'>
            <h5 className='text-white m-0'>Simplify Governance, Risk Management and Compliance (GRC) for Any Organization</h5>
            Compliance Manager GRC helps you identify which IT security requirements your organization should be following to stay compliant with any government or industry standard, and to reduce the risk of a data breach.
          </div> */}

          <Container fluid>
            <Row>
              {/* Sidebar Column using the new Sidebar component */}
              <Sidebar currentUser={currentUser} location={location} />

              {/* This Col now wraps the main content area and the new right details panel */}
              <Col className="p-0 "> {/* Removed padding to let child columns manage it */}


                <Navbar expand="lg" className=" border-bottom shadow-0 topnav">
                  <Container fluid className=''>
                    <Navbar.Toggle aria-controls="top-navbar-nav" />
                    {/* <Navbar.Brand as={Link} to="/" className="p-0 m-0 d-block text-decoration-none">
                      <Image height={44} src={process.env.PUBLIC_URL + '/logo.webp'} />
                    </Navbar.Brand> */}

                    <DynamicHeader /> {/* Use the new DynamicHeader component */}
                    <Navbar.Collapse id="top-navbar-nav" className="justify-content-end">
                      <Nav>
                        {/* Placeholder for user info and logout */}
                        <NavDropdown
                          title={
                            <>
                              <FaUser className='me-1' />
                              {currentUser?.name || 'User'}
                            </>
                          }
                          id="user-nav-dropdown"
                          align="end">
                          <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                          {/* Add ThemeSwitcher here or nearby */}
                          {currentUser?.role === 'admin' && <NavDropdown.Item as={NavLink} to="/admin-settings">Admin Settings</NavDropdown.Item>}
                          <NavDropdown.Divider />
                          <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
                        </NavDropdown>

                        <ThemeSwitcher />

                        <Button
                          variant=""
                          size="sm"
                          onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                          className="ms-2 d-none d-md-inline-block border-0 p-0 m-0"
                          title={showDetailsPanel ? "Hide Details Panel" : "Show Details Panel"}
                        > {showDetailsPanel ? <FaQuestionCircle size="1.5em" /> : <FaRegQuestionCircle size="1.5em" />} </Button>

                      </Nav>
                    </Navbar.Collapse>
                  </Container>
                </Navbar>

                <Row className="g-0 " style={{ height: 'calc(100vh - 60px)' /* Adjust 80px based on actual top navbar height */ }}>
                  {/* Main Content Area (Middle Column) */}
                  {/* Adjusted column sizes based on details panel visibility */}
                  <Col md={showDetailsPanel ? 8 : 12} xl={showDetailsPanel ? 9 : 12} className="p-0" style={{ height: '100%', overflowY: 'auto', transition: 'width 0.3s ease-in-out' }}>


                    <Container>
                      <main className="p-4"> {/* Padding for the main content */}
                        {/* Routes are now defined in App component */}
                        <Routes>
                          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                          <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Tasks /></ProtectedRoute>} />

                          <Route path="/documents" element={<ProtectedRoute roles={['admin', 'auditor']}><Documents /></ProtectedRoute>} />


                          <Route path="/requirements" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Requirements /></ProtectedRoute>} />
                          <Route path="/standards" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Standards /></ProtectedRoute>} />
                          <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
                          <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                          <Route path="/campaign-task/:instanceId" element={<ProtectedRoute><CampaignTaskInstanceDetail /></ProtectedRoute>} />
                          <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                          <Route path="/admin-settings" element={<ProtectedRoute requiredRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />

                          <Route path="/alt-view" element={<ProtectedRoute><ThreeColumnView /></ProtectedRoute>} />
                          <Route path="/campaigns/:campaignId" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
                        </Routes>
                      </main>
                    </Container>
                  </Col>
                  {/* Right Details Panel (New Right Column) */}
                  <Col
                    xs={12} md={4} xl={3}
                    className={`p-3 border-start details-pane ${showDetailsPanel ? 'd-md-block' : 'd-none'}`}
                    style={{ height: '100%', overflowY: 'auto', transition: 'display 0.3s ease-in-out' }}
                  >
                    <HelpSupportPanel />
                    {/* <h5>Details Panel</h5>
                    <hr />
                    <p>Contextual information related to the current view or selected item will appear here.</p>
                    <Card className="mt-3">
                      <Card.Header>Example Detail</Card.Header>
                      <Card.Body>
                        This is a placeholder for more detailed content.
                        It could show logs, extended properties, or related items.
                      </Card.Body>
                    </Card> */}
                    {/* You can add more placeholder content or make this dynamic later */}
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
    <Router> {/* Router should be the outermost */}
      <ThemeProvider>
        <AuthProvider> {/* AuthProvider wraps components that need auth context */}
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

// New component to handle conditional rendering of Layout or LoginPage
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
      <Route path="/*" element={currentUser ? <Layout /> : <Navigate to="/login" />} /> {/* Layout handles all protected routes */}
    </Routes>
  );
}

export default App;
