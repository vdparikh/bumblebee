import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Image from 'react-bootstrap/Image'; // For user avatar

import Tasks from './components/Tasks'; // Renamed from ComplianceChecks
import Requirements from './components/Requirements';
import Standards from './components/Standards';
import MyTasks from './components/MyTasks';
import TaskDetail from './components/TaskDetail';
import { FaBullhorn, FaCheckDouble, FaList, FaTasks, FaUser } from 'react-icons/fa';
import Campaigns from './components/Campaigns'; // Import Campaigns component
import CampaignDetail from './components/CampaignDetail'; // Import CampaignDetail component
import CampaignTaskInstanceDetail from './components/CampaignTaskInstanceDetail'; // Assuming you create this

function DynamicHeader() {
  const location = useLocation();
  let headerText = "Dashboard"; // Default header

  switch (location.pathname) {
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
        // Add more cases for other routes
        // Optional: handle unknown paths or set a generic title
        headerText = "Home";
      }
  }
  return <Navbar.Brand className="text-dark">/ <span className='text-dark'>{headerText}</span></Navbar.Brand>; // Changed to h2 for better hierarchy with top navbar brand
}

function Layout() { // Create a new component that can use useLocation
  const location = useLocation();
  return (
    <Container fluid className="p-0" 
>
      <Row className="g-0">

        <Col md={12}>
          <Navbar bg="white" expand="lg" className="px-4 border-bottom shadow-sm">
            <Container fluid>
              <Navbar.Toggle aria-controls="top-navbar-nav" />
              <Navbar.Brand as={Link} to="/" className="p-0 d-block text-decoration-none text-dark">
                <Image height={50} src={process.env.PUBLIC_URL + '/logo.webp'} />
              </Navbar.Brand>

              <DynamicHeader /> {/* Use the new DynamicHeader component */}
              <Navbar.Collapse id="top-navbar-nav" className="justify-content-end">
                <Nav>
                  {/* Placeholder for user info and logout */}
                  <NavDropdown
                    title={
                      <>
                        <FaUser className='me-1' />
                        Vishal Parikh {/* Replace with dynamic user name */}
                      </>
                    }
                    id="user-nav-dropdown"
                    align="end">
                    <NavDropdown.Item href="#profile">Profile</NavDropdown.Item>
                    <NavDropdown.Item href="#settings">Settings</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item href="#logout">Logout</NavDropdown.Item>
                  </NavDropdown>
                </Nav>
              </Navbar.Collapse>
            </Container>
          </Navbar>

          {/* <div className='bg-dark text-white p-4 ps-5 pe-5'>
            <h5 className='text-white m-0'>Simplify Governance, Risk Management and Compliance (GRC) for Any Organization</h5>
            Compliance Manager GRC helps you identify which IT security requirements your organization should be following to stay compliant with any government or industry standard, and to reduce the risk of a data breach.
          </div> */}

          <Container>
            <Row>
              <Col md={2} className="p-3">
                <Nav variant='pills' activeKey={location.pathname} className="flex-column">

                  <Nav.Item className='mt-3 mb-2'><b>Users</b></Nav.Item>

                  <Nav.Link as={Link} to="/my-tasks" eventKey="/my-tasks" className="text-dark">
                    <FaUser /> My Tasks</Nav.Link>

                  <Nav.Item className='mt-3 mb-2'><b>Auditors</b></Nav.Item>
                  <Nav.Link
                    as={Link}
                    to="/campaigns"
                    eventKey="/campaigns" // Keeps it consistent for potential onSelect handlers
                    className="text-dark"
                    active={location.pathname.startsWith('/campaigns')}
                  >
                    <FaBullhorn className="me-2" /> Campaigns
                  </Nav.Link>

                  <Nav.Item className='mt-3 mb-2'><b>Administrators</b></Nav.Item>
                  <Nav.Link as={Link} to="/tasks" eventKey="/tasks" className="text-dark">
                    <FaTasks /> Tasks</Nav.Link>
                  <Nav.Link as={Link} to="/requirements" eventKey="/requirements" className="text-dark">
                    <FaList /> Requirements</Nav.Link>
                  <Nav.Link as={Link} to="/standards" eventKey="/standards" className="text-dark">
                    <FaCheckDouble /> Standards</Nav.Link>

                </Nav>
              </Col>
              <Col md={10}>



                <main className="p-4 mt-3" style={{ minHeight: 'calc(100vh - 106px)' /* Adjust 56px based on navbar height */ }}>
                  <div className="bg-white p-4 rounded shadow-sm"> {/* Optional: Wrap content in a white card-like div */}



                    <Routes>
                      <Route path="/" element={<MyTasks />} /> {/* Default route */}
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/requirements" element={<Requirements />} />
                      <Route path="/standards" element={<Standards />} />
                      <Route path="/my-tasks" element={<MyTasks />} />
                      {/* <Route path="/task/:taskId" element={<TaskDetail />} /> */}
                      <Route path="/campaigns" element={<Campaigns />} />
                      <Route path="/campaign-task/:instanceId" element={<CampaignTaskInstanceDetail />} /> {/* New Route */}
                      <Route path="/campaigns/:campaignId" element={<CampaignDetail />} />

                      {/* Define other routes here */}
                    </Routes>
                  </div>
                </main>
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
      <Layout /> {/* Render the Layout component which can now use useLocation */}
    </Router>
  );
}

export default App;
