import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

const UserDisplay = ({ userId, userName, allUsers = [], defaultText = 'N/A' }) => {
    if (!userId) return defaultText;

    const user = allUsers.find(u => u.id === userId);

    if (!user && !userName) return userId; // Fallback to ID if user not found and no name provided
    if (!user && userName) return userName; // Use provided userName if user object not found

    const displayName = user?.name || userName || userId;

    const userPopover = (
        <Popover id={`popover-user-display-${userId}`}>
            <Popover.Header as="h3">{user?.name || userName}</Popover.Header>
            <Popover.Body>
                <strong>Email:</strong> {user?.email || 'N/A'}<br />
                <strong>ID:</strong> {user?.id || userId}
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger placement="top" overlay={userPopover} delay={{ show: 250, hide: 400 }}>
            <span>{displayName}</span>
        </OverlayTrigger>
    );
};

export default UserDisplay;