import {
    FaShieldAlt, FaFileContract, FaTasks, FaTag, FaCogs,
    FaExclamationCircle, FaFileMedicalAlt, FaInfo, FaLink, FaPlusCircle,
    FaExclamationTriangle, FaCheckCircle, FaClock, FaUserCheck, FaChartLine,
    FaDatabase, FaNetworkWired, FaLock, FaEye, FaServer, FaCloud,
    FaMobile, FaDesktop, FaLaptop, FaTablet, FaShieldVirus, FaUserShield,
    FaFileAlt, FaClipboardCheck, FaSearch, FaTools, FaCode, FaBug,
    FaRocket, FaLightbulb, FaBrain, FaRobot, FaHandshake, FaBalanceScale,
    FaCreditCard, FaBuilding, FaUnlink
} from 'react-icons/fa';


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

export const getTaskCategoryIcon = (task) => {
    const category = task?.category || '';
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('security')) return <FaShieldVirus className="text-danger" />;
    if (categoryLower.includes('network')) return <FaNetworkWired className="text-primary" />;
    if (categoryLower.includes('database')) return <FaDatabase className="text-info" />;
    if (categoryLower.includes('access')) return <FaLock className="text-warning" />;
    if (categoryLower.includes('monitoring')) return <FaEye className="text-success" />;
    if (categoryLower.includes('server')) return <FaServer className="text-secondary" />;
    if (categoryLower.includes('cloud')) return <FaCloud className="text-info" />;
    if (categoryLower.includes('mobile')) return <FaMobile className="text-primary" />;
    if (categoryLower.includes('desktop')) return <FaDesktop className="text-secondary" />;
    if (categoryLower.includes('laptop')) return <FaLaptop className="text-info" />;
    if (categoryLower.includes('tablet')) return <FaTablet className="text-warning" />;
    if (categoryLower.includes('audit')) return <FaClipboardCheck className="text-success" />;
    if (categoryLower.includes('scan')) return <FaSearch className="text-info" />;
    if (categoryLower.includes('tool')) return <FaTools className="text-secondary" />;
    if (categoryLower.includes('code')) return <FaCode className="text-dark" />;
    if (categoryLower.includes('test')) return <FaBug className="text-warning" />;
    if (categoryLower.includes('deploy')) return <FaRocket className="text-success" />;
    if (categoryLower.includes('review')) return <FaUserCheck className="text-primary" />;
    if (categoryLower.includes('policy')) return <FaFileAlt className="text-info" />;
    if (categoryLower.includes('compliance')) return <FaBalanceScale className="text-success" />;
    if (categoryLower.includes('automation')) return <FaRobot className="text-primary" />;
    if (categoryLower.includes('integration')) return <FaHandshake className="text-warning" />;
    return <FaTasks className="text-muted" />;
};
