import React, { useEffect, useState } from 'react';
import { Card, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { FaAlignLeft, FaFileAlt, FaLink } from 'react-icons/fa';
import { getEvidenceLibrary } from '../../services/api';
import { getStatusColor } from '../../utils/displayUtils';
import UserDisplay from './UserDisplay';

const EvidenceLibrary = () => {
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEvidence = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getEvidenceLibrary();
                setEvidence(res.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEvidence();
    }, []);


    const renderOutputValue = (value) => {
        if (typeof value === 'object' && value !== null) {
            // For nested objects/arrays, pretty-print them within the cell
            return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, fontSize: '0.9em' }}>{JSON.stringify(value, null, 2)}</pre>;
        }
        if (typeof value === 'boolean') return value.toString();
        if (value === null) return <em className="text-muted">null</em>;
        return String(value);
    };

    const renderOutput = (outputString) => {
        try {
            const parsedOutput = JSON.parse(outputString);

            if (Array.isArray(parsedOutput)) {
                if (parsedOutput.length === 0) {
                    return <p className="text-muted my-1">Empty array</p>;
                }
                // Check if it's an array of objects (and all objects have similar structure for table headers)
                if (parsedOutput.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
                    const headers = Object.keys(parsedOutput[0] || {});
                    return (
                        <Table striped bordered hover size="sm" variant="dark" responsive className="output-table mt-1 mb-0">
                            <thead>
                                <tr>
                                    {headers.map(header => <th key={header}>{header}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {parsedOutput.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {headers.map(header => <td key={`${rowIndex}-${header}`}>{renderOutputValue(row[header])}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    );
                } else { // Array of primitives or mixed types
                    return (
                        <ul className="list-unstyled mb-0">
                            {parsedOutput.map((item, index) => (
                                <li key={index} className="border-bottom py-1">{renderOutputValue(item)}</li>
                            ))}
                        </ul>
                    );
                }
            } else if (typeof parsedOutput === 'object' && parsedOutput !== null) { // Simple object
                return (
                    <Table striped bordered hover size="sm" variant="dark" responsive className="output-table mt-1 mb-0">
                        <tbody>
                            {Object.entries(parsedOutput).map(([key, value]) => (
                                <tr key={key}>
                                    <td style={{ width: '30%', wordBreak: 'break-all' }}><strong>{key}</strong></td>
                                    <td>{renderOutputValue(value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                );
            } else { // Primitive value (string, number, boolean)
                return <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{String(parsedOutput)}</pre>;
            }
        } catch (e) {
            // If parsing fails, it's likely not JSON or malformed, so return as is in a pre tag
            return <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{outputString}</pre>;
        }
    };

    return (
        <div>

            {loading && <div className="text-center"><Spinner animation="border" /><div>Loading evidence...</div></div>}
            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && !error && (
                evidence.length === 0 ? (
                    <Alert variant="info">No evidence found.</Alert>
                ) : (
                    <div style={{ overflowX: 'auto' }}>

                        {evidence.map(evidence => {
                            let icon = <FaFileAlt className="me-2 text-muted" />;
                            let mainDisplay = evidence.file_name || evidence.id;
                            let showSeparateDescription = true;

                            const evidenceReviewStatus = evidence.review_status || "Pending";
                            const reviewedByUser = evidence.reviewed_by_user_id
                            // evidence.reviewed_by_user_id ? users.find(u => u.id === evidence.reviewed_by_user_id) : null;

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
                                        <Badge variant="outline-warning" bg="warning" >{evidenceReviewStatus}</Badge>
                                    </Card.Header>
                                    <Card.Body>
                                        {showSeparateDescription && evidence.description && (
                                            <div className="bg-dark text-light p-2 rounded mt-1" style={{ fontSize: '0.8em', overflowX: 'auto' }}>

                                                {renderOutput(evidence.description)}
                                                {/* <pre dangerouslySetInnerHTML={{ __html: evidence.description }} /> */}
                                                {/* {typeof evidence.description === 'object' ||
                                                                (typeof evidence.description === 'string' &&
                                                                    (evidence.description.trim().startsWith('{') || evidence.description.trim().startsWith('[')))
                                                                ? formatJsonContent(evidence.description)
                                                                : <div dangerouslySetInnerHTML={{ __html: evidence.description }} />
                                                            } */}
                                            </div>
                                        )}
                                        {evidence.review_status && evidence.review_status !== "Pending" && (
                                            <div className="mt-2 pt-2 border-top">
                                                <small className="text-muted">
                                                    Reviewed {evidence.reviewed_at ? `at ${new Date(evidence.reviewed_at).toLocaleString()}` : ''}
                                                    {reviewedByUser && <> by <UserDisplay userId={reviewedByUser.id} userName={reviewedByUser.name} /></>}
                                                </small>
                                                {evidence.review_comments && <p className="mb-0 mt-1 fst-italic">Comment: {evidence.review_comments}</p>}
                                            </div>
                                        )}
                                    </Card.Body>
                                    <Card.Footer>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <Badge>{evidence.mime_type}</Badge>
                                            <small className="text-muted">Uploaded: {evidence.uploadedAt ? new Date(evidence.uploadedAt).toLocaleString() : 'N/A'}</small>
                                            {/* {canReviewEvidence && evidenceReviewStatus === "Pending" && (
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
                                                        )} */}
                                        </div>
                                    </Card.Footer>
                                </Card>
                            );
                        })}

                        {/* <Table striped bordered hover responsive size="sm">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th>Uploader</th>
                                        <th>Uploaded At</th>
                                        <th>Review Status</th>
                                        <th>Description</th>
                                        <th>Download</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {evidence.map(ev => (
                                        <tr key={ev.id}>
                                            <td>{ev.fileName}</td>
                                            <td>{ev.uploadedByUser ? `${ev.uploadedByUser.name} (${ev.uploadedByUser.email})` : ev.uploadedByUserId}</td>
                                            <td>{new Date(ev.uploadedAt).toLocaleString()}</td>
                                            <td>
                                                <Badge bg={ev.reviewStatus === 'Approved' ? 'success' : ev.reviewStatus === 'Rejected' ? 'danger' : 'warning'}>
                                                    {ev.reviewStatus || 'Pending'}
                                                </Badge>
                                            </td>
                                            <td>{renderOutput(ev.description || '')}</td>
                                            <td>
                                                <a href={ev.filePath.startsWith('/uploads') ? ev.filePath : `/uploads/${ev.filePath}`} target="_blank" rel="noopener noreferrer" download>
                                                    Download
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table> */}
                    </div>
                )
            )}
        </div>
    );
};

export default EvidenceLibrary; 