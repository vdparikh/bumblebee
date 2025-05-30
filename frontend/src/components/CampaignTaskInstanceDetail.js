import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
    getCampaignTaskInstanceById,
    getUsers,
    getCommentsByCampaignTaskInstanceId,
    addCommentToCampaignTaskInstance,
    getEvidenceByCampaignTaskInstanceId,
    addGenericEvidenceToCampaignTaskInstance, // New for text/link
    uploadEvidenceToCampaignTaskInstance,
    updateCampaignTaskInstance,
    executeCampaignTaskInstance, // New API for execution
    getCampaignTaskInstanceResults, // New API for results
} from '../services/api'; // Assuming getStatusColor is imported if not already
import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListGroup from 'react-bootstrap/ListGroup';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Dropdown from 'react-bootstrap/Dropdown'; // Added for status dropdown
import {
    FaArrowLeft,
    FaClipboardCheck,
    FaInfoCircle,
    FaLink,
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
    FaBullhorn,
    FaPlayCircle, // For execute icon
    FaPoll, // For results icon
    FaExclamationCircle, // For Priority
    FaFileMedicalAlt, // For Evidence Types

} from 'react-icons/fa';
import { ListGroupItem } from 'react-bootstrap';
import { getStatusColor as getStatusColorUtil } from '../utils/displayUtils'; // Assuming this is the path
import { useAuth } from '../contexts/AuthContext';
import UserDisplay from './common/UserDisplay';

import CommentSection from './common/CommentSection'; // Import the new component

function CampaignTaskInstanceDetail() {
    const { currentUser } = useAuth();
    const { instanceId } = useParams();
    const location = useLocation(); // Get location object
    const [taskInstance, setTaskInstance] = useState(null);
    const [users, setUsers] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [evidenceList, setEvidenceList] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [evidenceType, setEvidenceType] = useState('file'); // 'file', 'link', or 'text'
    const [evidenceLink, setEvidenceLink] = useState('');
    const [evidenceText, setEvidenceText] = useState('');
    const [evidenceDescription, setEvidenceDescription] = useState(''); // Common description field

    // const [currentStatus, setCurrentStatus] = useState(''); // No longer needed as status is directly updated
    const [executionResults, setExecutionResults] = useState([]); // New state for execution results

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [commentError, setCommentError] = useState('');
    const [addEvidenceError, setAddEvidenceError] = useState(''); // Consolidated error for adding evidence
    const [evidenceError, setEvidenceError] = useState('');
    const [statusError, setStatusError] = useState('');
    const [executionError, setExecutionError] = useState(''); // New
    const [executionSuccess, setExecutionSuccess] = useState(''); // New
    const [loadingResults, setLoadingResults] = useState(false); // New

    // User can edit basic task details (like status) if they are admin, auditor, or the assigned user.
    const canUpdateTaskStatus = useMemo(() => {
        if (!currentUser || !taskInstance) return false;
        return currentUser.role === 'admin' ||
            currentUser.role === 'auditor' ||
            (currentUser.role === 'user' && taskInstance.assignee_user_id === currentUser.id);
    }, [currentUser, taskInstance]);

    // Only admin/auditor can manage evidence and execute automated tasks.
    const canManageEvidenceAndExecution = useMemo(() => {
        if (!currentUser || !taskInstance) return false;
        return currentUser.role === 'admin' ||
            currentUser.role === 'auditor' ||
            (currentUser.role === 'user' && taskInstance.owners && taskInstance.owners.some(owner => owner.id === currentUser.id));
    }, [currentUser, taskInstance]);

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
        if (!instanceId) {
            setError('Task Instance ID is missing.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const taskInstancePromise = getCampaignTaskInstanceById(instanceId);
            const usersPromise = getUsers();
            const commentsPromise = getCommentsByCampaignTaskInstanceId(instanceId);
            const evidencePromise = getEvidenceByCampaignTaskInstanceId(instanceId);
            // Results are not fetched initially, but on demand or after execution
            const [taskResponse, usersResponse, commentsResponse, evidenceResponse] = await Promise.allSettled([
                taskInstancePromise, usersPromise, commentsPromise, evidencePromise
            ]);
            if (taskResponse.status === 'fulfilled' && taskResponse.value.data) {
                setTaskInstance(taskResponse.value.data); // Corrected: Access data from taskResponse.value
                // setCurrentStatus(taskResponse.value.data.status); // No longer needed
            } else {
                setError('Task Instance not found.');
            }

            setUsers(usersResponse.status === 'fulfilled' && Array.isArray(usersResponse.value.data) ? usersResponse.value.data : []);
            setComments(commentsResponse.status === 'fulfilled' && Array.isArray(commentsResponse.value.data) ? commentsResponse.value.data : []);
            setEvidenceList(evidenceResponse.status === 'fulfilled' && Array.isArray(evidenceResponse.value.data) ? evidenceResponse.value.data : []);

        } catch (err) {
            console.error("Error fetching campaign task instance details:", err);
            setError('Failed to fetch task instance data. ' + (err.response?.data?.error || err.message));
            setTaskInstance(null);
        } finally {
            setLoading(false);
        }
    }, [instanceId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === "Closed") return false;
        return new Date(dueDate) < new Date() && new Date(dueDate).setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0);
    };

    const getUserDetails = (userId) => users.find(user => user.id === userId);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) {
            setCommentError("Comment cannot be empty.");
            return;
        }
        setCommentError('');
        try {
            const commentData = { text: newComment, userId: currentUser.id };
            const response = await addCommentToCampaignTaskInstance(instanceId, commentData);
            setComments(prevComments => [...prevComments, response.data]);
            setNewComment('');
        } catch (err) {
            console.error("Error adding comment:", err);
            setCommentError("Failed to add comment. " + (err.response?.data?.error || ''));
        }
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setAddEvidenceError('');
    };

    const resetEvidenceForm = () => {
        setSelectedFile(null);
        setEvidenceLink('');
        setEvidenceText('');
        setEvidenceDescription('');
        // setEvidenceType('file'); // Optionally reset type or keep current
        if (document.getElementById('evidenceFile')) {
            document.getElementById('evidenceFile').value = null;
        }
    };

    const handleAddEvidence = async () => {
        setAddEvidenceError('');
        let evidencePayload = {
            description: evidenceDescription,
            // uploader_user_id would be set by backend based on auth
        };
        let response;

        try {
            if (evidenceType === 'file') {
                if (!selectedFile) {
                    setAddEvidenceError("Please select a file to upload.");
                    return;
                }
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('description', evidenceDescription); // Send description with file
                response = await uploadEvidenceToCampaignTaskInstance(instanceId, formData);
            } else if (evidenceType === 'link') {
                if (!evidenceLink.trim()) {
                    setAddEvidenceError("Please enter a valid URL for the link.");
                    return;
                }
                evidencePayload.file_path = evidenceLink; // Use file_path for URL
                evidencePayload.file_name = "Link Evidence"; // Or derive from URL/description
                evidencePayload.mime_type = "text/url"; // Custom type for links
                response = await addGenericEvidenceToCampaignTaskInstance(instanceId, evidencePayload);
            } else if (evidenceType === 'text') {
                if (!evidenceText.trim()) {
                    setAddEvidenceError("Please enter the evidence text/description.");
                    return;
                }
                // For text, the main content is in the description.
                // We can use the existing description field in the payload.
                // If you need a separate field for "text content" vs "description of text content", adjust model and payload.
                evidencePayload.description = evidenceText; // Overwrite if general description was also filled
                evidencePayload.mime_type = "text/plain";
                response = await addGenericEvidenceToCampaignTaskInstance(instanceId, evidencePayload);
            }
            setEvidenceList(prevEvidence => [...prevEvidence, response.data]);
            resetEvidenceForm();
        } catch (err) {
            console.error("Error adding evidence:", err);
            setAddEvidenceError(`Failed to add evidence. ${err.response?.data?.error || 'Please try again.'}`);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!taskInstance || newStatus === taskInstance.status) return;
        setStatusError('');
        try {
            const updatedTaskData = { status: newStatus };
            const response = await updateCampaignTaskInstance(instanceId, updatedTaskData);
            setTaskInstance(response.data); // Update local task state with the full response
        } catch (err) {
            console.error("Error updating status:", err);
            setStatusError("Failed to update status. " + (err.response?.data?.error || ''));
            // No need to revert currentStatus state as it's removed
        }
    };

    const handleExecuteInstance = async () => {
        setExecutionError('');
        setExecutionSuccess('');
        setLoadingResults(true); // Indicate activity
        try {
            const response = await executeCampaignTaskInstance(instanceId);
            setExecutionSuccess(response.data.message || "Execution triggered successfully. Results will be available shortly.");
            // Optionally, fetch results immediately or prompt user to refresh
            await fetchInstanceResults(); // Fetch results after triggering
        } catch (err) {
            console.error("Error executing task instance:", err);
            setExecutionError(`Failed to execute task. ${err.response?.data?.error || ''}`);
        } finally {
            setLoadingResults(false);
        }
    };

    const fetchInstanceResults = async () => {
        setExecutionError('');
        setLoadingResults(true);
        try {
            const response = await getCampaignTaskInstanceResults(instanceId);
            setExecutionResults(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Error fetching execution results:", err);
            setExecutionError(`Failed to fetch execution results. ${err.response?.data?.error || ''}`);
            setExecutionResults([]);
        } finally {
            setLoadingResults(false);
        }
    };
    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /><p>Loading task instance details...</p></div>;
    if (error) return <Alert variant="danger" className="mt-3">{error}</Alert>;
    if (!taskInstance) return <Alert variant="warning" className="mt-3">Task Instance data not available.</Alert>;

    // Determine the "Back" button's link and text
    let backLinkTarget = location.state?.from;
    let backButtonText = "Back";

    if (backLinkTarget) {
        if (backLinkTarget === '/my-tasks') {
            backButtonText = "Back to My Tasks";
        } else if (backLinkTarget.startsWith('/campaigns/')) {
            backButtonText = "Back to Campaign";
        }
        // If 'from' is something else, it will say "Back" and go to that 'from' location.
    } else {
        // Fallback if 'from' state is not available
        backLinkTarget = taskInstance.campaign_id ? `/campaigns/${taskInstance.campaign_id}` : "/my-tasks";
        backButtonText = taskInstance.campaign_id ? "Back to Campaign" : "Back to My Tasks";
    }

        const getPriorityBadgeColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'critical': return 'danger';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'secondary';
            default: return 'light';
        }
    };


    return (
        <div>
            {/* <Button as={Link} to={backLinkTarget} variant="outline-dark" size="sm" className="mb-3">
                <FaArrowLeft className="me-1" /> {backButtonText}
            </Button> */}

            <Row>
                <Col md={12}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h2 className="mb-0"><FaClipboardCheck className="me-2 text-primary" />{taskInstance.title}</h2>
                        <div>
                            {isOverdue(taskInstance.due_date, taskInstance.status) && <Badge bg="danger" className="me-2 fs-6">Overdue</Badge>}
                            <Dropdown>
                                <Dropdown.Toggle variant={getStatusColor(taskInstance.status)} id="dropdown-status" size="sm" className="fs-6">
                                    {taskInstance.status}
                                </Dropdown.Toggle>
                                <Dropdown.Menu disabled={!canUpdateTaskStatus}>
                                    <Dropdown.Item onClick={() => handleStatusUpdate('Open')} active={taskInstance.status === 'Open'}>Open</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleStatusUpdate('In Progress')} active={taskInstance.status === 'In Progress'}>In Progress</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleStatusUpdate('Pending Review')} active={taskInstance.status === 'Pending Review'}>Pending Review</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleStatusUpdate('Closed')} active={taskInstance.status === 'Closed'}>Closed</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleStatusUpdate('Failed')} active={taskInstance.status === 'Failed'}>Failed</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>
                    <small className="text-muted d-block mb-3">
                        Campaign: <Link to={`/campaigns/${taskInstance.campaign_id}`}>{taskInstance.campaign_name || taskInstance.campaign_id}</Link> |
                        Created: {new Date(taskInstance.created_at).toLocaleString()} |
                        Last Updated: {new Date(taskInstance.updated_at).toLocaleString()}
                    </small>
                </Col>
                <Col md={8} className='border-end'>
                    <Tabs defaultActiveKey="details" id="task-instance-detail-tabs" className="nav-line-tabs mb-3">
                        <Tab eventKey="details" title={<><FaInfoCircle className="me-1" />Details</>}>
                            <Card><Card.Body>
                                    {taskInstance.description || 'N/A'}
                            </Card.Body>
                                <ListGroup variant='flush'>

                                    <ListGroupItem>
                                        <FaTag className="me-2 text-muted" /><strong>Category:</strong> 
                                        
 {taskInstance.category && (
                        <Badge pill bg="light" text="dark" className="fw-normal ms-2 border"><FaTag className="me-1" />{taskInstance.category}</Badge>
                    )}
                    {taskInstance.requirement_control_id_reference && (
                        <Badge pill bg="light" text="dark" className="fw-normal border">Req: {taskInstance.requirement_control_id_reference}</Badge>
                    )}

                                        </ListGroupItem>
                                    <ListGroupItem>
                                        <FaUserShield className="me-2 text-muted" /><strong className='me-2'>Owner(s):</strong>
                                        {taskInstance.owners && taskInstance.owners.length > 0 ?
                                            taskInstance.owners.map((owner, index) => (
                                                <React.Fragment key={owner.id}>
                                                    {/* Using UserDisplay directly for consistency if renderUserWithPopover is not needed for other specific logic */}
                                                    <UserDisplay userId={owner.id} userName={owner.name} allUsers={users} />
                                                    {index < taskInstance.owners.length - 1 && ' '}
                                                </React.Fragment>
                                            )) : ' N/A'}
                                    </ListGroupItem>
                                    <ListGroupItem><FaUserCheck className="me-2 text-muted" /><strong className="me-1">Assignee:</strong>

                                        <UserDisplay userId={taskInstance.assignee_user_id} userName={taskInstance.assignee_user_id} allUsers={users} />
                                        {/* renderUserWithPopover is replaced by UserDisplay */}

                                    </ListGroupItem>
                                    <ListGroupItem>
                                        <FaExclamationCircle className="me-2 text-muted" /><strong>Priority:</strong>
                                        {taskInstance.defaultPriority ? <Badge bg={getPriorityBadgeColor(taskInstance.defaultPriority)} className="ms-2">{taskInstance.defaultPriority}</Badge> : ' N/A'}
                                    </ListGroupItem>
                                    <ListGroupItem>
                                        <FaFileMedicalAlt className="me-2 text-muted" /><strong>Expected Evidence:</strong>
                                             {taskInstance.evidenceTypesExpected && taskInstance.evidenceTypesExpected.length > 0 ?
                                            taskInstance.evidenceTypesExpected.map((evidenceType, index) => (
                                                <React.Fragment key={evidenceType}>
                                                
                                                 <Badge variant="info" className='me-1 ms-1'>{evidenceType}</Badge>
                                                    
                                                </React.Fragment>
                                            )) : ' N/A'}
                                    </ListGroupItem>
                                    <ListGroupItem><FaCalendarAlt className="me-2 text-muted" /><strong>Due Date:</strong> {taskInstance.due_date ? new Date(taskInstance.due_date).toLocaleDateString() : 'N/A'}</ListGroupItem>
                                    <ListGroupItem>
                                        <FaClipboardList className="me-2 text-muted" /><strong>Requirement:</strong> 
                                        
                                        {/* {taskInstance.requirement_control_id_reference || 'N/A'}
                                        {taskInstance.requirement_control_id_reference && (
                                            <OverlayTrigger
                                                placement="top"
                                                delay={{ show: 250, hide: 400 }}
                                                overlay={
                                                    <Popover id={`popover-req-details-${taskInstance.id}`} style={{ maxWidth: '600px', minWidth: '300px' }}>
                                                        <Popover.Header as="h3">{taskInstance.requirement_control_id_reference} ({taskInstance.requirement_standard_name || 'Standard N/A'})</Popover.Header>
                                                        <Popover.Body>
                                                            <p style={{ whiteSpace: 'pre-wrap' }}>{taskInstance.requirement_text || 'No detailed text available.'}</p>
                                                        </Popover.Body>
                                                    </Popover>
                                                }
                                            >
                                                <Button variant="link" size="sm" className="p-0 ms-1 align-baseline"><FaInfoCircle /></Button>
                                            </OverlayTrigger>
                                        )} */}

<h6 className='mt-3'>{taskInstance.requirement_control_id_reference} - {taskInstance.requirement_standard_name || 'Standard N/A'}</h6>
                                         <p className='mt-2 text-muted' style={{ whiteSpace: 'pre-wrap' }}>{taskInstance.requirement_text || 'No detailed text available.'}</p>


                                    </ListGroupItem>
                                    {taskInstance.check_type && (
                                        <>
                                            <h5><FaCogs className="me-2 text-muted" />Automated Check Details</h5>
                                            <Card.Text className="ps-1"><strong>Check Type:</strong> {taskInstance.check_type}</Card.Text>
                                            <Card.Text className="ps-1"><strong>Target:</strong> {taskInstance.target || 'N/A'}</Card.Text>
                                            <Card.Text className="ps-1"><strong>Parameters:</strong> {taskInstance.parameters ? JSON.stringify(taskInstance.parameters) : 'None'}</Card.Text>
                                        </>
                                    )}
                                </ListGroup>
                                <Card.Footer>
                                    <strong>Instance ID:</strong> {taskInstance.id}

                                </Card.Footer>
                            </Card>
                        </Tab>
                        <Tab eventKey="evidence" title={<><FaFileUpload className="me-1" />Evidence</>}>

                        
                            <Card>
                                <Card.Header as="h5">Add New Evidence</Card.Header>
                                <Card.Body>
                                {canManageEvidenceAndExecution ? (
                                    <>
                                        {addEvidenceError && <Alert variant="danger" onClose={() => setAddEvidenceError('')} dismissible>{addEvidenceError}</Alert>}
                                        <div className=''>
                                            

<FaFileMedicalAlt className="me-2 text-muted" /><strong>Expected Evidence:</strong>
                                             {taskInstance.evidenceTypesExpected && taskInstance.evidenceTypesExpected.length > 0 ?
                                            taskInstance.evidenceTypesExpected.map((evidenceType, index) => (
                                                <React.Fragment key={evidenceType}>
                                                
                                                 <Badge variant="info" className='me-1 ms-1'>{evidenceType}</Badge>
                                                    
                                                </React.Fragment>
                                            )) : ' N/A'}

                                            <Form.Group className="mt-3 mb-3">
                                                <Form.Label>Evidence Type:</Form.Label>
                                                <div>
                                                    <Form.Check inline label="File" name="evidenceType" type="radio" id="evidence-type-file" value="file" checked={evidenceType === 'file'} onChange={(e) => setEvidenceType(e.target.value)} />
                                                    <Form.Check inline label="Link (URL)" name="evidenceType" type="radio" id="evidence-type-link" value="link" checked={evidenceType === 'link'} onChange={(e) => setEvidenceType(e.target.value)} />
                                                    <Form.Check inline label="Text" name="evidenceType" type="radio" id="evidence-type-text" value="text" checked={evidenceType === 'text'} onChange={(e) => setEvidenceType(e.target.value)} />
                                                </div>
                                            </Form.Group>

                                            {evidenceType === 'file' && (
                                                <Form.Group controlId="evidenceFile" className="mb-3">
                                                    <Form.Label><FaFileUpload className="me-1" />Select File</Form.Label>
                                                    <Form.Control type="file" onChange={handleFileChange} />
                                                </Form.Group>
                                            )}
                                            {evidenceType === 'link' && (
                                                <Form.Group controlId="evidenceLink" className="mb-3">
                                                    <Form.Label>Link URL</Form.Label>
                                                    <Form.Control type="url" placeholder="https://example.com/evidence" value={evidenceLink} onChange={(e) => setEvidenceLink(e.target.value)} />
                                                </Form.Group>
                                            )}
                                            {evidenceType === 'text' && (
                                                <Form.Group controlId="evidenceText" className="mb-3">
                                                    <Form.Label>Evidence Text/Details</Form.Label>
                                                    <Form.Control as="textarea" rows={3} placeholder="Describe the evidence or paste text here..." value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} />
                                                </Form.Group>
                                            )}
                                            <Form.Group controlId="evidenceDescription" className="mb-3">
                                                <Form.Label>General Description (Optional)</Form.Label>
                                                <Form.Control as="textarea" rows={2} placeholder="Optional: Describe this piece of evidence..." value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} />
                                            </Form.Group>

                                            <Button variant='success' onClick={handleAddEvidence} className="w-100 mb-3">Add Evidence</Button>
                                        </div>
                                    </>
                                ) : (
                                    <Alert variant="info">Evidence management is restricted.</Alert>
                                )}

                            </Card.Body>
</Card>
                                {evidenceList.length > 0 ? (
                                    <div>
                                        <h6 className='mt-3 p-3'>Existing Evidences</h6>
                                        {evidenceList.map(evidence => {
                                            let icon = <FaFileAlt className="me-2 text-muted" />;
                                            let mainDisplay = evidence.file_name || evidence.id; // Default
                                            let showSeparateDescription = true;

                                            if (evidence.mimeType === 'text/url') {
                                                icon = <FaLink className="me-2 text-primary" />;
                                                const linkText = evidence.description || evidence.fileName || evidence.filePath;
                                                mainDisplay = <a href={evidence.filePath} target="_blank" rel="noopener noreferrer">{linkText}</a>;
                                                showSeparateDescription = !evidence.description; // Only show separate if description wasn't used as link text
                                            } else if (evidence.mimeType === 'text/plain') {
                                                icon = <FaAlignLeft className="me-2 text-info" />;
                                                mainDisplay = <span style={{ whiteSpace: 'pre-wrap' }}>{evidence.description || 'No text content'}</span>;
                                                showSeparateDescription = false;
                                            } else if (evidence.filePath) { // Assumed to be a file
                                                // Icon remains default FaFileAlt or could be more specific based on actual mime_type
                                                mainDisplay = <a href={`http://localhost:8080/${evidence.filePath}`} target="_blank" rel="noopener noreferrer">{evidence.fileName || evidence.id}</a>;
                                            }

                                            return (
                                                <Card className='mb-2' key={evidence.id}>
                                                    <Card.Header>{icon}
                                                    {mainDisplay}
                                                    </Card.Header>
                                                    <Card.Body>
                                                    {showSeparateDescription && evidence.description && <p className="mb-0 mt-1"><small>Description: {evidence.description}</small></p>}
                                                    </Card.Body>
                                                    <Card.Footer>
                                                        <small className="text-muted d-block">Uploaded: {evidence.uploaded_at ? new Date(evidence.uploaded_at).toLocaleString() : 'N/A'}</small>
                                                    </Card.Footer>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                ) : <p className="m-3 alert alert-info text-muted">No evidence uploaded yet.</p>}
                            
                        </Tab>
                        <Tab eventKey="execution" title={<><FaPlayCircle className="me-1" />Execution</>}>
                            <Card><Card.Body>
                                {executionError && <Alert variant="danger" onClose={() => setExecutionError('')} dismissible>{executionError}</Alert>}
                                {executionSuccess && <Alert variant="success" onClose={() => setExecutionSuccess('')} dismissible>{executionSuccess}</Alert>}

                                {canManageEvidenceAndExecution && taskInstance.check_type ? (
                                    <>
                                        <p>This task instance is configured for automated execution.</p>
                                        <Button onClick={handleExecuteInstance} disabled={loadingResults}>
                                            {loadingResults ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" /> Executing...</> : <><FaPlayCircle className="me-1" />Execute Task</>}
                                        </Button>
                                    </>
                                ) : !canManageEvidenceAndExecution ? (
                                    <Alert variant="info">Task execution is restricted.</Alert>
                                ) : !taskInstance.check_type ? (
                                    <Alert variant="info">This task is not configured for automated execution. Please perform manually and update status/evidence.</Alert>
                                ) : (
                                    <Alert variant="info">This task is not configured for automated execution. Please perform manually and update status/evidence.</Alert>
                                )}
                            </Card.Body></Card>
                        </Tab>
                        <Tab eventKey="results" title={<><FaPoll className="me-1" />Results</>}>
                            <Card><Card.Body>
                                <Button onClick={fetchInstanceResults} disabled={loadingResults} className="mb-3">
                                    {loadingResults ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" /> Loading...</> : "Refresh Results"}
                                </Button>
                                {executionResults.length > 0 ? (
                                    <ListGroup variant="flush">
                                        {executionResults.map(res => (
                                            <ListGroup.Item key={res.id}>
                                                <small><strong>Timestamp:</strong> {new Date(res.timestamp).toLocaleString()}</small><br />
                                                <small><strong>Status:</strong> <Badge bg={getStatusColorUtil(res.status)}>{res.status}</Badge></small><br />
                                                <small><strong>Output:</strong></small>
                                                <pre className="bg-dark text-light p-2 rounded mt-1" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8em' }}>{res.output}</pre>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                ) : <p className="text-muted">No execution results available for this task instance. Execute the task or refresh if recently executed.</p>}
                            </Card.Body></Card>
                        </Tab>
                    </Tabs>
                </Col>
                <Col md={4}>
                    <CommentSection
                        comments={comments}
                        allUsers={users}
                        currentUser={currentUser}
                        newComment={newComment}
                        setNewComment={setNewComment}
                        onCommentSubmit={handleCommentSubmit}
                        commentError={commentError}
                        setCommentError={setCommentError}
                    />
                </Col>
            </Row>
        </div>

    );
}

export default CampaignTaskInstanceDetail;