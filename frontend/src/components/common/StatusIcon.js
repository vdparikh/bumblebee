import React from 'react';
import {
    FaCheckCircle, FaExclamationCircle, FaSpinner, FaHourglassHalf,
    FaTimesCircle, FaRegFileAlt, FaTasks as FaTasksIcon
} from 'react-icons/fa';

const StatusIcon = ({ status, isOverdue, size = "1.5em", type = "task" }) => {
    if (isOverdue) return <FaExclamationCircle size={size} className="text-danger" title="Overdue" />;

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
            // Differentiate icon for campaign task vs master task if needed, or unify
            return type === "masterTask" ? <FaRegFileAlt size={size} className="text-primary" title="Open" /> : <FaRegFileAlt size={size} className="text-dark" title="Open" />;
        case 'active': // Example for campaign status
             return <FaCheckCircle size={size} className="text-success" title="Active" />;
        case 'draft': // Example for campaign status
             return <FaTasksIcon size={size} className="text-secondary" title="Draft" />;
        default:
            return <FaTasksIcon size={size} className="text-secondary" title={status || "Unknown"} />;
    }
};

export default StatusIcon;