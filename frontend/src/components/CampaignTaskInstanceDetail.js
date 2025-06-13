import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
    getCampaignTaskInstanceById,
    getUsers,
    getCommentsByCampaignTaskInstanceId,
    addCommentToCampaignTaskInstance,
    getEvidenceByCampaignTaskInstanceId,
    addGenericEvidenceToCampaignTaskInstance,
    uploadEvidenceToCampaignTaskInstance,
    updateCampaignTaskInstance,
    executeCampaignTaskInstance, copyEvidenceToCampaignTaskInstance,
    getCampaignTaskInstanceResults,
    getTaskInstancesByMasterTaskId,
    getTaskExecutionStatus,

    reviewEvidence, // Assumed to be added in services/api.js
} from '../services/api';
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
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';

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
    FaPlayCircle,
    FaPoll,
    FaExclamationCircle,
    FaFileMedicalAlt,
    FaTerminal,
    FaPlus,
    FaBookOpen,
    FaThumbsUp, // For Approve
    FaUsers, // For Teams
    FaThumbsDown,
    FaHistory,
    FaFileContract, // For Reject
} from 'react-icons/fa';
import { ListGroupItem } from 'react-bootstrap';
import { getStatusColor as getStatusColorUtil } from '../utils/displayUtils';
import { useAuth } from '../contexts/AuthContext';
import UserDisplay from './common/UserDisplay';
import TeamDisplay from './common/TeamDisplay'; // Import TeamDisplay
import CopyEvidenceModal from './modals/CopyEvidenceModal';

import CommentSection from './common/CommentSection';

function CampaignTaskInstanceDetail() {
    const { currentUser } = useAuth();
    const { instanceId } = useParams();
    const location = useLocation();
    const [taskInstance, setTaskInstance] = useState(null);
    const [users, setUsers] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [evidenceList, setEvidenceList] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [evidenceType, setEvidenceType] = useState('file');
    const [evidenceLink, setEvidenceLink] = useState('');
    const [evidenceText, setEvidenceText] = useState('');
    const [evidenceDescription, setEvidenceDescription] = useState('');
    const [showCopyEvidenceModal, setShowCopyEvidenceModal] = useState(false);
    const [historicalTasks, setHistoricalTasks] = useState([]); // New state for historical tasks

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [evidenceToReview, setEvidenceToReview] = useState(null);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewError, setReviewError] = useState('');

    const [executionResults, setExecutionResults] = useState([]);
    const [executionStatus, setExecutionStatus] = useState(null);
    const [pollingInterval, setPollingInterval] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [commentError, setCommentError] = useState('');
    const [addEvidenceError, setAddEvidenceError] = useState('');
    const [evidenceError, setEvidenceError] = useState('');
    const [statusError, setStatusError] = useState('');
    const [executionError, setExecutionError] = useState('');
    const [executionSuccess, setExecutionSuccess] = useState('');
    const [lastExecutionAttempt, setLastExecutionAttempt] = useState(null);
    const [loadingResults, setLoadingResults] = useState(false);

    const canUpdateTaskStatus = useMemo(() => {
        if (!currentUser || !taskInstance) return false;
        return currentUser.role === 'admin' ||
            currentUser.role === 'auditor' ||
            (currentUser.role === 'user' && taskInstance.owners && taskInstance.owners.some(owner => owner.id === currentUser.id));
    }, [currentUser, taskInstance]);

    const canReviewEvidence = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.role === 'admin' || currentUser.role === 'auditor'; // Or task owners, etc.
    }, [currentUser, taskInstance]);

    const canManageEvidenceAndExecution = useMemo(() => {
        if (!currentUser || !taskInstance) return false;
        return currentUser.role === 'admin' ||
            currentUser.role === 'auditor' ||
            (currentUser.role === 'user' && taskInstance.owners && taskInstance.owners.some(owner => owner.id === currentUser.id));
    }, [currentUser, taskInstance]);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'closed': return 'success';
            case 'open': return 'secondary';
            case 'in progress': return 'info';
            case 'pending review': return 'warning';
            case 'failed': return 'danger';
            case 'success': return 'success';
            case 'error': return 'danger';
            case 'approved': return 'success'; // Review status
            case 'rejected': return 'danger';  // Review status
            case 'pending': return 'warning'; // Review status
            case 'queued': return 'info';     // Execution status
            case 'completed': return 'success'; // Execution status
            case 'running': return 'info';    // Execution status
            default: return 'secondary';
        }
    };

    const handleOpenCopyEvidenceModal = () => {
        setShowCopyEvidenceModal(true);
    };

    const handleCopyEvidenceSubmit = async (selectedEvidenceIds) => {
        if (!instanceId || selectedEvidenceIds.length === 0) {
            setError("Target task instance ID is missing or no evidence selected.");
            return;
        }
        try {
            await copyEvidenceToCampaignTaskInstance(instanceId, selectedEvidenceIds);

            const evidenceResponse = await getEvidenceByCampaignTaskInstanceId(instanceId);
            setEvidenceList(Array.isArray(evidenceResponse.data) ? evidenceResponse.data : []);
            setShowCopyEvidenceModal(false);

        } catch (err) {
            console.error("Error copying evidence:", err);
            setError(`Failed to copy evidence. ${err.response?.data?.error || 'Please try again.'}`);

        }
    };

    const handleAddResultAsEvidence = async (result) => {
        if (!instanceId || !result) {
            setAddEvidenceError("Cannot add result as evidence: Missing task instance ID or result data.");
            return;
        }
        setAddEvidenceError('');

        const evidencePayload = {
            description: "<pre>" + result.output + "</pre>",
            file_name: `Execution Result - ${result.status} - ${new Date(result.timestamp).toISOString()}`,
            mime_type: "text/plain", // Store as plain text
            // review_status: "Pending", // Ideally set by backend on creation
            file_path: null, // No file path for text evidence
        };

        try {
            await addGenericEvidenceToCampaignTaskInstance(instanceId, evidencePayload);
            // Refresh the evidence list after adding
            const evidenceResponse = await getEvidenceByCampaignTaskInstanceId(instanceId);
            setEvidenceList(Array.isArray(evidenceResponse.data) ? evidenceResponse.data : []);
        } catch (err) {
            console.error("Error adding result as evidence:", err);
            setAddEvidenceError(`Failed to add result as evidence. ${err.response?.data?.error || 'Please try again.'}`);
        }
    };

    const handleOpenRejectModal = (evidence) => {
        setEvidenceToReview(evidence);
        setReviewComment('');
        setReviewError('');
        setShowRejectModal(true);
    };

    const handleEvidenceReview = async (evidenceId, status, comment = '') => {
        setReviewError('');
        if (!canReviewEvidence) {
            setReviewError("You do not have permission to review evidence.");
            return;
        }
        try {
            await reviewEvidence(evidenceId, { review_status: status, review_comments: comment });
            // After successful API call, refresh the evidence list to get the updated data
            const evidenceResponse = await getEvidenceByCampaignTaskInstanceId(instanceId);
            setEvidenceList(Array.isArray(evidenceResponse.data) ? evidenceResponse.data : []);

            setShowRejectModal(false); // Close modal if it was open
            setEvidenceToReview(null);
            // Optionally, show a success message
        } catch (err) {
            console.error("Error reviewing evidence:", err);
            setReviewError(`Failed to review evidence. ${err.response?.data?.error || 'Please try again.'}`);
        }
    };

    const fetchHistoricalTasks = useCallback(async (masterTaskId) => {
        if (!masterTaskId) return;
        try {
            const response = await getTaskInstancesByMasterTaskId(masterTaskId);
            if (response.data) {
                // Filter out the current instance from the historical list
                setHistoricalTasks(Array.isArray(response.data) ? response.data.filter(t => t.id !== instanceId) : []);
            }
        } catch (err) {
            console.error("Error fetching historical tasks:", err);
            // Optionally set an error state for historical tasks
            setHistoricalTasks([]);
        }
    }, [instanceId]);

    // Fetch historical tasks when taskInstance (and thus master_task_id) is available
    useEffect(() => {
        if (taskInstance?.master_task_id) {
            fetchHistoricalTasks(taskInstance.master_task_id);
        }
    }, [taskInstance, fetchHistoricalTasks]);

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

            const [taskResponse, usersResponse, commentsResponse, evidenceResponse] = await Promise.allSettled([
                taskInstancePromise, usersPromise, commentsPromise, evidencePromise
            ]);
            if (taskResponse.status === 'fulfilled' && taskResponse.value.data) {
                setTaskInstance(taskResponse.value.data);

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

        if (document.getElementById('evidenceFile')) {
            document.getElementById('evidenceFile').value = null;
        }
    };

    const handleAddEvidence = async () => {
        setAddEvidenceError('');
        let evidencePayload = {
            description: evidenceDescription,

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
                formData.append('description', evidenceDescription);
                response = await uploadEvidenceToCampaignTaskInstance(instanceId, formData);
            } else if (evidenceType === 'link') {
                if (!evidenceLink.trim()) {
                    setAddEvidenceError("Please enter a valid URL for the link.");
                    return;
                }
                evidencePayload.file_path = evidenceLink;
                evidencePayload.file_name = "Link Evidence";
                evidencePayload.mime_type = "text/url";
                response = await addGenericEvidenceToCampaignTaskInstance(instanceId, evidencePayload);
            } else if (evidenceType === 'text') {
                if (!evidenceText.trim()) {
                    setAddEvidenceError("Please enter the evidence text/description.");
                    return;
                }



                evidencePayload.description = evidenceText;
                evidencePayload.mime_type = "text/plain";
                // evidencePayload.review_status = "Pending"; // Ideally set by backend
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
            setTaskInstance(response.data);
        } catch (err) {
            console.error("Error updating status:", err);
            setStatusError("Failed to update status. " + (err.response?.data?.error || ''));

        }
    };

    const handleExecuteInstance = async () => {
        setExecutionError('');
        setExecutionSuccess('');
        setLoadingResults(true);
        setLastExecutionAttempt(null);
        try {
            const response = await executeCampaignTaskInstance(instanceId);
            setExecutionSuccess(response.data.message || "Execution triggered successfully. Results will be available shortly.");
            setLastExecutionAttempt({ output: response.data.output, status: response.data.status });

            await fetchInstanceResults();
        } catch (err) {
            console.error("Error executing task instance:", err);
            setExecutionError(`Failed to execute task. ${err.response?.data?.error || ''}`);
            setLastExecutionAttempt(null);
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

    const formatJsonContent = (content) => {
        try {
            // If content is already an object, stringify it
            const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
            return (
                <pre className="bg-light p-2 rounded mt-1 mb-0" style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-all', 
                    fontSize: '0.9em',
                    maxHeight: '400px',
                    overflow: 'auto'
                }}>
                    <code>{JSON.stringify(jsonContent, null, 2)}</code>
                </pre>
            );
        } catch (error) {
            // If parsing fails, return the original content
            return content;
        }
    };

    useEffect(() => {
        // Start polling when execution is triggered
        if (executionSuccess) {
            const interval = setInterval(async () => {
                try {
                    const response = await getTaskExecutionStatus(instanceId);
                    setExecutionStatus(response.execution_status);
                    
                    // If task is completed or failed, stop polling
                    if (response.execution_status && 
                        (response.execution_status.status === 'completed' || 
                         response.execution_status.status === 'failed')) {
                        clearInterval(interval);
                        setPollingInterval(null);
                        // Refresh the results
                        await fetchInstanceResults();
                    }
                } catch (error) {
                    console.error('Error polling task status:', error);
                }
            }, 2000); // Poll every 2 seconds
            
            setPollingInterval(interval);
        }
        
        // Cleanup on unmount
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [executionSuccess, instanceId]);

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /><p>Loading task instance details...</p></div>;
    if (error) return <Alert variant="danger" className="mt-3">{error}</Alert>;
    if (!taskInstance) return <Alert variant="warning" className="mt-3">Task Instance data not available.</Alert>;


    let backLinkTarget = location.state?.from;
    let backButtonText = "Back";

    if (backLinkTarget) {
        if (backLinkTarget === '/my-tasks') {
            backButtonText = "Back to My Tasks";
        } else if (backLinkTarget.startsWith('/campaigns/')) {
            backButtonText = "Back to Campaign";
        }

    } else {

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


            <Row>
                <Col md={12} className='mb-3'>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h2 className="mb-0">
                            <div className='mb-1 small fs-6 fw-normal text-muted'>Campaign: <Link to={`/campaigns/${taskInstance.campaign_id}`}>{taskInstance.campaign_name || taskInstance.campaign_id}</Link> / Req: {taskInstance.requirement_standard_name}</div>

                            {taskInstance.title}
                        </h2>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            {isOverdue(taskInstance.due_date, taskInstance.status) && <span className="me-2 fs-6 bg-danger p-1 pt-2 pb-2 ps-3 pe-3 text-white rounded-2">Overdue</span>}
                            <Dropdown>
                                <Dropdown.Toggle variant={getStatusColor(taskInstance.status)} id="dropdown-status" size="sm" className="rounded-pill p-1 pt-2 pb-2 ps-3 pe-3">
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

                </Col>
                <Col md={8} className='border-end'>
                    <Tabs defaultActiveKey="details" id="task-instance-detail-tabs" className="nav-line-tabs mb-3">
                        <Tab eventKey="details" title={<><FaInfoCircle className="me-1" />Details</>}>
                            <Card className="mb-3">
                                {/* <Card.Header as="h5"><FaInfoCircle className="me-2 text-muted" />Task Details</Card.Header> */}
                                <ListGroup variant='flush'>
                                    <ListGroupItem>

                                        <strong>Task Details:</strong>
                                        <p>{taskInstance.description || 'N/A'}</p>

                                    </ListGroupItem>

                                    <ListGroupItem>
                                        <strong>Requirement:</strong>
                                        <h6>
                                            {taskInstance.requirement_control_id_reference} - {taskInstance.requirement_standard_name || 'Standard N/A'}</h6>
                                        <p className='mt-2 text-muted' style={{ whiteSpace: 'pre-wrap' }}>{taskInstance.requirement_text || 'No detailed text available.'}</p>
                                    </ListGroupItem>

                                    {taskInstance.linked_documents && taskInstance.linked_documents.length > 0 && (
                                        <ListGroupItem>
                                            <strong>Linked Documents:</strong>
                                            <ListGroup flush>
                                                {taskInstance.linked_documents.map(doc => (
                                                    <ListGroupItem key={doc.id} className="">
                                                        <div className="">
                                                            <FaFileAlt className="me-2 text-muted" />
                                                            {doc.source_url ? (
                                                                <a href={doc.source_url} target="_blank" rel="noopener noreferrer" title={doc.description || doc.name}>
                                                                    {doc.name} <FaLink size="0.8em" />
                                                                </a>
                                                            ) : (
                                                                <span title={doc.description || doc.name}>{doc.name}</span>
                                                            )}
                                                            {doc.internal_reference && <span className="text-muted ms-1">({doc.internal_reference})</span>} <br />
                                                            <small>{doc.description}</small>
                                                        </div>
                                                    </ListGroupItem>
                                                ))}
                                            </ListGroup>
                                        </ListGroupItem>
                                    )}

                                </ListGroup>
                                <Card.Footer>
                                    <div className='text-muted'><strong>Instance ID:</strong> {taskInstance.id}</div>
                                </Card.Footer>
                            </Card>

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

                        </Tab>
                        <Tab eventKey="evidence" title={<><FaFileUpload className="me-1" />Evidence</>}>


                            <Card>
                                <Card.Header as="h5"><FaPlus className="me-2 text-muted" />Add New Evidence</Card.Header>
                                <Card.Body>
                                    {canManageEvidenceAndExecution ? (
                                        <>
                                            {addEvidenceError && <Alert variant="danger" onClose={() => setAddEvidenceError('')} dismissible>{addEvidenceError}</Alert>}
                                            <div className=''>


                                                <FaFileMedicalAlt className="me-2 text-muted" /><strong>Expected Evidence:</strong>
                                                {taskInstance.evidenceTypesExpected && taskInstance.evidenceTypesExpected.length > 0 ?
                                                    taskInstance.evidenceTypesExpected.map((evidenceType, index) => (
                                                        <React.Fragment key={evidenceType}>

                                                            <Badge variant="secondary" className='bg-secondary me-1 ms-1'>{evidenceType}</Badge>

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



                                                <Row>
                                                    <Col>
                                                        <Button variant='success' onClick={handleAddEvidence} className="w-100 mb-3">Add New Evidence</Button>
                                                    </Col>
                                                    <Col><Button variant='outline-primary' onClick={handleOpenCopyEvidenceModal} className="w-100 mb-3">Copy Existing Evidence</Button></Col>
                                                </Row>

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
                                        let mainDisplay = evidence.file_name || evidence.id;
                                        let showSeparateDescription = true;

                                        const evidenceReviewStatus = evidence.review_status || "Pending";
                                        const reviewedByUser = evidence.reviewed_by_user_id ? users.find(u => u.id === evidence.reviewed_by_user_id) : null;

                                        if (evidence.mimeType === 'text/url') {
                                            icon = <FaLink className="me-2 text-primary" />;
                                            const linkText = evidence.description || evidence.fileName || evidence.filePath;
                                            mainDisplay = <a href={evidence.filePath} target="_blank" rel="noopener noreferrer">{linkText}</a>;
                                            showSeparateDescription = !evidence.description;
                                        } else if (evidence.mimeType === 'text/plain') {
                                            icon = <FaAlignLeft className="me-2 text-info" />;
                                            mainDisplay = (
                                                <div className="" style={{ fontSize: '0.9em' }}>
                                                   {evidence.description || 'No text content'}
                                                </div>
                                            );
                                            showSeparateDescription = false;
                                        } else if (evidence.filePath) {
                                            mainDisplay = <a href={`http://localhost:8080/${evidence.filePath}`} target="_blank" rel="noopener noreferrer">{evidence.fileName || evidence.id}</a>;
                                        }

                                        return (
                                            <Card className="mb-2" key={evidence.id}>
                                                <Card.Header className="d-flex justify-content-between align-items-center">
                                                    <div>{icon} {mainDisplay}</div>
                                                    <Badge bg={getStatusColor(evidenceReviewStatus)}>{evidenceReviewStatus}</Badge>
                                                </Card.Header>
                                                <Card.Body>
                                                    {showSeparateDescription && evidence.description && (
                                                        <div className="mb-0 mt-1">
                                                            {typeof evidence.description === 'object' || 
                                                             (typeof evidence.description === 'string' && 
                                                              (evidence.description.trim().startsWith('{') || evidence.description.trim().startsWith('['))) 
                                                                ? formatJsonContent(evidence.description)
                                                                : <div dangerouslySetInnerHTML={{ __html: evidence.description }} />
                                                            }
                                                        </div>
                                                    )}
                                                    {evidence.review_status && evidence.review_status !== "Pending" && (
                                                        <div className="mt-2 pt-2 border-top">
                                                            <small className="text-muted">
                                                                Reviewed {evidence.reviewed_at ? `at ${new Date(evidence.reviewed_at).toLocaleString()}` : ''}
                                                                {reviewedByUser && <> by <UserDisplay userId={reviewedByUser.id} userName={reviewedByUser.name} allUsers={users} /></>}
                                                            </small>
                                                            {evidence.review_comments && <p className="mb-0 mt-1 fst-italic">Comment: {evidence.review_comments}</p>}
                                                        </div>
                                                    )}
                                                </Card.Body>
                                                <Card.Footer>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-muted">Uploaded: {evidence.uploadedAt ? new Date(evidence.uploadedAt).toLocaleString() : 'N/A'}</small>
                                                        {canReviewEvidence && evidenceReviewStatus === "Pending" && (
                                                            <div>
                                                                <Button
                                                                    variant="outline-success"
                                                                    size="sm"
                                                                    className="me-2"
                                                                    onClick={() => handleEvidenceReview(evidence.id, "Approved")}
                                                                >
                                                                    <FaThumbsUp /> Approve
                                                                </Button>
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => handleOpenRejectModal(evidence)}
                                                                >
                                                                    <FaThumbsDown /> Reject
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card.Footer>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : <p className="mt-3 alert alert-info text-muted">No evidence uploaded yet.</p>}

                        </Tab>

                        <Tab eventKey="history" title={<><FaHistory className="me-1" />Related Instances ({historicalTasks.length})</>}>
                            <Card>
                                <Card.Header as="h5">Other Instances of this Task</Card.Header>
                                <Card.Body>
                                    {historicalTasks.length > 0 ? (
                                        <ListGroup variant="flush">
                                            {historicalTasks.map(histTask => (
                                                <ListGroup.Item key={histTask.id} action as={Link} to={`/campaign-task/${histTask.id}`}>
                                                    <div className="d-flex justify-content-between">
                                                        <div>
                                                            <strong>{histTask.title}</strong>
                                                            <small className="d-block text-muted">
                                                                Campaign: {histTask.campaign_name || 'N/A'}
                                                            </small>
                                                        </div>
                                                        <div>
                                                            <Badge bg={getStatusColor(histTask.status)}>{histTask.status}</Badge>
                                                            {histTask.due_date && (
                                                                <small className="ms-2 text-muted">
                                                                    Due: {new Date(histTask.due_date).toLocaleDateString()}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : <p className="text-muted">No other instances of this master task found.</p>}
                                </Card.Body>
                            </Card>
                        </Tab>

                        <Tab eventKey="execution" title={<><FaPlayCircle className="me-1" />Execution</>}>
                            <div>
                                <Card className=''>
                                    <ListGroup variant='flush'>
                                        {taskInstance.check_type && (
                                            <>
                                                <Card.Header as="h5"><FaCogs className="me-2 text-muted" />Automated Check Details</Card.Header>
                                                <ListGroupItem ><strong>Check Type:</strong> {taskInstance.check_type}</ListGroupItem>
                                                <ListGroupItem ><strong>Target:</strong> {taskInstance.target || 'N/A'}</ListGroupItem>
                                                <ListGroupItem ><strong>Parameters:</strong> {taskInstance.parameters ? JSON.stringify(taskInstance.parameters) : 'None'}</ListGroupItem>
                                            </>
                                        )}
                                    </ListGroup>
                                    <Card.Footer>
                                        {executionError && <Alert variant="danger" onClose={() => setExecutionError('')} dismissible>{executionError}</Alert>}
                                        {executionSuccess && <Alert variant="success" onClose={() => setExecutionSuccess('')} dismissible>{executionSuccess}</Alert>}

                                        {canManageEvidenceAndExecution && taskInstance.check_type ? (

                                            <>
                                                <p>This task instance is configured for automated execution.</p>
                                                <Button className='rounded-pill small w-100' onClick={handleExecuteInstance} disabled={loadingResults}>
                                                    Execute
                                                </Button>
                                            </>
                                        ) : !canManageEvidenceAndExecution ? (

                                            <Alert variant="info">Task execution is restricted.</Alert>
                                        ) : !taskInstance.check_type ? (



                                            <Alert variant="info">This task is not configured for automated execution. Please perform manually and update status/evidence.</Alert>
                                        ) : (

                                            <Alert variant="info">This task is not configured for automated execution. Please perform manually and update status/evidence.</Alert>
                                        )}



                                    </Card.Footer></Card>

                                <Card className='mt-3'>
                                    <Card.Header as="h5"><FaTerminal className="me-2 text-muted" />Results</Card.Header>
                                    <Card.Body>
                                        <Button onClick={fetchInstanceResults} disabled={loadingResults} className="mb-3">
                                            {loadingResults ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" /> Loading...</> : "Refresh Results"}
                                        </Button>

                                    </Card.Body>
                                    {executionResults.length > 0 ? (
                                        <ListGroup variant="flush">
                                            {executionResults.map(res => (
                                                <ListGroup.Item key={res.id}>
                                                    <div>
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div>
                                                                <small><strong>Timestamp:</strong> {new Date(res.timestamp).toLocaleString()}</small><br />
                                                                <small><strong>Status:</strong> <Badge bg={getStatusColor(res.status)}>{res.status}</Badge></small>
                                                                {res.executedByUser && res.executedByUser.name && (
                                                                    <small className='ms-1 ps-1 border-start'>
                                                                        <strong>Executed By:</strong> <UserDisplay userId={res.executedByUserId} userName={res.executedByUser.name} allUsers={users} />
                                                                    </small>
                                                                )}
                                                            </div>
                                                            <div>
                                                                {canManageEvidenceAndExecution && (
                                                                    <Button variant="outline-secondary" size="sm" onClick={() => handleAddResultAsEvidence(res)} title="Add as Evidence">
                                                                        <FaPlus className="me-1" /> Evidence
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <small className="d-block mt-1"><strong>Output:</strong></small>
                                                        <pre className="bg-dark text-light p-2 rounded mt-1" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8em' }}>
                                                            {res.output}
                                                        </pre>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : (
                                        <Card.Footer>
                                            {executionStatus ? (
                                                <div>
                                                    <p className="text-muted mb-2">Task execution status: <Badge bg={getStatusColor(executionStatus.status)}>{executionStatus.status}</Badge></p>
                                                    {executionStatus.error_message && (
                                                        <Alert variant="danger" className="mt-2">
                                                            Error: {executionStatus.error_message}
                                                        </Alert>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-muted">No execution results available for this task instance. Execute the task or refresh if recently executed.</p>
                                            )}
                                        </Card.Footer>
                                    )}
                                </Card>

                            </div>
                        </Tab>
                        {/* <Tab eventKey="results" title={<><FaPoll className="me-1" />Results</>}>
                            
                        </Tab> */}
                    </Tabs>
                </Col>
                <Col md={4}>

                    <small className="text-muted d-block mb-3">
                        Created: {new Date(taskInstance.created_at).toLocaleString()}<br />
                        Last Updated: {new Date(taskInstance.updatedAt).toLocaleString()}
                    </small>


                    <ListGroup >

                        <ListGroupItem>
                            <FaExclamationCircle className="me-2 text-muted" /><strong>Priority:</strong>
                            {taskInstance.defaultPriority ? <Badge bg={getPriorityBadgeColor(taskInstance.defaultPriority)} className="ms-2">{taskInstance.defaultPriority}</Badge> : ' N/A'}
                        </ListGroupItem>



                        <ListGroupItem>
                            <FaTag className="me-2 text-muted" /><strong>Category:</strong><br />

                            {taskInstance.category && (
                                <Badge pill bg="light" text="dark" className="fw-normal ms-2 border"><FaTag className="me-1" />{taskInstance.category}</Badge>
                            )}
                            {taskInstance.requirement_control_id_reference && (
                                <Badge pill bg="light" text="dark" className="fw-normal border">Req: {taskInstance.requirement_control_id_reference}</Badge>
                            )}

                        </ListGroupItem>
                        <ListGroupItem>
                            <FaUserShield className="me-2 text-muted" /><strong className='me-2'>Owner(s):</strong><br />
                            {taskInstance.owners && taskInstance.owners.length > 0 ?
                                taskInstance.owners.map((owner, index) => (
                                    <React.Fragment key={owner.id}>

                                        <UserDisplay userId={owner.id} userName={owner.name} allUsers={users} />
                                        {index < taskInstance.owners.length - 1 && ' '}
                                    </React.Fragment>
                                )) : ' N/A'}
                        </ListGroupItem>
                        <ListGroupItem><FaUserCheck className="me-2 text-muted" /><strong className="me-1">Assignee:</strong><br />

                            <UserDisplay userId={taskInstance.assignee_user_id} userName={taskInstance.assignee_user_id} allUsers={users} />


                        </ListGroupItem>
                        {taskInstance.owner_team && taskInstance.owner_team.name && (
                            <ListGroupItem>
                                <FaUsers className="me-2 text-muted" /><strong>Owner Team:</strong>
                                <TeamDisplay teamId={taskInstance.owner_team.id} teamName={taskInstance.owner_team.name} teamDescription={taskInstance.owner_team.description} teamMembers={taskInstance.owner_team.members} allTeams={users.map(u => u.teams).flat().filter(Boolean)} />
                                {/* Note: allTeams prop might need adjustment based on how you fetch all teams globally or pass them down */}
                            </ListGroupItem>
                        )}
                        {/* {taskInstance.assignee_team && taskInstance.assignee_team.name && (
                                        <ListGroupItem>
                                            <FaUsers className="me-2 text-muted" /><strong>Assignee Team:</strong>
                                            <TeamDisplay teamId={taskInstance.assignee_team.id} teamName={taskInstance.assignee_team.name} teamDescription={taskInstance.assignee_team.description} teamMembers={taskInstance.assignee_team.members} allTeams={users.map(u => u.teams).flat().filter(Boolean)} />
                                        </ListGroupItem>
                                    )} */}
                        <ListGroupItem>
                            <FaFileMedicalAlt className="me-2 text-muted" /><strong>Expected Evidence:</strong><br />
                            {taskInstance.evidenceTypesExpected && taskInstance.evidenceTypesExpected.length > 0 ?
                                taskInstance.evidenceTypesExpected.map((evidenceType, index) => (
                                    <React.Fragment key={evidenceType}>

                                        <Badge variant="secondary" className='bg-secondary me-1 ms-1'>{evidenceType}</Badge>

                                    </React.Fragment>
                                )) : ' N/A'}
                        </ListGroupItem>
                        <ListGroupItem><FaCalendarAlt className="me-2 text-muted" /><strong>Due Date:</strong><br />{taskInstance.due_date ? new Date(taskInstance.due_date).toLocaleDateString() : 'N/A'}</ListGroupItem>




                    </ListGroup>


                </Col>
            </Row>

            {taskInstance && (
                <CopyEvidenceModal
                    show={showCopyEvidenceModal}
                    onHide={() => setShowCopyEvidenceModal(false)}
                    targetCampaignId={taskInstance.campaign_id}
                    onCopySubmit={handleCopyEvidenceSubmit}
                />
            )}

            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Reject Evidence: {evidenceToReview?.file_name || evidenceToReview?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {reviewError && <Alert variant="danger">{reviewError}</Alert>}
                    <Form.Group controlId="reviewComment">
                        <Form.Label>Rejection Reason (Required)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Provide a reason for rejecting this evidence."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={() => handleEvidenceReview(evidenceToReview.id, "Rejected", reviewComment)} disabled={!reviewComment.trim()}>Confirm Rejection</Button>
                </Modal.Footer>
            </Modal>

        </div>

    );
}

export default CampaignTaskInstanceDetail;