import React from 'react';
import Card from 'react-bootstrap/Card';

const KeyMetricsCard = ({ title, metrics = [] }) => {
    return (
        <Card className="text-center h-100">
            <Card.Header>{title}</Card.Header>
            <Card.Body className="d-flex flex-column justify-content-around">
                {metrics.map((metric, index) => (
                    <div key={index} className={index < metrics.length -1 ? "mb-3" : ""}>
                        <h4 className={metric.variant ? `text-${metric.variant}` : ''}>
                            {metric.value}
                        </h4>
                        <p className="text-muted mb-0">{metric.label}</p>
                    </div>
                ))}
            </Card.Body>
        </Card>
    );
};

export default KeyMetricsCard;