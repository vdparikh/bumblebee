import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Alert, Pagination, Form, Row, Col, Card, Badge, Accordion, OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import {
    FaHistory, FaUser, FaFilter, FaCalendarAlt, FaSearch,
    FaPlusCircle, FaEdit, FaTrashAlt, FaSignInAlt, FaSignOutAlt,
    FaFileUpload, FaClipboardCheck
} from 'react-icons/fa';
import { getAuditLogs, getUsers } from '../services/api';
import PageHeader from '../components/common/PageHeader';
import UserDisplay from '../components/common/UserDisplay';
import { debounce } from 'lodash';

const entityTypeOptions = [
    "task", "evidence", "user", "campaign", "requirement", "standard",
    "campaign_task_instance", "comment", "connected_system", "document", "team"
];

function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [groupedLogs, setGroupedLogs] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({
        user_id: '',
        entity_type: '',
        entity_id: '',
        start_date: '',
        end_date: '',
        action: '', // Added action filter
    });
    const itemsPerPage = 15;

    const fetchLogs = useCallback(async (page = 1, currentFilters) => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: itemsPerPage };
            if (currentFilters.user_id) params['al.user_id'] = currentFilters.user_id;
            if (currentFilters.entity_type) params['al.entity_type'] = currentFilters.entity_type;
            if (currentFilters.entity_id) params['al.entity_id'] = currentFilters.entity_id;
            if (currentFilters.start_date) params.start_date = currentFilters.start_date;
            if (currentFilters.end_date) params.end_date = currentFilters.end_date;
            if (currentFilters.action) params.action = currentFilters.action; // Pass action filter

            const response = await getAuditLogs(params);
            setLogs(Array.isArray(response.data.logs) ? response.data.logs : []);
            setTotalPages(Math.ceil(response.data.total / itemsPerPage));
            setCurrentPage(page);
        } catch (err) {
            setError('Failed to fetch audit logs. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await getUsers();
            setUsers(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Failed to fetch users for filter dropdown:", err);
            // Non-critical error, so we don't set the main page error
        }
    }, []);

    useEffect(() => {
        fetchLogs(1, filters);
        fetchUsers();
    }, [filters]); // Removed fetchLogs, fetchUsers from deps as they are stable due to useCallback

    useEffect(() => {
        if (logs.length > 0) {
            const newGroupedLogs = logs.reduce((acc, log) => {
                const date = new Date(log.timestamp).toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(log);
                return acc;
            }, {});
            const sortedDates = Object.keys(newGroupedLogs).sort((a, b) => new Date(b) - new Date(a));
            const sortedGroupedLogs = {};
            sortedDates.forEach(date => {
                sortedGroupedLogs[date] = newGroupedLogs[date];
            });
            setGroupedLogs(sortedGroupedLogs);
        } else {
            setGroupedLogs({});
        }
    }, [logs]);

    const debouncedFetchLogs = useCallback(debounce(fetchLogs, 500), [fetchLogs]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        // Fetch immediately for selects/dates, debounce for text inputs if needed
        if (name !== 'entity_id' && name !== 'action') { // Assuming entity_id and action are text inputs
             fetchLogs(1, newFilters);
        } else {
            debouncedFetchLogs(1, newFilters);
        }
    };

    const handlePageChange = (pageNumber) => {
        fetchLogs(pageNumber, filters);
    };

    const renderChanges = (changes) => {
        if (!changes) return <span className="text-muted">N/A</span>;
        try {
            const parsedChanges = JSON.parse(changes);
            return (
                <ul className="list-unstyled mb-0 small">
                    {Object.entries(parsedChanges).map(([key, value]) => (
                        <li key={key}>
                            <strong>{key}:</strong>
                            {typeof value === 'object' && value !== null && 'old' in value && 'new' in value ? (
                                <> From <Badge bg="light" text="dark" className="font-monospace">{String(value.old)}</Badge> to <Badge bg="info" text="dark" className="font-monospace">{String(value.new)}</Badge></>
                            ) : (
                                <span className="font-monospace ms-1">{JSON.stringify(value)}</span>
                            )}
                        </li>
                    ))}
                </ul>
            );
        } catch (e) {
            return <span className="text-danger">Error parsing changes</span>;
        }
    };

    const actionIcons = {
        create: <FaPlusCircle className="text-success" title="Create" />,
        update: <FaEdit className="text-info" title="Update" />,
        delete: <FaTrashAlt className="text-danger" title="Delete" />,
        login: <FaSignInAlt className="text-primary" title="Login" />,
        logout: <FaSignOutAlt className="text-warning" title="Logout" />,
        upload: <FaFileUpload className="text-secondary" title="Upload" />, // for upload_evidence
        review: <FaClipboardCheck className="text-success" title="Review" />, // for review_evidence
        default: <FaHistory className="text-muted" title="Generic Action" />
    };

    const getActionIcon = (action) => {
        if (!action) return actionIcons.default;
        const lowerAction = action.toLowerCase();
        if (lowerAction.startsWith('create')) return actionIcons.create;
        if (lowerAction.startsWith('update')) return actionIcons.update;
        if (lowerAction.startsWith('delete')) return actionIcons.delete;
        if (lowerAction.includes('login')) return actionIcons.login;
        if (lowerAction.includes('logout')) return actionIcons.logout;
        if (lowerAction.includes('upload')) return actionIcons.upload;
        if (lowerAction.includes('review')) return actionIcons.review;
        return actionIcons.default;
    };

    const formatActionDisplay = (action) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div>
            <PageHeader icon={<FaHistory />} title="Audit Logs" />
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Card className="mb-3">
                <Card.Header><FaFilter className="me-2" />Filters</Card.Header>
                <Card.Body>
                    <Form>
                        <Row>
                            <Col md={3}>
                                <Form.Group controlId="filterUserId">
                                    <Form.Label>User</Form.Label>
                                    <Form.Select name="user_id" value={filters.user_id} onChange={handleFilterChange}>
                                        <option value="">All Users</option>
                                        {users.map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group controlId="filterEntityType">
                                    <Form.Label>Entity Type</Form.Label>
                                    <Form.Select name="entity_type" value={filters.entity_type} onChange={handleFilterChange}>
                                        <option value="">All Types</option>
                                        {entityTypeOptions.map(type => <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group controlId="filterEntityId">
                                    <Form.Label>Entity ID <FaSearch className="ms-1" /></Form.Label>
                                    <Form.Control type="text" name="entity_id" placeholder="Enter UUID" value={filters.entity_id} onChange={handleFilterChange} />
                                </Form.Group>
                            </Col>
                             <Col md={3}>
                                <Form.Group controlId="filterAction">
                                    <Form.Label>Action <FaSearch className="ms-1" /></Form.Label>
                                    <Form.Control type="text" name="action" placeholder="e.g., create_campaign" value={filters.action} onChange={handleFilterChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="mt-2">
                            <Col md={3}>
                                <Form.Group controlId="filterStartDate">
                                    <Form.Label>Start Date <FaCalendarAlt className="ms-1" /></Form.Label>
                                    <Form.Control type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group controlId="filterEndDate">
                                    <Form.Label>End Date <FaCalendarAlt className="ms-1" /></Form.Label>
                                    <Form.Control type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="text-center"><Spinner animation="border" /> <p>Loading audit logs...</p></div>
            ) : logs.length === 0 ? (
                <Alert variant="info" className="mt-3">No audit logs found matching your criteria.</Alert>
            ) : (
                <>
                    <div className="audit-timeline mt-4">
                        {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                            <div key={date} className="timeline-date-group mb-4">
                                <h5 className="timeline-date-header p-2  rounded mb-3 sticky-top" style={{top: '0', zIndex: 1}}>
                                    {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h5>
                                {dateLogs.map(log => (
                                    <Card key={log.id} className="timeline-event mb-3 shadow-sm">
                                        <Card.Body className="p-3">
                                            <Row>
                                                <Col xs="auto" className="text-center pe-0" style={{width: '80px'}}>
                                                    <div className="timeline-icon mb-1" style={{fontSize: '1.5rem'}}>
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                    <small className="text-muted d-block">
                                                        {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </small>
                                                </Col>
                                                <Col style={{borderLeft: '3px solid #e9ecef', paddingLeft: '1.5rem'}}>
                                                    <div className="timeline-event-header mb-1">
                                                        {log.user ? (
                                                            <UserDisplay userId={log.user.id} userName={log.user.name} email={log.user.email} allUsers={users} />
                                                        ) : (
                                                            <Badge bg="secondary">System</Badge>
                                                        )}
                                                        <span className="mx-1 text-muted small">performed action</span>
                                                        <Badge bg="primary" pill className="me-1">{formatActionDisplay(log.action)}</Badge>
                                                        <span className="mx-1 text-muted small">on</span>
                                                        <span className="fw-bold me-1">{log.entity_type.replace(/_/g, ' ')}</span>
                                                        <OverlayTrigger
                                                            placement="top"
                                                            overlay={<Tooltip id={`tooltip-entity-${log.id}`}>{log.entity_id}</Tooltip>}
                                                        >
                                                            <Badge bg="light" text="dark" className="font-monospace border">
                                                                {log.entity_id.substring(0, 8)}...
                                                            </Badge>
                                                        </OverlayTrigger>
                                                    </div>

                                                    {log.changes && Object.keys(log.changes).length > 0 && (
                                                        <Accordion flush className="mt-2">
                                                            <Accordion.Item eventKey={log.id}>
                                                                <Accordion.Header as="div" className="p-0 small">
                                                                    <span variant="link" size="sm" className="p-0 text-decoration-none text-muted">
                                                                        View Changes
                                                                    </span>
                                                                </Accordion.Header>
                                                                <Accordion.Body className="p-2 border-top">
                                                                    {renderChanges(JSON.stringify(log.changes))}
                                                                </Accordion.Body>
                                                            </Accordion.Item>
                                                        </Accordion>
                                                    )}
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <Pagination className="justify-content-center">
                            <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                            <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                            {[...Array(totalPages).keys()].map(page => {
                                const pageNumber = page + 1;
                                if (pageNumber === currentPage || (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2) || pageNumber === 1 || pageNumber === totalPages) {
                                    return (
                                        <Pagination.Item
                                            key={pageNumber}
                                            active={pageNumber === currentPage}
                                            onClick={() => handlePageChange(pageNumber)}
                                        >
                                            {pageNumber}
                                        </Pagination.Item>
                                    );
                                }
                                if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                                    return <Pagination.Ellipsis key={pageNumber} disabled />;
                                }
                                return null;
                            })}
                            <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                            <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                        </Pagination>
                    )}
                </>
            )}
        </div>
    );
}

export default AuditLogsPage;