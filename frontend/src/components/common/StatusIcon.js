import React from 'react';
import {
    FaCheckCircle, FaExclamationCircle, FaSpinner, FaHourglassHalf,
    FaTimesCircle, FaRegFileAlt, FaTasks as FaTasksIcon
} from 'react-icons/fa';

const StatusIcon = ({ status, isOverdue, size = "1.5em", type = "task" }) => {
    if (isOverdue) return <FaExclamationCircle  style={{ lineHeight: "1em"}}  size={size} className="text-danger" title="Overdue" />;

    switch (status?.toLowerCase()) {
        case 'closed':
            return <FaCheckCircle size={size} className="text-success" title="Closed" />;
        case 'in progress':
            return <FaSpinner size={size} className="text-info" spin title="In Progress" />;
        case 'pending review':
            return <FaHourglassHalf size={size} className="text-warning" title="Pending Review" />;
        case 'failed':
            return <FaTimesCircle size={size} className="text-danger" title="Failed" />;
        case 'open':
            return type === "masterTask" ? <FaRegFileAlt size={size} className="text-primary" title="Open" /> : <FaRegFileAlt size={size} className="text-dark" title="Open" />;
        case 'active': 
             return <FaCheckCircle size={size} className="text-success" title="Active" />;
        case 'draft': 
             return <FaTasksIcon size={size} className="text-secondary" title="Draft" />;
        default:
            return <FaTasksIcon size={size} className="text-secondary" title={status || "Unknown"} />;
    }
};

export default StatusIcon;