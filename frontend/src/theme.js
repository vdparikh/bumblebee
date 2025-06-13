// Theme colors and utilities
export const colors = {
    // Primary colors
    primary: {
        main: '#0d6efd',    // Bootstrap primary blue
        light: '#3d8bfd',
        dark: '#0a58ca',
    },
    // Secondary colors
    secondary: {
        main: '#6c757d',    // Bootstrap secondary gray
        light: '#8c959f',
        dark: '#495057',
    },
    // Status colors
    success: {
        main: '#198754',    // Bootstrap success green
        light: '#75b798',
        dark: '#146c43',
    },
    warning: {
        main: '#ffc107',    // Bootstrap warning yellow
        light: '#ffcd39',
        dark: '#cc9a06',
    },
    danger: {
        main: '#dc3545',    // Bootstrap danger red
        light: '#e4606d',
        dark: '#b02a37',
    },
    info: {
        main: '#0dcaf0',    // Bootstrap info cyan
        light: '#3dd5f3',
        dark: '#0aa2c0',
    },
    // Neutral colors
    neutral: {
        white: '#ffffff',
        light: '#f8f9fa',
        gray: '#e9ecef',
        dark: '#212529',
    }
};

// Status color mapping
export const statusColors = {
    // Campaign statuses
    'Draft': colors.secondary,
    'In Progress': colors.info,
    'Pending Review': colors.warning,
    'Completed': colors.success,
    'Failed': colors.danger,
    
    // Task statuses
    'Open': colors.secondary,
    'In Progress': colors.info,
    'Pending Review': colors.warning,
    'Closed': colors.success,
    'Failed': colors.danger,
    'Not Applicable': colors.neutral.gray,
};

// Utility functions
export const getStatusColor = (status) => {
    const colorMap = {
        // Campaign statuses
        'Draft': colors.secondary.main,
        'In Progress': colors.info.main,
        'Pending Review': colors.warning.main,
        'Completed': colors.success.main,
        'Failed': colors.danger.main,
        
        // Task statuses
        'Open': colors.secondary.main,
        'In Progress': colors.info.main,
        'Pending Review': colors.warning.main,
        'Closed': colors.success.main,
        'Failed': colors.danger.main,
        'Not Applicable': colors.neutral.gray,
    };
    return colorMap[status] || colors.secondary.main;
};

export const getStatusVariant = (status) => {
    const colorMap = {
        'Draft': 'secondary',
        'In Progress': 'info',
        'Pending Review': 'warning',
        'Completed': 'success',
        'Failed': 'danger',
        'Open': 'light',
        'Closed': 'success',
        'Not Applicable': 'light',
    };
    return colorMap[status] || 'secondary';
};

// Progress bar colors
export const progressBarColors = {
    success: colors.success.main,
    warning: colors.warning.main,
    danger: colors.danger.main,
    info: colors.info.main,
    secondary: colors.secondary.main,
};

// Badge colors
export const badgeColors = {
    success: colors.success.main,
    warning: colors.warning.main,
    danger: colors.danger.main,
    info: colors.info.main,
    secondary: colors.secondary.main,
    primary: colors.primary.main,
    light: colors.neutral.light,
    dark: colors.neutral.dark,
};

// Chart colors
export const chartColors = {
    background: [
        'rgba(13, 110, 253, 0.6)',   // primary
        'rgba(108, 117, 125, 0.6)',  // secondary
        'rgba(25, 135, 84, 0.6)',    // success
        'rgba(255, 193, 7, 0.6)',    // warning
        'rgba(220, 53, 69, 0.6)',    // danger
        'rgba(13, 202, 240, 0.6)',   // info
    ],
    border: [
        'rgba(13, 110, 253, 1)',     // primary
        'rgba(108, 117, 125, 1)',    // secondary
        'rgba(25, 135, 84, 1)',      // success
        'rgba(255, 193, 7, 1)',      // warning
        'rgba(220, 53, 69, 1)',      // danger
        'rgba(13, 202, 240, 1)',     // info
    ]
};

// Avatar colors (for user initials)
export const avatarColors = [
    colors.primary.main,
    colors.success.main,
    colors.info.main,
    colors.warning.main,
    colors.danger.main,
    colors.secondary.main,
];

// Export all as default
export default {
    colors,
    statusColors,
    getStatusColor,
    getStatusVariant,
    progressBarColors,
    badgeColors,
    chartColors,
    avatarColors,
}; 