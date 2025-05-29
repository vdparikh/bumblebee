import React from 'react';
import { Link } from 'react-router-dom';
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
    showOwnerInfo = false,
    actionMenu,
    className = "py-3 border-bottom"
}) => {
    if (!task) return null;

    return (
        <ListGroup.Item action as={linkTo ? Link : 'div'} to={linkTo} state={linkState} className={className}>
            <Row className="align-items-center">
                <Col xs="auto" className="pe-2 d-flex align-items-center">
                    <StatusIcon status={task.status} isOverdue={isOverdueFn(task.due_date, task.status)} size="1.8em" />
                </Col>
                <Col>
                    <h6 className="m-0 p-0 mb-1">
                        {linkTo ? <Link to={linkTo} state={linkState} className="text-decoration-none text-dark">{task.title}</Link> : task.title}
                    </h6>
                    <p className="mb-1 text-muted small">
                        {showOwnerInfo && <><FaUserShield className="me-1" />Owner: <UserDisplay userId={task.owner_user_id} userName={task.owner_user_name} allUsers={allUsers} /> <span className="mx-2">|</span></>}
                        {showAssigneeInfo && <><FaUserCheck className="me-1" />Assignee: <UserDisplay userId={task.assignee_user_id} userName={task.assignee_user_name} allUsers={allUsers} /> <span className="mx-2">|</span></>}
                        <FaCalendarAlt className="me-1" />Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                        {showCampaignInfo && task.campaign_name && <><span className="mx-2">|</span><FaBullhorn className="me-1" />Campaign: {task.campaign_name}</>}
                    </p>
                    {task.description && <p className="mb-1 text-muted small d-none d-md-block">{task.description.substring(0, 100)}{task.description.length > 100 ? '...' : ''}</p>}
                    <div className="mt-1">
                        {task.category && (
                            <Badge pill bg="light" text="dark" className="fw-normal me-2 border"><FaTag className="me-1" />{task.category}</Badge>
                        )}
                        {task.requirement_control_id_reference && (
                            <Badge pill bg="light" text="dark" className="fw-normal border">Req: {task.requirement_control_id_reference}</Badge>
                        )}
                    </div>
                </Col>
                <Col xs="auto" className="text-end">
                    <div className="mb-1">
                        <Badge bg={getStatusColor(task.status)}>{task.status}</Badge>
                    </div>
                    {actionMenu ? actionMenu : (linkTo && <FaExternalLinkAlt size="1em" className="text-muted mt-1" title="View Details" />)}
                </Col>
            </Row>
        </ListGroup.Item>
    );
};

export default TaskListItem;