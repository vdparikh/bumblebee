import React from 'react';
import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import { FaUserShield, FaUserCheck, FaCalendarAlt, FaBullhorn, FaExternalLinkAlt, FaTag, FaExclamationCircle, FaFileContract, FaUsers } from 'react-icons/fa';
import StatusIcon from './StatusIcon';
import TeamDisplay from './TeamDisplay'; // Import TeamDisplay
import UserDisplay from './UserDisplay';
import { getStatusColor } from '../../utils/displayUtils';

const TaskListItem = ({
    task,
    allUsers,
    linkTo,
    linkState,
    isOverdueFn,
    showCampaignInfo = true,
    showAssigneeInfo = true,
    owners,
    showOwnerInfo = false,
    ownerTeam,      // New prop
    assigneeTeam,   // New prop
    actionMenu,
    className = ""

}) => {
    if (!task) return null;

    return (
        <Card className={`mb-3 shadow-sm ${className}`}>
            <Card.Header as="h5">
                <div className='mb-2'>
                    <span className="me-2" ><StatusIcon status={task.status} isOverdue={isOverdueFn(task.due_date, task.status)} size="1.1em" /></span>
                    {task.defaultPriority && (<Badge bg={getPriorityBadgeColor(task.defaultPriority)} className="me-1">{task.defaultPriority}</Badge>)}
                    <Badge bg={getStatusColor(task.status)} className="me-2 flex-shrink-0">{task.status}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-start">

                    <div className="d-flex justify-content-between align-items-start">

                        <div className="mb-0  fs-6 text-break">
                            {linkTo ? <Link to={linkTo} state={linkState} className="text-decoration-none text-primary stretched-link">{task.title}</Link> : task.title}
                        </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-start">
                        {actionMenu ? actionMenu : (linkTo && <FaExternalLinkAlt style={{ lineHeight: "1em" }} size="1em" className="text-muted mt-1" title="View Details" />)}
                    </div>
                </div>
            </Card.Header>
            <Card.Body className="">

                {task.description && <p className="text-muted ">{task.description.substring(0, 120)}{task.description.length > 120 ? '...' : ''}</p>}


                <Row>
                    <Col>
                        {showOwnerInfo && owners && owners.length > 0 && (
                            <div className="">
                                {/* <FaUserShield className="me-2 opacity-75" /> */}
                                <span className="small me-1 fw-medium">Owner(s):</span> <br />
                                <span className="">
                                    {owners.map((owner, index) => (
                                        <span className='me-1' key={owner.id}>
                                            <UserDisplay userId={owner.id} userName={owner.name} allUsers={allUsers} />

                                        </span>
                                    ))}
                                </span>
                            </div>
                        )}

                        {(ownerTeam || assigneeTeam) && (
                            <div>
                                {ownerTeam && ownerTeam.name && (
                                    <div className="mb-1">
                                        <span className="small me-1 fw-medium">Owner Team:</span><br />
                                        <TeamDisplay teamId={ownerTeam.id} teamName={ownerTeam.name} teamDescription={ownerTeam.description} teamMembers={ownerTeam.members} />
                                    </div>
                                )}
                                {/* {assigneeTeam && assigneeTeam.name && (
                            <div>
                                <span className="me-1 fw-medium">Assignee Team:</span>
                                <TeamDisplay teamId={assigneeTeam.id} teamName={assigneeTeam.name} teamDescription={assigneeTeam.description} teamMembers={assigneeTeam.members} />
                            </div>
                        )} */}
                            </div>
                        )}

                    </Col>
                    <Col className='border-start border-end'>
                        {showAssigneeInfo && (
                            <div className="">
                                {/* <FaUserCheck className="me-2 opacity-75" /> */}
                                <span className="small me-1 fw-medium">Assignee:</span><br />
                                <UserDisplay userId={task.assignee_user_id} userName={task.assignee_user_name} allUsers={allUsers} />
                            </div>
                        )}
                    </Col>

                    <Col >

                        <div className="">
                            {/* <FaCalendarAlt className="me-2 opacity-75" /> */}
                            <span className="me-1 fw-medium">Due:</span> <br />
                            <Badge pill bg="light" text="dark" className="fw-normal border me-2">
                                <FaCalendarAlt className="text-primary me-2 opacity-75" />
                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</Badge>

                        </div>
                    </Col>
                </Row>




            </Card.Body>

            {(task.category || task.requirement_control_id_reference) && (
                <Card.Footer className="bg-light py-1 px-3">
                    {task.category && (
                        <Badge pill bg="white" text="dark" className="fw-normal me-2 border"><FaTag className="me-1" />{task.category}</Badge>
                    )}
                    {task.requirement_control_id_reference && (
                        <Badge pill bg="white" text="dark" className="fw-normal border me-2">
                            <FaFileContract className="me-2 opacity-75" />
                            {task.requirement_control_id_reference}</Badge>
                    )}

                    {showCampaignInfo && task.campaign_name && (
                        <Badge pill bg="white" text="dark" className="fw-normal border">
                            <FaBullhorn className="me-2 opacity-75" />
                            <span className="me-1 fw-medium">Campaign:</span>
                            {task.campaign_name}
                        </Badge>
                    )}

                </Card.Footer>
            )}
        </Card>
    );
};


const getPriorityBadgeColor = (priority) => {
    switch (priority?.toLowerCase()) {
        case 'critical': return 'danger';
        case 'high': return 'warning';
        case 'medium': return 'info';
        case 'low': return 'secondary';
        default: return 'light';
    }
};

export default TaskListItem;