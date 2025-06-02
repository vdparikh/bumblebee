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
import {
    FaTachometerAlt, FaUser, FaBullhorn, FaColumns,
    FaTasks, FaFileContract, FaShieldAlt, FaBookOpen,
    FaQuestionCircle, FaRegQuestionCircle
} from 'react-icons/fa';
import ThemeSwitcher from './ThemeSwitcher';

function Sidebar({ currentUser, logout, showDetailsPanel, setShowDetailsPanel }) {
    const location = useLocation();
    const userActionsHeight = '150px'; // Approximate height for user actions section

    const navItems = [
        { to: "/", eventKey: "/", icon: <FaTachometerAlt size="1.2em" />, label: "Dashboard", roles: ['admin', 'auditor', 'user'] },
        { to: "/my-tasks", eventKey: "/my-tasks", icon: <FaUser size="1.2em" />, label: "My Tasks", roles: ['admin', 'auditor', 'user'] },
        { to: "/campaigns", eventKey: "/campaigns", icon: <FaBullhorn size="1.2em" />, label: "Campaigns", roles: ['admin', 'auditor', 'user'], activeCheck: () => location.pathname.startsWith('/campaigns') },
        { to: "/alt-view", eventKey: "/alt-view", icon: <FaColumns size="1.2em" />, label: "Alternate View", roles: ['admin', 'auditor', 'user'] },
        (currentUser?.role === 'admin' || currentUser?.role === 'auditor') && { type: 'divider', label: 'Management', key: 'nav-div-management' },
        { to: "/documents", eventKey: "/documents", icon: <FaBookOpen size="1.2em" />, label: "Documents", roles: ['admin', 'auditor'], activeCheck: () => location.pathname.startsWith('/documents') },
        { to: "/tasks", eventKey: "/tasks", icon: <FaTasks size="1.2em" />, label: "Manage Tasks", roles: ['admin', 'auditor'] },
        { to: "/requirements", eventKey: "/requirements", icon: <FaFileContract size="1.2em" />, label: "Manage Requirements", roles: ['admin', 'auditor'] },
        { to: "/standards", eventKey: "/standards", icon: <FaShieldAlt size="1.2em" />, label: "Manage Standards", roles: ['admin', 'auditor'] },
    ];

    return (
        <Col className="p-0 sidebar d-flex flex-column" style={{ maxWidth: "60px" }}>
            {/* Top Logo */}
            <Navbar.Brand as={Link} to="/" className="text-center mt-3 mb-3">
                <Image height={44} src={process.env.PUBLIC_URL + '/logo.webp'} alt="Bumblebee Logo" />
            </Navbar.Brand>

            {/* Scrollable Navigation Links */}
            <Nav variant='pills' activeKey={location.pathname} className="flex-column w-100 flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: `calc(100vh - ${userActionsHeight})` }}>
                <div className="mt-1">

<div className='bg-white p-0 rounded-pill mb-3' style={{ width: "50px", height: "50px", lineHeight: "32px", margin: "5px 5px"}}>
                    <NavDropdown
                        as={NavLink}
                        title={
                            <OverlayTrigger placement="right" delay={{ show: 250, hide: 100 }} overlay={<Tooltip id="tooltip-user-actions">{currentUser?.name || 'User Menu'}</Tooltip>}>
                                <div className="">
                                    <FaUser className='text-dark' size="1.2em" />
                                </div>
                            </OverlayTrigger>
                        }
                        id="sidebar-user-actions-dropdown"
                        drop="down-centered"
                        align={{ lg: 'start' }}
                        placement='center'
                        className=" "

                    >
                        <NavDropdown.Header className="text-center small text-muted">{currentUser?.name || 'User'}</NavDropdown.Header>
                        <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                        {currentUser?.role === 'admin' && <NavDropdown.Item as={NavLink} to="/admin-settings">Admin Settings</NavDropdown.Item>}
                        <NavDropdown.Divider />
                        <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
                    </NavDropdown>
</div>
                    {navItems
                        .filter(Boolean)
                        .map((item, index) => {
                            if (item.type === 'divider') {
                                return (
                                    <Nav.Item key={item.key || `divider-${index}`} className='text-center mt-3 mb-1'>
                                        <hr className="border-light border-opacity-25 w-75 mx-auto" />
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
                                    <Nav.Link
                                        as={NavLink}
                                        to={item.to}
                                        eventKey={item.eventKey}
                                        className="d-flex justify-content-center align-items-center p-3 mb-1"
                                        title={item.label}
                                        isActive={item.activeCheck ? item.activeCheck : undefined}
                                    >
                                        {item.icon}
                                    </Nav.Link>
                                </OverlayTrigger>
                            );
                        })}
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
                        className="d-flex justify-content-center align-items-center text-white-50 p-3 w-100 border-0"
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