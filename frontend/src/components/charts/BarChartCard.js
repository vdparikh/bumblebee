import React from 'react';
import ChartCard from './ChartCard';

// Deprecated: Use ChartCard directly for more flexibility
const BarChartCard = ({ title, chartRef, chartData, onClickHandler, options, style }) => {
    // Transform chartData to Nivo format if needed
    // For now, assume chartData is [{ label, value }]
    return (
        <ChartCard title={title} data={chartData} chartTypeOptions={['bar', 'pie', 'line', 'radar']} style={style} />
    );
};

export default BarChartCard;