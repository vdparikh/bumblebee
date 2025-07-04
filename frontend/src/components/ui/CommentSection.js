import React from 'react';
import { Card, Form, Button, ListGroup, Alert, Row, Col } from 'react-bootstrap';
import { FaRegComment, FaPaperPlane } from 'react-icons/fa';
import UserDisplay from './UserDisplay';
import { avatarColors } from '../../theme';

const Avatar = ({ name, size = 40 }) => {
    // Get initials from name
    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Generate a consistent color based on the name
    const getColor = (name) => {
        if (!name) return avatarColors[0];
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        return avatarColors[hash % avatarColors.length];
    };

    const initials = getInitials(name);
    const backgroundColor = getColor(name);

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${size * 0.4}px`,
                fontWeight: 'bold'
            }}
        >
            {initials}
        </div>
    );
};

const CommentItem = ({ comment, allUsers }) => {
    const userForComment = allUsers.find(u => u.id === comment.userId);
    const userName = userForComment?.name || comment.userName || 'User';

    return (
        <ListGroup.Item className="bg-transparent border-0 px-0 py-3">
            <Row className="gx-2">
                <Col xs="auto">
                    <Avatar name={userName} size={40} />
                </Col>
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <UserDisplay userId={comment.userId} userName={comment.userName} allUsers={allUsers} />
                        <small className="text-muted">{new Date(comment.createdAt).toLocaleString()}</small>
                    </div>
                    {/* <p className="mb-0 mt-1  comment-text">{comment.text}</p> */}
                    <div className="mb-0 mt-1  comment-text" dangerouslySetInnerHTML={{ __html: comment.text }} />
                </Col>
            </Row>
        </ListGroup.Item>
    );
};

const CommentSection = ({
    comments,
    allUsers,
    currentUser,
    newComment,
    setNewComment,
    onCommentSubmit,
    commentError,
    setCommentError
}) => {
    return (
        <Card className="shadow-sm">
            <Card.Header as="h5" className="d-flex align-items-center bg-light">
                <FaRegComment className="me-2 text-primary" /> Comments ({comments.length})
            </Card.Header>
            <Card.Body>
                {commentError && <Alert variant="danger" onClose={() => setCommentError('')} dismissible>{commentError}</Alert>}

                <Form onSubmit={onCommentSubmit} className="mb-4">
                    <Row className="gx-2 align-items-start">
                        <Col xs="auto">
                            <Avatar name={currentUser?.name || 'You'} size={40} />
                        </Col>
                        <Col>
                            <Form.Group controlId="newCommentText">
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="comment-textarea"
                                />
                            </Form.Group>
                        </Col>
                         <Col xs="auto" className="d-flex align-items-end"> 
                            <Button type="submit" variant="primary" className="comment-submit-btn">
                                <FaPaperPlane />
                            </Button>
                        </Col>
                    </Row>
                </Form>

                {comments.length > 0 ? (
                    <ListGroup variant="flush" className="comment-list">
                        {comments.map(comment => (
                            <CommentItem key={comment.id} comment={comment} allUsers={allUsers} />
                        ))}
                    </ListGroup>
                ) : (
                    <p className="text-muted text-center mt-3">No comments yet. Be the first to comment!</p>
                )}
            </Card.Body>
        </Card>
    );
};

export default CommentSection;