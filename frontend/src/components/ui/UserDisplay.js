import React from 'react';
import { Badge } from 'react-bootstrap';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { FaUserCircle, FaEnvelope, FaUserTag } from 'react-icons/fa';

const UserDisplay = ({ userId, userName, allUsers = [], defaultText = 'N/A' }) => {
    if (!userId) return defaultText;

    const user = allUsers.find(u => u.id === userId);

    if (!user && !userName) return userId; 
    if (!user && userName) return userName; 

    const displayName = user?.name || userName || userId;

    const userPopover = (
        <Popover id={`popover-user-display-${userId}`}>
            <Popover.Header as="h3">{user?.name || userName}</Popover.Header>
            <Popover.Body>
                <div className="mb-1">
                    <FaEnvelope className="me-2 text-muted" />
                    <strong>Email:</strong> {user?.email || 'N/A'}
                </div>
                {user?.role && (
                    <div className="mb-1">
                        <FaUserTag className="me-2 text-muted" />
                        <strong>Role:</strong> <span className="text-capitalize">{user.role}</span>
                    </div>
                )}
                <small className="text-muted"><strong>ID:</strong> {user?.id || userId}</small>
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger placement="top" overlay={userPopover} delay={{ show: 250, hide: 400 }} rootClose>
            
            <Badge pill bg="light" text="dark" className="fw-normal border" style={{cursor: 'pointer'}}>
                <FaUserCircle className="text-primary me-1 opacity-75" />
                 {displayName}</Badge>
        </OverlayTrigger>
    );
};

export default UserDisplay;