import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
    FaTachometerAlt, FaTasks, FaBullhorn, FaBookOpen, FaLayerGroup, FaUserShield, FaHistory, FaCog, FaQuestionCircle, FaRegQuestionCircle, FaUsers, FaChevronDown, FaChevronRight, FaUser,
    FaCogs,
    FaPlug,
    FaShieldAlt,
    FaExclamation,
    FaExclamationTriangle,
    FaFileContract
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';

const sidebarSections = [
    {
        header: 'Main',
        items: [
            { to: '/', icon: <FaTachometerAlt />, label: 'Dashboard', roles: ['admin', 'auditor', 'user'] },
            { to: '/my-tasks', icon: <FaTasks />, label: 'My Tasks', roles: ['admin', 'auditor', 'user'] },
            { to: '/campaigns', icon: <FaBullhorn />, label: 'Campaigns', roles: ['admin', 'auditor', 'user'] },
            { to: '/audit-logs', icon: <FaHistory />, label: 'Audit Logs', roles: ['admin', 'auditor'] },
        ]
    },
    {
        header: 'Management',
        items: [
            { to: '/auditor-dashboard', icon: <FaUserShield />, label: 'Auditor', roles: ['admin', 'auditor'] },
            { to: '/documents', icon: <FaBookOpen />, label: 'Documents', roles: ['admin', 'auditor'] },
            {
                label: 'Compliance',
                icon: <FaShieldAlt />,
                roles: ['admin'],
                children: [
                    { to: '/standards', icon: <FaLayerGroup />, label: 'Standards', roles: ['admin', 'auditor'] },
                    { to: '/requirements', icon: <FaFileContract />, label: 'Requirements', roles: ['admin', 'auditor'] },
                    { to: '/tasks', icon: <FaTasks />, label: 'Task Library', roles: ['admin', 'auditor'] },
                    { to: '/risks', icon: <FaExclamationTriangle />, label: 'Risks', roles: ['admin', 'auditor'] }

                ]
            },
            {
                label: 'Settings',
                icon: <FaCogs />,
                roles: ['admin'],
                children: [
                    { to: '/admin-settings', icon: <FaCog />, label: 'Settings', roles: ['admin'] },
                    { to: '/admin/system-integrations', icon: <FaPlug />, label: 'Integrations', roles: ['admin'] },
                    { to: '/teams', icon: <FaUsers />, label: 'Teams', roles: ['admin', 'auditor'] },
                    { to: '/users', icon: <FaUser />, label: 'Users', roles: ['admin', 'auditor'] }
                ]
            }
        ]
    },
    {
        items: [
            { to: '/help', icon: <FaQuestionCircle />, label: 'Help', roles: ['admin', 'auditor', 'user'] },
        ]
    }
];

function Sidebar({ logout, showDetailsPanel, setShowDetailsPanel }) {
    const { currentUser } = useAuth();
    const location = useLocation();
    const [openSections, setOpenSections] = useState({});

    const toggleSection = (label) => {
        setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <div className="sidebar-modern" style={{  }}>
            {/* Logo */}
            <div className="sidebar-logo" style={{ margin: '32px 0 24px 0', textAlign: 'center' }}>
                <Link to="/">
                    <img src={process.env.PUBLIC_URL + '/logo.webp'} alt="Logo" height={44} />
                </Link>
            </div>
            {/* Navigation */}
            <nav className="sidebar-nav" style={{ width: '100%' }}>
                {sidebarSections.map(section => (
                    <div key={section.header} style={{ marginBottom: 18 }}>
                        <div className="sidebar-section-header">{section.header}</div>
                        <div>
                            {section.items
                                .filter(item => Array.isArray(item.roles) && item.roles.includes(currentUser?.role))
                                .map(item => item.children ? (
                                    <div key={item.label}>
                                        <div
                                            className={`sidebar-nav-link sidebar-tree-parent${openSections[item.label] ? ' open' : ''}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', cursor: 'pointer', borderRadius: 12, fontWeight: 500, fontSize: '0.8em!important', background: openSections[item.label] ? 'none' : 'none' }}
                                            onClick={() => toggleSection(item.label)}
                                        >
                                            <span className="sidebar-icon" style={{ fontSize: 14 }}>{item.icon}</span>
                                            <span className="sidebar-label" style={{ flex: 1 }}>{item.label}</span>
                                            <span className="sidebar-chevron" style={{ fontSize: 12, color: '#aaa' }}>
                                                {openSections[item.label] ? <FaChevronDown /> : <FaChevronRight />}
                                            </span>
                                        </div>
                                        {openSections[item.label] && (
                                            <div className="sidebar-tree-children" style={{ }}>
                                                {item.children
                                                    .filter(child => Array.isArray(child.roles) && child.roles.includes(currentUser?.role))
                                                    .map(child => (
                                                        <NavLink
                                                            key={child.to}
                                                            to={child.to}
                                                            className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}
                                                            style={({ isActive }) => ({
                                                                
                                                            })}
                                                        >
                                                            <span className="sidebar-icon" style={{ fontSize: 17 }}>{child.icon}</span>
                                                            <span className="sidebar-label">{child.label}</span>
                                                        </NavLink>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}
                                        style={({ isActive }) => ({
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '2px 24px', color: isActive ? '#1976d2' : '#444', fontWeight: 500, fontSize: '1em!important', borderRadius: 0, background: isActive ? 'none' : 'none', marginBottom: 2
                                        })}
                                    >
                                        <span className="sidebar-icon" style={{ fontSize: 14 }}>{item.icon}</span>
                                        <span className="sidebar-label">{item.label}</span>
                                    </NavLink>
                                ))}
                        </div>
                    </div>
                ))}
            </nav>
            {/* Spacer */}
            <div className="sidebar-spacer" style={{ flex: 1 }} />
            {/* Bottom Section */}
            <div className="sidebar-bottom" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                {/* Theme Switcher */}
                <ThemeSwitcher />
                {/* Help/Support */}
                <button
                    className="sidebar-nav-link"
                    title={showDetailsPanel ? "Hide Help Panel" : "Show Help Panel"}
                    onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', borderRadius: 12, color: '#888', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
                >
                    <span className="sidebar-icon">
                        {showDetailsPanel ? <FaQuestionCircle /> : <FaRegQuestionCircle />}
                    </span>
                    <span className="sidebar-label" style={{ fontSize: '1.01rem' }}>Help</span>
                </button>
                {/* User/Profile */}
                <div className="sidebar-user" style={{ width: 48, height: 48, borderRadius: 16, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 22, marginTop: 8 }}>
                    <FaUser />
                </div>
            </div>
        </div>
    );
}

export default Sidebar;