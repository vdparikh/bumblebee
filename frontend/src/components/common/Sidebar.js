import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import {
    FaTachometerAlt, FaUser, FaBullhorn, FaColumns,
    FaTasks, FaFileContract, FaShieldAlt, FaBookOpen
} from 'react-icons/fa';

function Sidebar({ currentUser }) {
    const location = useLocation();

    const navItems = [
        { to: "/", eventKey: "/", icon: <FaTachometerAlt size="1.5em" />, label: "Dashboard", roles: ['admin', 'auditor', 'user'] },
        { to: "/my-tasks", eventKey: "/my-tasks", icon: <FaUser size="1.5em" />, label: "My Tasks", roles: ['admin', 'auditor', 'user'] },
        { to: "/campaigns", eventKey: "/campaigns", icon: <FaBullhorn size="1.5em" />, label: "Campaigns", roles: ['admin', 'auditor', 'user'], activeCheck: () => location.pathname.startsWith('/campaigns') },
        { to: "/alt-view", eventKey: "/alt-view", icon: <FaColumns size="1.5em" />, label: "Alternate View", roles: ['admin', 'auditor', 'user'] },
        (currentUser?.role === 'admin' || currentUser?.role === 'auditor') && { type: 'divider', label: 'Management', key: 'nav-div-management' },
        { to: "/documents", eventKey: "/documents", icon: <FaBookOpen size="1.5em" />, label: "Documents", roles: ['admin', 'auditor'], activeCheck: () => location.pathname.startsWith('/documents') },
        { to: "/tasks", eventKey: "/tasks", icon: <FaTasks size="1.5em" />, label: "Manage Tasks", roles: ['admin', 'auditor'] },
        { to: "/requirements", eventKey: "/requirements", icon: <FaFileContract size="1.5em" />, label: "Manage Requirements", roles: ['admin', 'auditor'] },
        { to: "/standards", eventKey: "/standards", icon: <FaShieldAlt size="1.5em" />, label: "Manage Standards", roles: ['admin', 'auditor'] },
    ];

    return (
        <Col className="p-0 sidebar d-flex flex-column align-items-center" style={{ maxWidth: "60px" }}>
            <Nav variant='pills' activeKey={location.pathname} className="flex-column w-100 mt-6">
                <Navbar.Brand as={Link} to="/" className="text-center mt-3 mb-3">
                    <Image height={44} src={process.env.PUBLIC_URL + '/logo.webp'} alt="Bumblebee Logo" />
                </Navbar.Brand>

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
            </Nav>
        </Col>
    );
}

export default Sidebar;