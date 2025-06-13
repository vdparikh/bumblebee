import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Button from 'react-bootstrap/Button';
import { FaHourglassHalf,
    FaTachometerAlt, FaUser, FaBullhorn, FaColumns, FaUsers,
    FaTasks, FaFileContract, FaShieldAlt, FaBookOpen, FaLayerGroup,
    FaQuestionCircle, FaRegQuestionCircle,
    FaCog,
    FaHistory,
    FaPlug
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
import ThemeSwitcher from './ThemeSwitcher';

function Sidebar({ /*currentUser,*/ logout, showDetailsPanel, setShowDetailsPanel }) { // currentUser prop can be removed if always using useAuth
    const { currentUser, startRoleSimulation, stopRoleSimulation } = useAuth(); // Get functions and currentUser from context
    const location = useLocation();    
    const userActionsHeight = '150px'; // Approximate height for user actions section

    const navItems = [
        { to: "/", eventKey: "/", icon: <FaTachometerAlt size="1.2em" />, label: "Dashboard", roles: ['admin', 'auditor', 'user'] },
        { to: "/my-tasks", eventKey: "/my-tasks", icon: <FaTasks size="1.2em" />, label: "My Tasks", roles: ['admin', 'auditor', 'user'] },
        { to: "/campaigns", eventKey: "/campaigns", icon: <FaBullhorn size="1.2em" />, label: "Campaigns", roles: ['admin', 'auditor', 'user'], activeCheck: () => location.pathname.startsWith('/campaigns') },
        { to: "/alt-view", eventKey: "/alt-view", icon: <FaColumns size="1.2em" />, label: "Alternate View", roles: ['user'] },
        (currentUser?.role === 'admin' || currentUser?.role === 'auditor') && { type: 'divider', label: 'Management', key: 'nav-div-management'},
        { to: "/pending-review", eventKey: "/pending-review", icon: <FaHourglassHalf size="1.2em" />, label: "Pending Review", roles: ['admin', 'auditor'], activeCheck: () => location.pathname.startsWith('/pending-review') },
        { to: "/documents", eventKey: "/documents", icon: <FaBookOpen size="1.2em" />, label: "Documents", roles: ['admin', 'auditor'], activeCheck: () => location.pathname.startsWith('/documents') },
        { to: "/library", eventKey: "/library", icon: <FaLayerGroup size="1.2em" />, label: "Manage Library", roles: ['admin', 'auditor'], activeCheck: () => location.pathname.startsWith('/library') },
        { to: "/admin/system-integrations", eventKey: "/admin/system-integrations", icon: <FaPlug size="1.2em" />, label: "System Integrations", roles: ['admin'], activeCheck: () => location.pathname.startsWith('/admin/system-integrations') },
        { to: "/teams", eventKey: "/teams", icon: <FaUsers size="1.2em" />, label: "Teams", roles: ['admin', 'auditor'], activeCheck: () => location.pathname.startsWith('/teams') },
        { to: "/audit-logs", eventKey: "/audit-logs", icon: <FaHistory size="1.2em" />, label: "Audit Logs", roles: ['admin', 'auditor'], activeCheck: () => location.pathname.startsWith('/audit-logs') },

        // { to: "/teams", eventKey: "/teams", icon: <FaUsers size="1.2em" />, label: "Manage Teams", roles: ['admin', 'auditor'] }, // Can be moved to AdminSettings or kept separate
    ];

    // This check now uses currentUser from useAuth, which includes actualRole
    const canSimulate = currentUser && (currentUser.actualRole === 'admin' || currentUser.actualRole === 'auditor');

    return (
        <Col className="p-0 sidebar d-flex flex-column" style={{ maxWidth: "60px" }}>
            {/* Top Logo */}
            <Navbar.Brand as={Link} to="/" className="text-center mt-3 mb-3">
                <Image height={44} src={process.env.PUBLIC_URL + '/logo.webp'} alt="Bumblebee Logo" />
            </Navbar.Brand>

            {/* Scrollable Navigation Links */}
            <Nav variant='pills' activeKey={location.pathname} className="flex-column w-100 flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: `calc(100vh - ${userActionsHeight})` }}>
                <div className="mt-1">

                    {/* <div className='' > */}
                        <NavDropdown
                            title={
                                <OverlayTrigger placement="right" delay={{ show: 250, hide: 100 }} overlay={<Tooltip id="tooltip-user-actions">{currentUser?.name || 'User Menu'}</Tooltip>}>
                                    <div style={{  height: "50px"}} className="d-flex justify-content-center align-items-center  border-0">
                                        <FaUser className='text-white' size="1.2em" />
                                    </div>
                                </OverlayTrigger>
                            }
                            id="sidebar-user-actions-dropdown"
                            drop="end"
                            align={{ lg: 'start' }}
                            className="sidebar-user-dropdown" // Added a class for potential specific styling
                            popperConfig={{ strategy: 'fixed' }}
                        >
                            <NavDropdown.Header className="text-center small text-muted">{currentUser?.name || 'User'}</NavDropdown.Header>
                            <NavDropdown.Item as={Link} to="/profile">Profile ({currentUser?.role})</NavDropdown.Item>
                            {/* Role Simulation Options */}
                            {canSimulate && (
                                <>
                                    <NavDropdown.Divider />
                                    <NavDropdown.Header className="small text-muted">Role Simulation</NavDropdown.Header>
                                    {currentUser.isSimulating && currentUser.role === 'user' ? (
                                        <NavDropdown.Item onClick={() => { stopRoleSimulation(); window.location.reload(); }}>
                                            Stop Simulating (Back to {currentUser.actualRole})
                                        </NavDropdown.Item>
                                    ) : (
                                        <NavDropdown.Item onClick={() => { startRoleSimulation('user'); window.location.reload();}} disabled={currentUser.role === 'user' && !currentUser.isSimulating}>
                                            Simulate User Role
                                        </NavDropdown.Item>
                                    )}
                                    {/* Add more roles to simulate if needed, e.g., Simulate Auditor */}
                                </>
                            )}
                            <NavDropdown.Divider className='' />
                            <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
                        </NavDropdown>
                    {/* </div> */}
                    {navItems
                        .filter(Boolean)
                        .map((item, index) => {
                            if (item.type === 'divider') {
                                return (
                                    <Nav.Item key={item.key || `divider-${index}`} className='text-center mt-3 mb-1'>
                                        <hr className="border border-dark  w-75 mx-auto" />
                                    </Nav.Item>
                                );
                            }
                            if (item.roles && !item.roles.includes(currentUser?.role)) {
                                return null;
                            }
                            return (
                                <OverlayTrigger
                                    key={item.eventKey}
                                    placement="right"
                                    delay={{ show: 250, hide: 100 }}
                                    overlay={
                                        <Tooltip id={`tooltip-${item.eventKey.replace(/\//g, '')}`}>
                                            {item.label}
                                        </Tooltip>
                                    }
                                >
                                    <Button
                                        as={NavLink}
                                        to={item.to}
                                        size='sm'
                                        variant='transparent'
                                        eventKey={item.eventKey}
                                        className="d-flex justify-content-center align-items-center  p-3 border-0"
                                        title={item.label}
                                        isActive={item.activeCheck ? item.activeCheck : undefined}
                                    >
                                        {item.icon}
                                    </Button>
                                </OverlayTrigger>
                            );
                        })}

                    {currentUser?.role === 'admin' && <Button as={NavLink}
                        className="d-flex justify-content-center align-items-center  p-3  border-0"
                        size='sm'
                        variant='transparent'
                        title="Settings"
                        to="/admin-settings"
                        isActive={location.pathname.startsWith('/settings') ? location.pathname.startsWith('/settings') : undefined}> <FaCog size="1.2em" />
                    </Button>}

                </div>
            </Nav>

            {/* Bottom Fixed User Actions */}
            <Nav variant='pills' className="flex-column w-100 flex-grow-1" style={{ height: userActionsHeight, justifyContent: 'flex-end' }}>
                <Nav.Item className="text-center mt-3 mb-1">
                    <ThemeSwitcher />
                </Nav.Item>

                <OverlayTrigger
                    placement="right"
                    delay={{ show: 250, hide: 100 }}
                    overlay={<Tooltip id="tooltip-help">{showDetailsPanel ? "Hide Help Panel" : "Show Help Panel"}</Tooltip>}
                >
                    <Button
                        variant=""
                        size="sm"
                        onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                        className="d-flex justify-content-center align-items-center  p-3 w-100 border-0"
                        title={showDetailsPanel ? "Hide Help Panel" : "Show Help Panel"}
                    >
                        {showDetailsPanel ? <FaQuestionCircle size="1.2em" /> : <FaRegQuestionCircle size="1.2em" />}
                    </Button>
                </OverlayTrigger>


            </Nav>
        </Col>
    );
}

export default Sidebar;