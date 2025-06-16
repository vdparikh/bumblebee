import React from 'react';
import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { FaUserShield, FaUserCheck, FaCalendarAlt, FaBullhorn, FaExternalLinkAlt, FaTag, FaExclamationCircle, FaFileContract, FaUsers, FaFlag, FaClock } from 'react-icons/fa';
import StatusIcon from './StatusIcon';
import TeamDisplay from './TeamDisplay'; // Import TeamDisplay
import UserDisplay from './UserDisplay';
import { getStatusColor } from '../../utils/displayUtils';

const TaskListItem = ({
    // ... other props
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
    evidenceCount,  // New prop
    commentCount,   // New prop
    actionMenu,
    className = ""

}) => {
    if (!task) return null;

    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

    let dueDateStatus = '';
    if (dueDate && task.status !== 'Closed') {
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
            dueDateStatus = 'Overdue';
        } else if (daysDiff === 0) {
            dueDateStatus = 'Due Today';
        } else {
            dueDateStatus = `Due in ${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
        }
    }

    return (
        <Card className={`mb-3 shadow-sm ${className}`}>
            <Card.Header as="h6">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                    <span className="me-2" ><StatusIcon status={task.status} isOverdue={isOverdueFn(task.due_date, task.status)} size="1.1em" /></span>
                    {/* {task.defaultPriority && (<Badge bg={getPriorityBadgeColor(task.defaultPriority)} className="me-1">
                        {task.defaultPriority}
                    </Badge>)} */}
                    
                     <Badge bg={getPriorityBadgeColor(task.priority)} className="me-1 flex-shrink-0">
                        <FaFlag className='me-1' />
                        {task.priority}</Badge>     

                        
                    <Badge bg={getStatusColor(task.status)} className="me-1 flex-shrink-0">
                        <FaFlag className='me-1' />
                        {task.status}</Badge>

 
                                          

                    {dueDateStatus && <Badge  bg={dueDateStatus === 'Overdue' ? 'danger' : (dueDateStatus === 'Due Today' ? 'warning' : 'info')} className=" fw-normal">
                        <FaClock className='me-1' />
                        {dueDateStatus}</Badge>}


                    </div>
                    <div className="d-flex justify-content-between align-items-start">
                        {actionMenu ? actionMenu : (linkTo && <FaExternalLinkAlt style={{ lineHeight: "1em" }} size="1em" className="text-muted mt-1" title="View Details" />)}
                    </div>
                </div>
                
                <div className="">
                     {task.category && (
                        <div style={{ fontSize: "0.7em"}} className="mb-1 fw-normal text-muted text-uppercase small">{task.category}</div>
                    )}
                    <div className="d-flex justify-content-between align-items-start">

                        <div className="mb-0 text-break ">
                            {linkTo ? <Link to={linkTo} state={linkState} className="text-decoration-none stretched-link">{task.title}</Link> : task.title}
                        </div>
                    </div>
                    
                </div>
            </Card.Header>
            <Card.Body className="pt-0">

                {task.description && <p className="text-muted ">{task.description.substring(0, 120)}{task.description.length > 120 ? '...' : ''}</p>}


                <Row>
                    <Col md={4}>
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
                    <Col md={4} className='border-start'>
                        {showAssigneeInfo && (
                            <div className="">
                                {/* <FaUserCheck className="me-2 opacity-75" /> */}
                                <span className="small me-1 fw-medium">Assignee:</span><br />
                                <UserDisplay userId={task.assignee_user_id} userName={task.assignee_user_name} allUsers={allUsers} />
                            </div>
                        )}
                    </Col>

                    {/* <Col md={2} className='border-start'>

                        <div className="">
                            <span className="small me-1 fw-medium">Due:</span> <br />
                            
                            
                            <Badge pill bg="light" text="dark" className="fw-normal border me-2">
                                <FaCalendarAlt className="text-primary me-2 opacity-75" />
                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                            </Badge>



                        </div>
                    </Col> */}
                    <Col md={2} className='border-start'>
                        <div className="">
                            <span className="small me-1 fw-medium">Evidence:</span> <br />
                            <Badge pill bg="light" text="dark" className="fw-normal border me-2">
                                <FaFileContract className="text-info me-2 opacity-75" />
                                {evidenceCount || 0}
                            </Badge>
                        </div>
                    </Col>
                    <Col md={2} className='border-start'>
                        <div className="">
                            <span className="small me-1 fw-medium">Comments:</span> <br />
                            <Badge pill bg="light" text="dark" className="fw-normal border me-2">
                                <FaUsers className="text-success me-2 opacity-75" /> {/* Using FaUsers as a placeholder for comments icon */}
                                {commentCount || 0}
                            </Badge>
                        </div>
                    </Col>
                </Row>




            </Card.Body>

            {(task.category || task.requirement_control_id_reference) && (
                <Card.Footer className="bg-light border-0 py-1 px-3">
                    {/* {task.category && (
                        <Badge pill bg="white" text="dark" className="fw-normal me-2 border"><FaTag className="me-1" />{task.category}</Badge>
                    )} */}
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