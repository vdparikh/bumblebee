export const getStatusColor = (status, returnHex = false) => {
    if (!status) return returnHex ? '#6c757d' : 'secondary'; // Default color
    const lowerStatus = status.toLowerCase();
    
    const colorMap = {
        success: '#198754', // Bootstrap success green
        secondary: '#6c757d',// Bootstrap secondary gray
        info: '#0dcaf0',     // Bootstrap info cyan
        warning: '#ffc107',  // Bootstrap warning yellow
        danger: '#dc3545',   // Bootstrap danger red
        primary: '#0d6af0',  // Bootstrap primary blue
        light: '#f8f9fa',    // Bootstrap light
    };

    let variant;
    switch (lowerStatus) {
        case 'closed':
        case 'completed':
        case 'success': 
            variant = 'success';
            break;
        case 'open':
        case 'active':
            variant = 'secondary';
            break;
        case 'in progress':
            variant = 'info';
            break;
        case 'pending review':
            variant = 'warning';
            break;
        case 'failed': 
        case 'error':
            variant = 'danger';
            break;
        case 'draft':
        case 'archived':
            variant = 'secondary'; // Or 'light' with dark text
            break;
        default:
            variant = 'secondary';
    }
    return returnHex ? (colorMap[variant] || colorMap['secondary']) : variant;
};
