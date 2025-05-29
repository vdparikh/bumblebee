export const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'draft': return 'secondary';
        case 'active': return 'success'; // Campaign status
        case 'in progress': return 'info'; // Task/Campaign status
        case 'pending review': return 'warning';
        case 'completed': return 'primary'; // Campaign status
        case 'archived': return 'dark'; // Campaign status
        case 'closed': return 'success'; // Task status
        case 'open': return 'dark'; // Task status (MyTasks uses dark, Tasks.js uses primary for icon)
        case 'failed': return 'danger';
        default: return 'light'; // A more neutral default
    }
};