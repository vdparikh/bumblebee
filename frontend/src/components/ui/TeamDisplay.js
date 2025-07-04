import React from 'react';
import { Badge, OverlayTrigger, Popover, ListGroup } from 'react-bootstrap';
import { FaUsers, FaInfoCircle, FaUserCircle } from 'react-icons/fa';

const TeamDisplay = ({ teamId, teamName, teamDescription, teamMembers = [], allTeams = [], defaultText = 'N/A' }) => {
    if (!teamId && !teamName) return defaultText;

    let team = null;
    if (teamId && allTeams.length > 0) {
        team = allTeams.find(t => t.id === teamId);
    }

    const displayTeam = team || { id: teamId, name: teamName, description: teamDescription, members: teamMembers };

    if (!displayTeam.name && !displayTeam.id) return defaultText;

    const teamPopover = (
        <Popover id={`popover-team-display-${displayTeam.id || displayTeam.name.replace(/\s+/g, '-')}`}>
            <Popover.Header as="h3">{displayTeam.name || 'Team Details'}</Popover.Header>
            <Popover.Body>
                {displayTeam.description && (
                    <div className="mb-2">
                        <FaInfoCircle className="me-2 text-muted" />
                        <strong>Description:</strong> {displayTeam.description}
                    </div>
                )}
                {displayTeam.members && displayTeam.members.length > 0 && (
                    <>
                        <strong>Members:</strong>
                        <ListGroup variant="flush" className="mt-1" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {displayTeam.members.map(member => (
                                <ListGroup.Item key={member.id} className="px-0 py-1 border-0">
                                    <FaUserCircle className="me-1 opacity-75" /> {member.name}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </>
                )}
                {(!displayTeam.members || displayTeam.members.length === 0) && !displayTeam.description && (
                    <small className="text-muted">No additional details available.</small>
                )}
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger placement="top" overlay={teamPopover} delay={{ show: 250, hide: 400 }} rootClose>
            <Badge pill bg="light" text="dark" className="fw-normal border" style={{ cursor: 'pointer' }}>
                <FaUsers className="me-1 opacity-75" />
                {displayTeam.name || displayTeam.id}
            </Badge>
        </OverlayTrigger>
    );
};

export default TeamDisplay;
