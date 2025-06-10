import React, { useState, useEffect, useCallback } from 'react';
import {
    getDocuments,
    createDocument,
    updateDocument,
    deleteDocument
} from '../services/api';
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Form,
    Modal,
    Alert,
    Table,
    Spinner,
    OverlayTrigger,
    Tooltip,
    Badge
} from 'react-bootstrap';
import { FaBook, FaPlusCircle, FaEdit, FaTrashAlt, FaLink, FaInfoCircle } from 'react-icons/fa';
import PageHeader from './common/PageHeader';
import ConfirmModal from './common/ConfirmModal';

const documentTypes = ["Policy", "Procedure", "Standard Operating Procedure (SOP)", "Regulatory Document", "Guideline", "Framework", "Other"];

function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(null);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);

    const initialFormState = {
        name: '',
        description: '',
        document_type: '',
        source_url: '',
        internal_reference: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getDocuments();
            setDocuments(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError('Failed to fetch documents. ' + (err.response?.data?.error || err.message));
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setCurrentDocument(null);
        setFormData(initialFormState);
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const handleOpenEditModal = (doc) => {
        setIsEditing(true);
        setCurrentDocument(doc);
        setFormData({
            name: doc.name || '',
            description: doc.description || '',
            document_type: doc.document_type || '',
            source_url: doc.source_url || '',
            internal_reference: doc.internal_reference || ''
        });
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setCurrentDocument(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            document_type: formData.document_type.trim(),
            source_url: formData.source_url.trim() || null,
            internal_reference: formData.internal_reference.trim() || null,
        };

        if (!payload.name || !payload.document_type) {
            setError("Name and Document Type are required.");
            return;
        }

        try {
            if (isEditing && currentDocument) {
                await updateDocument(currentDocument.id, payload);
                setSuccess('Document updated successfully!');
            } else {
                await createDocument(payload);
                setSuccess('Document created successfully!');
            }
            fetchDocuments();
            handleCloseModal();
        } catch (err) {
            setError('Operation failed. ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteClick = (doc) => {
        setDocumentToDelete(doc);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeleteDocument = async () => {
        if (!documentToDelete) return;
        setError('');
        setSuccess('');
        try {
            await deleteDocument(documentToDelete.id);
            setSuccess(`Document "${documentToDelete.name}" deleted successfully.`);
            fetchDocuments();
        } catch (err) {
            setError('Failed to delete document. ' + (err.response?.data?.error || err.message));
        } finally {
            setShowDeleteConfirmModal(false);
            setDocumentToDelete(null);
        }
    };

    if (loading) {
        return <Container className="text-center mt-5"><Spinner animation="border" /> Loading documents...</Container>;
    }

    return (
        <Container fluid>
            <PageHeader
                icon={<FaBook />}
                title="Manage Documents"
                actions={
                    <Button className='' variant="primary" onClick={handleOpenCreateModal}>
                        <FaPlusCircle className="me-1" /> Create Document
                    </Button>
                }
            />

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card>
                <Card.Header>Document List</Card.Header>
                
                    {documents.length === 0 && !loading ? (
                        <Card.Body><p className="text-muted">No documents found. Click "Create Document" to add one.</p></Card.Body>
                    ) : (
                        <Table variant='flush' striped  hover responsive size="lg">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Source URL</th>
                                    <th>Internal Ref.</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map(doc => (
                                    <tr key={doc.id}>
                                        <td>{doc.name}</td>
                                        <td><Badge bg="info">{doc.document_type}</Badge></td>
                                        <td>
                                            <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-desc-${doc.id}`}>{doc.description || 'No description'}</Tooltip>}>
                                                <span>{doc.description ? `${doc.description.substring(0, 50)}...` : 'N/A'}</span>
                                            </OverlayTrigger>
                                        </td>
                                        <td>
                                            {doc.source_url ? (
                                                <a href={doc.source_url} target="_blank" rel="noopener noreferrer">
                                                    <FaLink /> Link
                                                </a>
                                            ) : 'N/A'}
                                        </td>
                                        <td>{doc.internal_reference || 'N/A'}</td>
                                        <td>
                                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenEditModal(doc)} title="Edit">
                                                <FaEdit />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(doc)} title="Delete">
                                                <FaTrashAlt />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                
            </Card>

            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Document' : 'Create New Document'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="docName">
                            <Form.Label>Name*</Form.Label>
                            <Form.Control type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g., Password Policy" />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="docType">
                            <Form.Label>Document Type*</Form.Label>
                            <Form.Select name="document_type" value={formData.document_type} onChange={handleInputChange} required>
                                <option value="">Select type...</option>
                                {documentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="docDescription">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleInputChange} placeholder="Brief summary of the document" />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="docSourceUrl">
                            <Form.Label>Source URL <FaInfoCircle title="Link to the document if external or in a DMS (e.g., SharePoint, Confluence)" className="ms-1 text-muted" /></Form.Label>
                            <Form.Control type="url" name="source_url" value={formData.source_url} onChange={handleInputChange} placeholder="https://example.com/path/to/document.pdf" />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="docInternalRef">
                            <Form.Label>Internal Reference <FaInfoCircle title="Internal ID, version number, or local file path if applicable" className="ms-1 text-muted" /></Form.Label>
                            <Form.Control type="text" name="internal_reference" value={formData.internal_reference} onChange={handleInputChange} placeholder="e.g., V1.2 or /docs/policy.docx" />
                        </Form.Group>
                        <Button variant="secondary" onClick={handleCloseModal} className="me-2">Cancel</Button>
                        <Button variant="primary" type="submit">{isEditing ? 'Update Document' : 'Create Document'}</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            <ConfirmModal
                show={showDeleteConfirmModal}
                title="Confirm Deletion"
                body={<>Are you sure you want to delete the document "<strong>{documentToDelete?.name}</strong>"? This action cannot be undone.</>}
                onConfirm={confirmDeleteDocument}
                onCancel={() => setShowDeleteConfirmModal(false)}
                confirmButtonText="Delete Document"
                confirmVariant="danger"
            />
        </Container>
    );
}

export default Documents;