import React from 'react';
import Card from 'react-bootstrap/Card';
import { Bar } from 'react-chartjs-2';

const BarChartCard = ({ title, chartRef, chartData, onClickHandler, options, style }) => {
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false, // Often not needed for bar charts if labels are clear
            },
        },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return (
        <Card className="h-100">
            <Card.Header as="h5">{title}</Card.Header>
            <Card.Body style={style || { maxHeight: '300px' }}>
                 {chartData && chartData.labels && chartData.labels.length > 0 ? (
                    <Bar ref={chartRef} data={chartData} options={mergedOptions} onClick={onClickHandler} />
                ) : <p className="text-muted text-center">No data available for this chart.</p>}
            </Card.Body>
        </Card>
    );
};

export default BarChartCard;