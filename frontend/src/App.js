import './App.css';
import React, { useState, useEffect } from 'react';

import { BrowserRouter as Router, Routes, Route, Link, useLocation, NavLink, Navigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Image from 'react-bootstrap/Image'; 
import Col from 'react-bootstrap/Col'; 

import Tasks from './components/Tasks'; 
import Requirements from './components/Requirements';
import Standards from './components/Standards';
import MyTasks from './components/MyTasks';

import { FaUser, FaQuestionCircle, FaRegQuestionCircle } from 'react-icons/fa'; 
import Campaigns from './components/Campaigns';
import CampaignDetail from './components/CampaignDetail'; 
import Dashboard from './components/Dashboard'; 
import { ThemeProvider } from './contexts/ThemeContext'; 
import ThemeSwitcher from './components/common/ThemeSwitcher'; 
import CampaignTaskInstanceDetail from './components/CampaignTaskInstanceDetail'; 
import { Button, OverlayTrigger, Spinner } from 'react-bootstrap';
import HelpSupportPanel from './components/common/HelpSupportPanel'; 
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage'; 
import ProtectedRoute from './components/auth/ProtectedRoute'; 
import RegisterPage from './components/auth/RegisterPage'; 
import ThreeColumnView from './components/views/ThreeColumnView'; 
import UserProfilePage from './components/auth/UserProfilePage'; 
import AdminSettingsPage from './pages/AdminSettingsPage'; 

import Sidebar from './components/common/Sidebar'; 
import Documents from './components/Documents'; 

function DynamicHeader() {
  const location = useLocation();
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

  return <Navbar.Brand><span className='text-dark fw-bold'>{headerText}</span></Navbar.Brand>;
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
              
              <Sidebar currentUser={currentUser} location={location} />

              
              <Col className="p-0 "> 


                <Navbar expand="lg" className=" border-bottom shadow-0 topnav">
                  <Container fluid className=''>
                    <Navbar.Toggle aria-controls="top-navbar-nav" />
                    

                    <DynamicHeader /> 
                    <Navbar.Collapse id="top-navbar-nav" className="justify-content-end">
                      <Nav>
                        
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

                <Row className="g-0 " style={{ height: 'calc(100vh - 60px)'  }}>
                  
                  
                  <Col md={showDetailsPanel ? 8 : 12} xl={showDetailsPanel ? 9 : 12} className="p-0" style={{ height: '100%', overflowY: 'auto', transition: 'width 0.3s ease-in-out' }}>


                    <Container>
                      <main className="p-4"> 
                        
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
      <Route path="/*" element={currentUser ? <Layout /> : <Navigate to="/login" />} /> 
    </Routes>
  );
}

export default App;
