import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    getTaskById,
    getUsers,
    getRequirementById, 
    getCommentsByMasterTaskId,      // Corrected: Use master task comments
    addCommentToMasterTask,         // Corrected: Use master task comments
    getEvidenceByTaskId, // New
    uploadEvidenceToTask, // New
    updateTask,          // New (or a more specific updateTaskStatus)
} from '../services/api';
import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form'; // New
import Spinner from 'react-bootstrap/Spinner'; // For loading state
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Row from 'react-bootstrap/esm/Row';
import Col from 'react-bootstrap/esm/Col';
import ListGroup from 'react-bootstrap/esm/ListGroup';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import ListGroupItem from 'react-bootstrap/esm/ListGroupItem';
import {
    FaArrowLeft,
    FaClipboardCheck,
    FaInfoCircle,
    FaFingerprint,
    FaAlignLeft,
    FaTag,
    FaUserShield,
    FaUserCheck,
    FaCalendarAlt,
    FaClipboardList,
    FaCogs,
    FaSyncAlt,
    FaFileUpload,
    FaFileAlt,
    FaCommentDots,
    FaRegComment
} from 'react-icons/fa';

function TaskDetail() {
    const { taskId } = useParams(); // Get taskId from URL
    const [task, setTask] = useState(null);
    const [requirementDetails, setRequirementDetails] = useState(null); // State for requirement details
    const [users, setUsers] = useState([]); // State to store users
    const [comments, setComments] = useState([]); // New state for comments
    const [newComment, setNewComment] = useState(''); // New state for new comment text
    const [evidenceList, setEvidenceList] = useState([]); // New state for evidence
    const [selectedFile, setSelectedFile] = useState(null); // New state for file upload
    const [currentStatus, setCurrentStatus] = useState(''); // New state for status editing

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [commentError, setCommentError] = useState('');
    const [evidenceError, setEvidenceError] = useState('');
    const [statusError, setStatusError] = useState('');

    const getStatusColor = (status) => {
        switch (status) {
            case 'Closed': return 'success';
            case 'Open': return 'primary';
            case 'In Progress': return 'info';
            case 'Pending Review': return 'warning';
            case 'Failed': return 'danger';
            default: return 'secondary';
        }
    };


    const fetchData = useCallback(async () => {
        if (!taskId) {
            setError('Task ID is missing.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const taskPromise = getTaskById(taskId);
            const usersPromise = getUsers();
            const commentsPromise = getCommentsByMasterTaskId(taskId); // Corrected
            const evidencePromise = getEvidenceByTaskId(taskId);

            const [taskResponse, usersResponse, commentsResponse, evidenceResponse] = await Promise.all([
                taskPromise, usersPromise, commentsPromise, evidencePromise
            ]);

            // Process task data
            if (taskResponse.data) {
                setTask(taskResponse.data);
                // If task has a requirementId, fetch its details
                if (taskResponse.data.requirementId) {
                    try {
                        // TODO: Consider making this part of the initial Promise.all if always needed
                        const reqResponse = await getRequirementById(taskResponse.data.requirementId);
                        if (reqResponse.data) {
                            setRequirementDetails(reqResponse.data);
                        } else {
                            console.warn(`Requirement with ID ${taskResponse.data.requirementId} not found.`);
                            setRequirementDetails(null); 
                        }
                    } catch (reqErr) {
                        console.error("Error fetching requirement details:", reqErr);
                        // Optionally set a specific error for requirement fetching, or add to existing error
                        setRequirementDetails(null);
                    }
                } else {
                    setRequirementDetails(null); // No requirement ID, so no details to fetch
                }
                setCurrentStatus(taskResponse.data.status); // Initialize currentStatus
            } else {
                setError('Task not found.');
            }

            if (usersResponse.data) {
                setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
            } else {
                console.warn("No data in users response or response format unexpected for TaskDetail", usersResponse);
                setUsers([]);
            }

            if (commentsResponse.data) {
                setComments(Array.isArray(commentsResponse.data) ? commentsResponse.data : []);
            } else {
                console.warn("No data in comments response or response format unexpected", commentsResponse);
                setComments([]);
            }

            if (evidenceResponse.data) {
                setEvidenceList(Array.isArray(evidenceResponse.data) ? evidenceResponse.data : []);
            } else {
                console.warn("No data in evidence response or response format unexpected", evidenceResponse);
                setEvidenceList([]);
            }

        } catch (err) {
            console.error("Error fetching task details, users, comments, or evidence:", err);
            setError('Failed to fetch all task related data. Some sections might be incomplete.');
            setTask(null); // Ensure task is null on error
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        if (taskId) {
            fetchData();
        }
    }, [taskId, fetchData]);

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === "Closed") return false;
        return new Date(dueDate) < new Date() && new Date(dueDate).setHours(0,0,0,0) !== new Date().setHours(0,0,0,0) ;
    };

    const getUserDetails = (userId) => {
        if (!userId || !users || users.length === 0) return null;
        return users.find(user => user.id === userId);
    };

    const renderUserWithPopover = (userId, defaultText = 'N/A') => {
        if (!userId) return defaultText;
        const user = getUserDetails(userId);
        if (!user) return userId; // Fallback to ID if user not found

        const userPopover = (
            <Popover id={`popover-user-${user.id}-${defaultText.toLowerCase().replace(' ', '-')}`}>
                <Popover.Header as="h3">{user.name}</Popover.Header>
                <Popover.Body>
                    <strong>Email:</strong> {user.email || 'N/A'}<br />
                    <strong>ID:</strong> {user.id}
                </Popover.Body>
            </Popover>
        );
        return <OverlayTrigger placement="top" overlay={userPopover} delay={{ show: 250, hide: 400 }}><span>{user.name}</span></OverlayTrigger>;
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) {
            setCommentError("Comment cannot be empty.");
            return;
        }
        setCommentError('');
        try {
            // Assuming loggedInUserId is available or fetched from auth context
            const loggedInUserId = "36a95829-f890-43dc-aff3-289c50ce83c2"; // Placeholder
            const commentData = { text: newComment, userId: loggedInUserId };
            const response = await addCommentToMasterTask(taskId, commentData); // Corrected
            setComments(prevComments => [...prevComments, response.data]);
            setNewComment('');
        } catch (err) {
            console.error("Error adding comment:", err);
            setCommentError("Failed to add comment.");
        }
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setEvidenceError('');
    };

    const handleEvidenceUpload = async () => {
        if (!selectedFile) {
            setEvidenceError("Please select a file to upload.");
            return;
        }
        setEvidenceError('');
        const formData = new FormData();
        formData.append('file', selectedFile);
        // formData.append('description', 'Optional description'); // Add other fields if needed

        try {
            const response = await uploadEvidenceToTask(taskId, formData);
            setEvidenceList(prevEvidence => [...prevEvidence, response.data]);
            setSelectedFile(null); // Clear the selected file
            // Optionally clear the file input visually: e.target.value = null; (if e is available)
        } catch (err) {
            console.error("Error uploading evidence:", err);
            setEvidenceError(`Failed to upload evidence. ${err.response?.data?.error || ''}`);
        }
    };

    const handleStatusUpdate = async () => {
        if (currentStatus === task.status) {
            // setStatusError("Status is already set to this value."); // Optional: notify user
            return;
        }
        setStatusError('');
        try {
            const updatedTaskData = { ...task, status: currentStatus };
            const response = await updateTask(taskId, updatedTaskData); // Or a more specific updateTaskStatus(taskId, { status: currentStatus })
            setTask(response.data); // Update local task state with the full response
            // Optionally show a success message
        } catch (err) {
            console.error("Error updating status:", err);
            setStatusError("Failed to update status.");
            setCurrentStatus(task.status); // Revert to original status on error
        }
    };

    if (loading) {
        return (
            <div className="text-center mt-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading task details...</span>
                </Spinner>
                <p>Loading task details...</p>
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger" className="mt-3">{error}</Alert>;
    }

    if (!task) {
        return <Alert variant="warning" className="mt-3">Task data not available.</Alert>;
    }

    return (
        <div>
            
            <Button as={Link} to="/my-tasks" variant="outline-primary" size="sm" className="mb-3">
                <FaArrowLeft className="me-1" /> Back to My Tasks
            </Button>
            {task && (
            <Row>
                <Col md={12}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="mb-0"><FaClipboardCheck className="me-2 text-primary" />{task.title}</h2>
                    <div>
                        {isOverdue(task.dueDate, task.status) && (
                            <Badge bg="danger" className="me-2 fs-6">Overdue</Badge>
                        )}
                        <Badge bg={getStatusColor(task.status)} className="fs-6">
                            {task.status}
                        </Badge>
                    </div>
                </div>
                <small className="text-muted d-block mb-3">
                    Created: {new Date(task.createdAt).toLocaleString()} | Last Updated: {new Date(task.updatedAt).toLocaleString()}
                </small>
                </Col>
                <Col md={8} className='border-end'>
               
                    <Tabs defaultActiveKey="details" id="task-detail-tabs" className="nav-line-tabs mb-3 ">
                        <Tab eventKey="details" title={<><FaInfoCircle className="me-1" />Details</>}>
                            <Card>
                                {/* Card.Header removed as title/status is now above tabs */}
                                <Card.Body>
                                    <Card.Text><FaFingerprint className="me-2 text-muted"/><strong>ID:</strong> {task.id}</Card.Text>
                                    <Card.Text><FaAlignLeft className="me-2 text-muted"/><strong>Description:</strong> {task.description || 'N/A'}</Card.Text>
                                    <Card.Text><FaTag className="me-2 text-muted"/><strong>Category:</strong> {task.category || 'N/A'}</Card.Text>
                                    <hr />
                                    <Card.Text><FaUserShield className="me-2 text-muted"/><strong>Owner:</strong> {renderUserWithPopover(task.ownerUserId, task.ownerUserId)}</Card.Text>
                                    <Card.Text><FaUserCheck className="me-2 text-muted"/><strong>Assignee:</strong> {renderUserWithPopover(task.assigneeUserId)}</Card.Text>
                                    <Card.Text><FaCalendarAlt className="me-2 text-muted"/><strong>Due Date:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</Card.Text>
                                    <Card.Text>
                                        <FaClipboardList className="me-2 text-muted"/><strong>Requirement ID:</strong> {task.requirementId || 'N/A'}
                                        {requirementDetails && (
                                            <Card bg="light" text="dark" className="mt-2 p-2" style={{ fontSize: '0.9em' }}>
                                                <small>
                                                    <strong>Control Ref:</strong> {requirementDetails.controlIdReference || 'N/A'}<br/>
                                                    <strong>Text:</strong> {requirementDetails.requirementText || 'N/A'}<br/>
                                                    <strong>Standard ID:</strong> {requirementDetails.standardId || 'N/A'}
                                                </small>
                                            </Card>
                                        )}
                                    </Card.Text>
                                    <hr />
                                    {task.checkType && (
                                        <>
                                            <h5><FaCogs className="me-2 text-muted"/>Automated Check Details</h5>
                                            <Card.Text className="ps-1"><strong>Check Type:</strong> {task.checkType}</Card.Text>
                                            <Card.Text className="ps-1"><strong>Target:</strong> {task.target || 'N/A'}</Card.Text>
                                            <Card.Text className="ps-1"><strong>Parameters:</strong> {task.parameters ? JSON.stringify(task.parameters) : 'None'}</Card.Text>
                                        </>
                                    )}
                                </Card.Body>
                                {/* Card.Footer removed as timestamps are above tabs */}
                            </Card>
                        </Tab>
                        <Tab eventKey="status" title={<><FaSyncAlt className="me-1" />Status</>}>
                            <Card>
                                {/* <Card.Header as="h5">Update Status</Card.Header> */}
                                <Card.Body>
                                    {statusError && <Alert variant="danger" onClose={() => setStatusError('')} dismissible>{statusError}</Alert>}
                                    <Form.Group as={Row} className="mb-3 align-items-center">
                                        <Form.Label column sm={4} md={3} lg={2}>
                                            Current Status:
                                        </Form.Label>
                                        <Col sm={8} md={6} lg={7}>
                                            <Form.Select 
                                                value={currentStatus} 
                                                onChange={(e) => setCurrentStatus(e.target.value)}
                                                aria-label="Select task status"
                                            >
                                                <option value="Open">Open</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Pending Review">Pending Review</option>
                                                <option value="Closed">Closed</option>
                                                <option value="Failed">Failed</option>
                                            </Form.Select>
                                        </Col>
                                        <Col sm={12} md={3} lg={3} className="mt-2 mt-md-0">
                                            <Button onClick={handleStatusUpdate} disabled={currentStatus === task.status} className="w-100">Update Status</Button>
                                        </Col>
                                    </Form.Group>
                                </Card.Body>
                            </Card>
                        </Tab>
                        <Tab eventKey="evidence" title={<><FaFileUpload className="me-1" />Evidence</>}>
                            <Card>
                                {/* <Card.Header as="h5">Evidence</Card.Header> */}
                                <Card.Body>
                                    {evidenceError && <Alert variant="danger" onClose={() => setEvidenceError('')} dismissible>{evidenceError}</Alert>}
                                    
                                    <div className='bg-light p-3 rounded-3 mb-3'>
                                    <Form.Group controlId="evidenceFile" className="mb-3">
                                        <Form.Label><FaFileUpload className="me-1"/>Upload New Evidence</Form.Label>
                                        <Form.Control type="file" onChange={handleFileChange} />
                                    </Form.Group>
                                    <Button onClick={handleEvidenceUpload} disabled={!selectedFile} className="mb-3">Upload File</Button>
                                    </div>

                                    <h6>Existing Evidence:</h6>
                                    {evidenceList.length > 0 ? (
                                        <ListGroup variant="flush">
                                            {evidenceList.map(ev => (
                                                <ListGroup.Item key={ev.id}>
                                                    <FaFileAlt className="me-2 text-muted"/>
                                                    {/* Assuming ev.filePath is the path on server, construct a link if you serve them */}
                                                    {/* For now, just displaying filename. If ev.url is available, use that. */}
                                                    <a href={ev.filePath.startsWith('http') ? ev.filePath : `/${ev.filePath}`} target="_blank" rel="noopener noreferrer">{ev.fileName || ev.id}</a>
                                                    <small className="text-muted d-block">Uploaded: {ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleString() : 'N/A'}</small>
                                                    {ev.description && <p className="mb-0 mt-1"><small>Description: {ev.description}</small></p>}
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : (
                                        <p className="text-muted">No evidence uploaded yet.</p>
                                    )}
                                </Card.Body>
                            </Card>
                        </Tab>
                    </Tabs>
                </Col>
                <Col md={4}>
                    <Card>
                        <Card.Header as="h5"><FaCommentDots className="me-1"/>Comments</Card.Header>
                        <Card.Body>
                            {commentError && <Alert variant="danger" onClose={() => setCommentError('')} dismissible>{commentError}</Alert>}
                            <Form onSubmit={handleCommentSubmit} className="mb-3 p-3 bg-light">
                                <Form.Group className="mb-2" controlId="newCommentText">
                                    <Form.Label>Add a comment:</Form.Label>
                                    <Form.Control as="textarea" rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Type your comment here..." />
                                </Form.Group>
                                <Button type="submit" variant="primary" className='btn-sm w-100 mt-2'>Post Comment</Button>
                            </Form>
                            <ListGroup variant='flush'>
                            {comments.length > 0 ? comments.map(comment => (
                                <ListGroupItem key={comment.id} className="pb-2">
                                    <FaRegComment className="me-2 text-muted" style={{float: 'left', marginTop: '0.25em'}}/>
                                    <p className="mb-0">{comment.text}</p>
                                    <small className="text-muted">By: {renderUserWithPopover(comment.userId, comment.userName || 'Unknown User')} on {new Date(comment.createdAt).toLocaleString()}</small>
                                </ListGroupItem>
                            )) : <p className="text-muted p-2">No comments yet.</p>}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
             )}

        </div>
    );
}

export default TaskDetail;
