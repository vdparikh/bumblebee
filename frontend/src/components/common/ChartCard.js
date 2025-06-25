import React, { useState } from 'react';
import Card from 'react-bootstrap/Card';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveRadar } from '@nivo/radar';

const chartTypes = [
  { label: 'Bar', value: 'bar' },
  { label: 'Pie', value: 'pie' },
  { label: 'Line', value: 'line' },
  { label: 'Radar', value: 'radar' },
];

// Utility to detect and transform Chart.js data to Nivo format
function chartJsToNivo(data, type = 'bar') {
  if (!data || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) return [];
  if (type === 'line') {
    return data.datasets.map(ds => ({
      id: ds.label,
      data: data.labels.map((label, i) => ({
        x: label,
        y: ds.data[i]
      }))
    }));
  }
  // bar, radar
  if (type === 'bar' || type === 'radar') {
    return data.labels.map((label, i) => ({
      label,
      value: data.datasets[0].data[i]
    }));
  }
  // pie: add color property if available
  if (type === 'pie') {
    return data.labels.map((label, i) => ({
      id: label,
      label,
      value: data.datasets[0].data[i],
      color: data.datasets[0].backgroundColor?.[i]
    }));
  }
  return [];
}

const ChartCard = ({ title, data, chartTypeOptions = ['bar', 'pie', 'line', 'radar'], style }) => {
  const [chartType, setChartType] = useState(chartTypeOptions[0] || 'bar');

  console.log(data);
  // Detect Chart.js data and transform if needed
  let safeData = data;
  if (data && typeof data === 'object' && Array.isArray(data.labels) && Array.isArray(data.datasets)) {
    safeData = chartJsToNivo(data, chartType);
  } else if (!Array.isArray(data)) {
    safeData = [];
  }

  // For line chart, transform [{ label, value }] to [{ id, data: [{ x, y }] }]
  let lineData = safeData;
  if (chartType === 'line' && safeData.length && !safeData[0].id) {
    lineData = [
      {
        id: title || 'Series 1',
        data: safeData.map(d => ({
          x: d.label ?? d.x,
          y: d.value ?? d.y,
        })),
      },
    ];
  }

  return (
    <Card className="h-100">
      <Card.Header as="h5" className="text-center">
        {title}
        <select
          style={{ float: 'right', fontSize: '1rem' }}
          value={chartType}
          onChange={e => setChartType(e.target.value)}
        >
          {chartTypes.filter(type => chartTypeOptions.includes(type.value)).map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </Card.Header>
      <Card.Body style={style || { height: 300 }} className='p-4'>
        {((chartType === 'line' ? lineData : safeData).length === 0) ? (
          <div className="text-muted text-center">No data available for this chart.</div>
        ) : <>
        {chartType === 'bar' && (
          <ResponsiveBar
            data={safeData}
            keys={['value']}
            indexBy="label"
            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
            padding={0.3}
            colors={{ scheme: 'nivo' }}
            axisBottom={{ tickRotation: 0 }}
            animate
          />
        )}
        {chartType === 'pie' && (
          <ResponsivePie
            data={safeData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            innerRadius={0.0}
            padAngle={0.7}
            cornerRadius={3}
            colors={safeData.map(d => d.color).filter(Boolean).length > 0 ? safeData.map(d => d.color) : { scheme: 'nivo' }}
            animate
            enableArcLabels={true}
            arcLabelsTextColor="#333"
            arcLinkLabelsTextColor="#333"
            legends={[
              {
                anchor: 'bottom',
                direction: 'row',
                justify: false,
                translateY: 36,
                itemWidth: 100,
                itemHeight: 18,
                itemsSpacing: 0,
                symbolSize: 18,
                symbolShape: 'circle',
              }
            ]}
          />
        )}
        {chartType === 'line' && (
          <ResponsiveLine
            data={lineData}
            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
            axisBottom={{ tickRotation: 30 }}
            colors={{ scheme: 'nivo' }}
            animate
          />
        )}
        {chartType === 'radar' && (
          <ResponsiveRadar
            data={safeData}
            keys={['value']}
            indexBy="label"
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            colors={{ scheme: 'nivo' }}
            animate
          />
        )}
        </>}
      </Card.Body>
    </Card>
  );
};

export default ChartCard; 