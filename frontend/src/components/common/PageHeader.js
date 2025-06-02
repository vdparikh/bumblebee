import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const PageHeader = ({ icon, title, actions }) => {
    return (
        <Row className="mb-3 mb-md-4 align-items-center">
            <Col>
                <h2 className="mb-0">
                    {title}</h2>
            </Col>
            {actions && (
                <Col xs="auto">
                    {actions}
                </Col>
            )}
        </Row>
    );
};

export default PageHeader;