import React, { useState, useEffect, useCallback } from 'react';
import {
    getTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    getTeamMembers,
    getUsers
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
    ListGroup,
    Spinner,
    Badge
} from 'react-bootstrap';
import { FaUsers, FaPlusCircle, FaEdit, FaTrashAlt, FaUserPlus, FaUserMinus } from 'react-icons/fa';
import PageHeader from './common/PageHeader';
import ConfirmModal from './common/ConfirmModal';
import Select from 'react-select';

function TeamsPage() {
    const [teams, setTeams] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTeam, setCurrentTeam] = useState(null);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState(null);

    const [showManageMembersModal, setShowManageMembersModal] = useState(false);
    const [teamToManageMembers, setTeamToManageMembers] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);

    const initialFormState = { name: '', description: '' };
    const [formData, setFormData] = useState(initialFormState);

    const fetchTeamsAndUsers = useCallback(async () => {
        setLoading(true);
        try {
            const [teamsResponse, usersResponse] = await Promise.all([getTeams(), getUsers()]);
            setTeams(Array.isArray(teamsResponse.data) ? teamsResponse.data : []);
            setAllUsers(Array.isArray(usersResponse.data) ? usersResponse.data.map(u => ({ value: u.id, label: u.name, email: u.email })) : []);
        } catch (err) {
            setError('Failed to fetch teams or users. ' + (err.response?.data?.error || err.message));
            setTeams([]);
            setAllUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeamsAndUsers();
    }, [fetchTeamsAndUsers]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setCurrentTeam(null);
        setFormData(initialFormState);
        setShowModal(true);
        setError(''); setSuccess('');
    };

    const handleOpenEditModal = (team) => {
        setIsEditing(true);
        setCurrentTeam(team);
        setFormData({ name: team.name || '', description: team.description || '' });
        setShowModal(true);
        setError(''); setSuccess('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setCurrentTeam(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (!formData.name.trim()) {
            setError("Team Name is required.");
            return;
        }
        try {
            if (isEditing && currentTeam) {
                await updateTeam(currentTeam.id, formData);
                setSuccess('Team updated successfully!');
            } else {
                await createTeam(formData);
                setSuccess('Team created successfully!');
            }
            fetchTeamsAndUsers();
            handleCloseModal();
        } catch (err) {
            setError('Operation failed. ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteClick = (team) => {
        setTeamToDelete(team);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeleteTeam = async () => {
        if (!teamToDelete) return;
        setError(''); setSuccess('');
        try {
            await deleteTeam(teamToDelete.id);
            setSuccess(`Team "${teamToDelete.name}" deleted successfully.`);
            fetchTeamsAndUsers();
        } catch (err) {
            setError('Failed to delete team. ' + (err.response?.data?.error || err.message));
        } finally {
            setShowDeleteConfirmModal(false);
            setTeamToDelete(null);
        }
    };

    const handleOpenManageMembersModal = async (team) => {
        setTeamToManageMembers(team);
        try {
            const membersResponse = await getTeamMembers(team.id);
            setTeamMembers(Array.isArray(membersResponse.data) ? membersResponse.data : []);
        } catch (err) {
            setError('Failed to fetch team members.');
            setTeamMembers([]);
        }
        setSelectedUserToAdd(null);
        setShowManageMembersModal(true);
    };

    const handleAddMember = async () => {
        if (!teamToManageMembers || !selectedUserToAdd) return;
        try {
            await addMemberToTeam(teamToManageMembers.id, selectedUserToAdd.value, 'member'); // Default role 'member'
            // Refresh members list
            const membersResponse = await getTeamMembers(teamToManageMembers.id);
            setTeamMembers(Array.isArray(membersResponse.data) ? membersResponse.data : []);
            setSelectedUserToAdd(null);
            setSuccess('Member added successfully.');
        } catch (err) {
            setError('Failed to add member. ' + (err.response?.data?.error || err.message));
        }
    };

    const handleRemoveMember = async (userIdToRemove) => {
        if (!teamToManageMembers) return;
        try {
            await removeMemberFromTeam(teamToManageMembers.id, userIdToRemove);
            // Refresh members list
            const membersResponse = await getTeamMembers(teamToManageMembers.id);
            setTeamMembers(Array.isArray(membersResponse.data) ? membersResponse.data : []);
            setSuccess('Member removed successfully.');
        } catch (err) {
            setError('Failed to remove member. ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) {
        return <Container className="text-center mt-5"><Spinner animation="border" /> Loading teams...</Container>;
    }

    const usersNotInTeam = allUsers.filter(user => !teamMembers.some(member => member.id === user.value));

    return (
        <Container fluid>
            <PageHeader
                icon={<FaUsers />}
                title="Manage Teams"
                actions={
                    <Button variant="primary" onClick={handleOpenCreateModal}>
                        <FaPlusCircle className="me-1" /> Create Team
                    </Button>
                }
            />

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Row>
                {teams.map(team => (
                    <Col md={6} lg={6} key={team.id} className="mb-3">
                        <Card className="h-100">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <strong>{team.name}</strong>
                                <div>
                                    <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleOpenManageMembersModal(team)} title="Manage Members">
                                        <FaUserPlus />
                                    </Button>
                                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenEditModal(team)} title="Edit Team">
                                        <FaEdit />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(team)} title="Delete Team">
                                        <FaTrashAlt />
                                    </Button>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <Card.Text>{team.description || 'No description provided.'}</Card.Text>
                                <small className="text-muted">Members: {team.members?.length || 'N/A'}</small>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
            {teams.length === 0 && !loading && <Alert variant="info">No teams found. Click "Create Team" to add one.</Alert>}

            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Team' : 'Create New Team'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="teamName">
                            <Form.Label>Team Name*</Form.Label>
                            <Form.Control type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="teamDescription">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleInputChange} />
                        </Form.Group>
                        <Button variant="secondary" onClick={handleCloseModal} className="me-2">Cancel</Button>
                        <Button variant="primary" type="submit">{isEditing ? 'Update Team' : 'Create Team'}</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            <ConfirmModal
                show={showDeleteConfirmModal}
                title="Confirm Deletion"
                body={<>Are you sure you want to delete the team "<strong>{teamToDelete?.name}</strong>"? This action cannot be undone.</>}
                onConfirm={confirmDeleteTeam}
                onCancel={() => setShowDeleteConfirmModal(false)}
                confirmButtonText="Delete Team"
                confirmVariant="danger"
            />

            <Modal show={showManageMembersModal} onHide={() => setShowManageMembersModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Manage Members for: {teamToManageMembers?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h5>Add New Member</h5>
                    <Row className="mb-3">
                        <Col md={8}>
                            <Select
                                options={usersNotInTeam}
                                value={selectedUserToAdd}
                                onChange={setSelectedUserToAdd}
                                placeholder="Select user to add..."
                                isClearable
                            />
                        </Col>
                        <Col md={4}>
                            <Button variant="success" onClick={handleAddMember} disabled={!selectedUserToAdd} className="w-100">
                                <FaUserPlus /> Add Member
                            </Button>
                        </Col>
                    </Row>
                    <hr />
                    <h5>Current Members ({teamMembers.length})</h5>
                    {teamMembers.length > 0 ? (
                        <ListGroup>
                            {teamMembers.map(member => (
                                <ListGroup.Item key={member.id} className="d-flex justify-content-between align-items-center">
                                    {member.name} ({member.email})
                                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveMember(member.id)}>
                                        <FaUserMinus /> Remove
                                    </Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    ) : (
                        <p>No members in this team yet.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowManageMembersModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default TeamsPage;