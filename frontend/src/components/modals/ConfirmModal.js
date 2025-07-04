import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const ConfirmModal = ({
    show,
    title,
    body,
    onConfirm,
    onCancel,
    confirmButtonText = "Confirm",
    cancelButtonText = "Cancel",
    confirmVariant = "primary"
}) => {
    return (
        <Modal show={show} onHide={onCancel} centered>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>{body}</Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onCancel}>{cancelButtonText}</Button>
                <Button variant={confirmVariant} onClick={onConfirm}>{confirmButtonText}</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConfirmModal;