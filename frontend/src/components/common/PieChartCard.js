import React from 'react';
import Card from 'react-bootstrap/Card';
import { Pie } from 'react-chartjs-2';
import { defaults } from 'chart.js';

const PieChartCard = ({ title, chartRef, chartData, onClickHandler, options, style }) => {
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
        },
    };

    defaults.font.family = 'Lato';

    const mergedOptions = { ...defaultOptions, ...options };

    return (
        <Card className="h-100">
            <Card.Header  as="h5">{title}</Card.Header>
            <Card.Body style={style || { maxHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {chartData && chartData.labels && chartData.labels.length > 0 ? (
                    <Pie ref={chartRef} data={chartData} options={mergedOptions} onClick={onClickHandler} />
                ) : <p className="text-muted text-center">No data available for this chart.</p>}
            </Card.Body>
        </Card>
    );
};

export default PieChartCard;