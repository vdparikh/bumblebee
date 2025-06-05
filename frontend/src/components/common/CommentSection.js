import React from 'react';
import { Card, Form, Button, ListGroup, Alert, Row, Col, Image } from 'react-bootstrap';
import { FaRegComment, FaPaperPlane } from 'react-icons/fa';
import UserDisplay from './UserDisplay'; 

const CommentItem = ({ comment, allUsers }) => {
    
    const userForComment = allUsers.find(u => u.id === comment.userId);
    const avatarSrc = userForComment?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'U')}&background=random&size=40`;

    return (
        <ListGroup.Item className="bg-transparent border-0 px-0 py-3">
            <Row className="gx-2">
                <Col xs="auto">
                    <Image src={avatarSrc} roundedCircle width={40} height={40} alt={comment.userName || 'User'} />
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

    const currentUserAvatarSrc = currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name?.charAt(0) || 'Me')}&background=random&size=40`;

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
                            <Image src={currentUserAvatarSrc} roundedCircle width={40} height={40} alt={currentUser?.name || 'You'} />
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