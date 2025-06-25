import React from 'react';
import ChartCard from './ChartCard';

// Deprecated: Use ChartCard directly for more flexibility
const PieChartCard = ({ title, chartRef, chartData, onClickHandler, options, style }) => {
    // Transform chartData to Nivo format if needed
    // For now, assume chartData is [{ label, value }]
    return (
        <ChartCard title={title} data={chartData} chartTypeOptions={['pie', 'bar', 'line', 'radar']} style={style} />
    );
};

export default PieChartCard;