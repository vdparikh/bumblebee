import React from 'react';
import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import {
    FaUserShield, FaUserCheck, FaCalendarAlt, FaBullhorn, FaExternalLinkAlt, FaTag
} from 'react-icons/fa';
import StatusIcon from './StatusIcon';
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
    owners, // New prop for multiple owners
    showOwnerInfo = false,
    actionMenu,
    className = ""
    // className prop might need adjustment or removal if Card styling is preferred
}) => {
    if (!task) return null;

    return (
        <Card className={`mb-3 shadow-sm ${className}`}>
            <Card.Header as="h5">
                <div className="d-flex justify-content-between align-items-start">
                    
                    <div className="d-flex justify-content-between align-items-start">
                        <StatusIcon status={task.status} isOverdue={isOverdueFn(task.due_date, task.status)} size="1.5em" />
                            <div className="mb-0 ms-2 text-break"> {/* Increased title size slightly */}
                                {linkTo ? <Link to={linkTo} state={linkState} className="text-decoration-none text-dark stretched-link">{task.title}</Link> : task.title}
                            </div>
                            </div>
                                        <div className="d-flex justify-content-between align-items-start">

                            <Badge bg={getStatusColor(task.status)} className="me-2 flex-shrink-0">{task.status}</Badge>
                            
                            {actionMenu ? actionMenu : (linkTo && <FaExternalLinkAlt size="1em" className="text-muted mt-1" title="View Details" />)}
</div>                            
                        </div>
            </Card.Header>
            <Card.Body className="p-3">
                <Row className="align-items-center">
                    <Col>
                        {task.description && <p className="mb-2 text-muted small">{task.description.substring(0, 120)}{task.description.length > 120 ? '...' : ''}</p>}
                    </Col>
                </Row>
            </Card.Body>
            <ListGroup variant="flush" className="small">
                {showOwnerInfo && owners && owners.length > 0 && (
                    <ListGroup.Item className="d-flex align-items-center py-1 px-3">
                        <FaUserShield className="me-2 opacity-75" />
                        <span className="me-1 fw-medium">Owner(s):</span>
                        <span className="ms-1">
                            {owners.map((owner, index) => (
                                <React.Fragment key={owner.id}>
                                    <UserDisplay userId={owner.id} userName={owner.name} allUsers={allUsers} />
                                    {index < owners.length - 1 && <span className="ms-1">,</span>}
                                </React.Fragment>
                            ))}
                        </span>
                    </ListGroup.Item>
                )}
                {showAssigneeInfo && (
                    <ListGroup.Item className="d-flex align-items-center py-1 px-3">
                        <FaUserCheck className="me-2 opacity-75" />
                        <span className="me-1 fw-medium">Assignee:</span>
                        <UserDisplay userId={task.assignee_user_id} userName={task.assignee_user_name} allUsers={allUsers} />
                    </ListGroup.Item>
                )}
                <ListGroup.Item className="d-flex align-items-center py-1 px-3">
                    <FaCalendarAlt className="me-2 opacity-75" />
                    <span className="me-1 fw-medium">Due:</span>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                </ListGroup.Item>
                {showCampaignInfo && task.campaign_name && (
                    <ListGroup.Item className="d-flex align-items-center py-1 px-3">
                        <FaBullhorn className="me-2 opacity-75" />
                        <span className="me-1 fw-medium">Campaign:</span>
                        {task.campaign_name}
                    </ListGroup.Item>
                )}
            </ListGroup>
            {(task.category || task.requirement_control_id_reference) && (
                <Card.Footer className="bg-light py-1 px-3">
                    {task.category && (
                        <Badge pill bg="light" text="dark" className="fw-normal me-2 border"><FaTag className="me-1" />{task.category}</Badge>
                    )}
                    {task.requirement_control_id_reference && (
                        <Badge pill bg="light" text="dark" className="fw-normal border">Req: {task.requirement_control_id_reference}</Badge>
                    )}
                </Card.Footer>
            )}
        </Card>
    );
};

export default TaskListItem;