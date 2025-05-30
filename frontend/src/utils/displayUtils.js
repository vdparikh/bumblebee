export const getStatusColor = (status) => {
    if (!status) return 'secondary';
    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
        case 'closed':
        case 'active':
        case 'completed':
        case 'success': // Added for execution results
            return 'success';
        case 'open':
            return 'primary';
        case 'in progress':
            return 'info';
        case 'pending review':
            return 'warning';
        case 'failed': // For tasks and execution results
        case 'error':
            return 'danger';
        case 'draft':
        case 'archived':
            return 'secondary';
        default:
            return 'secondary';
    }
};
