import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Modal, Form, Dropdown } from 'react-bootstrap';
import { getUsers, updateUser, deleteUser } from '../../services/api'; // We'll add updateUser and deleteUser
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext'; // To prevent admin from deleting self

function UserManagement() {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newUserRole, setNewUserRole] = useState('');

    const availableRoles = ['admin', 'auditor', 'user']; // Define available roles

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await getUsers();
            setUsers(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError('Failed to fetch users. ' + (err.response?.data?.error || err.message));
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEditShow = (user) => {
        setSelectedUser(user);
        setNewUserRole(user.role);
        setShowEditModal(true);
    };

    const handleDeleteShow = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const handleCloseModals = () => {
        setShowEditModal(false);
        setShowDeleteModal(false);
        setSelectedUser(null);
        setError('');
        setSuccess('');
    };

    const handleRoleChange = async () => {
        if (!selectedUser || !newUserRole) return;
        setError('');
        setSuccess('');
        try {
            // We'll need a more generic updateUser that can update role
            await updateUser(selectedUser.id, { role: newUserRole });
            setSuccess(`User ${selectedUser.name}'s role updated successfully.`);
            fetchUsers(); // Refresh user list
            handleCloseModals();
        } catch (err) {
            setError('Failed to update user role. ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        if (currentUser && selectedUser.id === currentUser.id) {
            setError("You cannot delete your own account.");
            setShowDeleteModal(false); // Close modal but show error on main page
            return;
        }
        setError('');
        setSuccess('');
        try {
            await deleteUser(selectedUser.id);
            setSuccess(`User ${selectedUser.name} deleted successfully.`);
            fetchUsers(); // Refresh user list
            handleCloseModals();
        } catch (err) {
            setError('Failed to delete user. ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return <Spinner animation="border" />;

    return (
        <div>
            <h3>Manage Users</h3>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
            {/* <Button variant="primary" className="mb-3" onClick={() => alert('Add new user functionality to be implemented')}>
                <FaUserPlus className="me-2" />Add New User
            </Button> */}
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length > 0 ? users.map(user => (
                        <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEditShow(user)} title="Edit Role">
                                    <FaEdit />
                                </Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDeleteShow(user)} title="Delete User" disabled={currentUser && user.id === currentUser.id}>
                                    <FaTrash />
                                </Button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="4" className="text-center">No users found.</td></tr>
                    )}
                </tbody>
            </Table>

            {/* Edit Role Modal */}
            <Modal show={showEditModal} onHide={handleCloseModals}>
                <Modal.Header closeButton><Modal.Title>Edit User Role: {selectedUser?.name}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Role</Form.Label>
                        <Form.Select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                            {availableRoles.map(role => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModals}>Cancel</Button>
                    <Button variant="primary" onClick={handleRoleChange}>Save Changes</Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={handleCloseModals}>
                <Modal.Header closeButton><Modal.Title>Confirm Delete</Modal.Title></Modal.Header>
                <Modal.Body>Are you sure you want to delete user <strong>{selectedUser?.name}</strong>? This action cannot be undone.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModals}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteUser}>Delete User</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default UserManagement;