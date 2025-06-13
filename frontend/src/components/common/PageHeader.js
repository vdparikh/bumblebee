import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const PageHeader = ({ icon, title, subtitle, actions }) => {
    return (
        <Row className="mb- mb-md-4 align-items-center">
            <Col>
                <h2 className="mb-0">
                    {title}</h2> 
                    { subtitle ? <p className="text-muted mb-0">{subtitle}</p> : null }
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