export const getStatusColor = (status) => {
    if (!status) return 'secondary';
    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
        case 'closed':
        case 'completed':
        case 'success': 
            return 'success';
        case 'open':
        case 'active':
            return 'secondary';
        case 'in progress':
            return 'info';
        case 'pending review':
            return 'warning';
        case 'failed': 
        case 'error':
            return 'danger';
        case 'draft':
        case 'archived':
            return 'secondary';
        default:
            return 'secondary';
    }
};
