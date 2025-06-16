// This file is now largely superseded by data fetched from the backend API
// `/api/system-type-definitions`.
// The `systemTypeOptions` and `configurationSchemas` will be dynamically loaded.
// You might keep this file for fallback data or remove it once the API is fully integrated.
/*
import {
    FaAws,
    FaDatabase,
    FaKey, 
    FaServer, 
    FaUserSecret, 
    FaLink,
    FaMicrosoft,
    FaGoogle,
    FaGithub,
    FaGitlab,
    FaShieldAlt,
    FaCloud,
    FaCode,
    FaServer as FaGenericServer,
    FaChartLine,
    FaFileAlt,
    FaLock,
    FaUserLock,
    FaNetworkWired,
    FaSearch,
    FaFileSignature,
    FaClipboardCheck,
    FaFileContract,
    FaFileInvoiceDollar,
    FaUserShield,
    FaFileMedical,
    FaFileInvoice,
    FaFileWord,
    FaFileExcel,
    FaFilePdf,
    FaFileArchive
} from 'react-icons/fa';

export const systemTypeOptions = [
    // Cloud Providers
    { 
        value: 'aws', 
        label: 'AWS', 
        description: 'Amazon Web Services',
        icon: <FaAws size={24} />,
        color: '#FF9900',
        category: 'Cloud'
    },
    { 
        value: 'azure', 
        label: 'Azure', 
        description: 'Microsoft Azure',
        icon: <FaMicrosoft size={24} />,
        color: '#0078D4',
        category: 'Cloud'
    },
    { 
        value: 'gcp', 
        label: 'GCP', 
        description: 'Google Cloud Platform',
        icon: <FaGoogle size={24} />,
        color: '#4285F4',
        category: 'Cloud'
    },

    // API & Generic
    {
        value: 'generic_api',
        label: 'Generic API',
        description: 'Any HTTP/REST API endpoint',
        icon: <FaLink size={24} />,
        color: '#1976D2',
        category: 'API'
    },

    // Security & Monitoring
    { 
        value: 'splunk', 
        label: 'Splunk', 
        description: 'Log Management & Analytics',
        icon: <FaSearch size={24} />,
        color: '#000000',
        category: 'Security'
    },
    { 
        value: 'grafana', 
        label: 'Grafana', 
        description: 'Monitoring & Visualization',
        icon: <FaChartLine size={24} />,
        color: '#F46800',
        category: 'Security'
    },
    { 
        value: 'nessus', 
        label: 'Nessus', 
        description: 'Vulnerability Scanner',
        icon: <FaShieldAlt size={24} />,
        color: '#00A8E8',
        category: 'Security'
    },
    { 
        value: 'qualys', 
        label: 'Qualys', 
        description: 'Qualys Guard',
        icon: <FaShieldAlt size={24} />,
        color: '#FF4B4B',
        category: 'Security'
    },
    { 
        value: 'crowdstrike', 
        label: 'CrowdStrike', 
        description: 'Endpoint Security',
        icon: <FaUserShield size={24} />,
        color: '#FF0000',
        category: 'Security'
    },
    { 
        value: 'palo_alto', 
        label: 'Palo Alto', 
        description: 'Network Security',
        icon: <FaNetworkWired size={24} />,
        color: '#7D0000',
        category: 'Security'
    },

    // Compliance & Audit
    { 
        value: 'arcsight', 
        label: 'ArcSight', 
        description: 'Security Information & Event Management',
        icon: <FaFileAlt size={24} />,
        color: '#00A0E3',
        category: 'Compliance'
    },
    { 
        value: 'servicenow', 
        label: 'ServiceNow', 
        description: 'IT Service Management',
        icon: <FaFileContract size={24} />,
        color: '#81B5A1',
        category: 'Compliance'
    },
    { 
        value: 'jira', 
        label: 'Jira', 
        description: 'Project Management & Tracking',
        icon: <FaClipboardCheck size={24} />,
        color: '#0052CC',
        category: 'Compliance'
    },
    { 
        value: 'confluence', 
        label: 'Confluence', 
        description: 'Documentation & Knowledge Base',
        icon: <FaFileWord size={24} />,
        color: '#172B4D',
        category: 'Compliance'
    },

    // Identity & Access
    { 
        value: 'okta', 
        label: 'Okta', 
        description: 'Identity & Access Management',
        icon: <FaUserLock size={24} />,
        color: '#007DC1',
        category: 'Identity'
    },
    { 
        value: 'azure_ad', 
        label: 'Azure AD', 
        description: 'Microsoft Identity Platform',
        icon: <FaUserLock size={24} />,
        color: '#0078D4',
        category: 'Identity'
    },
    { 
        value: 'pam', 
        label: 'PAM', 
        description: 'Privileged Access Management',
        icon: <FaLock size={24} />,
        color: '#6C757D',
        category: 'Identity'
    },

    // Data & Storage
    { 
        value: 'database', 
        label: 'Database', 
        description: 'Database Connection',
        icon: <FaDatabase size={24} />,
        color: '#0D6EFD',
        category: 'Data'
    },
    { 
        value: 's3', 
        label: 'S3', 
        description: 'Object Storage',
        icon: <FaFileArchive size={24} />,
        color: '#FF9900',
        category: 'Data'
    },
    { 
        value: 'sharepoint', 
        label: 'SharePoint', 
        description: 'Document Management',
        icon: <FaFilePdf size={24} />,
        color: '#0078D4',
        category: 'Data'
    },

    // Development & CI/CD
    { 
        value: 'github', 
        label: 'GitHub', 
        description: 'GitHub Integration',
        icon: <FaGithub size={24} />,
        color: '#181717',
        category: 'Development'
    },
    { 
        value: 'gitlab', 
        label: 'GitLab', 
        description: 'GitLab Integration',
        icon: <FaGitlab size={24} />,
        color: '#FC6D26',
        category: 'Development'
    },
    { 
        value: 'jenkins', 
        label: 'Jenkins', 
        description: 'CI/CD Pipeline',
        icon: <FaCode size={24} />,
        color: '#D24939',
        category: 'Development'
    },

    // Financial & Audit
    { 
        value: 'sap', 
        label: 'SAP', 
        description: 'Enterprise Resource Planning',
        icon: <FaFileInvoiceDollar size={24} />,
        color: '#003366',
        category: 'Financial'
    },
    { 
        value: 'oracle_erp', 
        label: 'Oracle ERP', 
        description: 'Enterprise Resource Planning',
        icon: <FaFileInvoice size={24} />,
        color: '#F80000',
        category: 'Financial'
    }
];

export const configurationSchemas = {
    aws: [
        { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
        { name: 'secretAccessKey', label: 'Secret Access Key', type: 'text', required: true },
        { name: 'region', label: 'Region', type: 'text', required: true }
    ],
    azure: [
        { name: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
        { name: 'clientId', label: 'Client ID', type: 'text', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'text', required: true },
        { name: 'subscriptionId', label: 'Subscription ID', type: 'text', required: true }
    ],
    gcp: [
        { name: 'projectId', label: 'Project ID', type: 'text', required: true },
        { name: 'privateKey', label: 'Private Key', type: 'textarea', required: true },
        { name: 'clientEmail', label: 'Client Email', type: 'text', required: true }
    ],
    database: [
        { name: 'host', label: 'Host', type: 'text', required: true },
        { name: 'port', label: 'Port', type: 'text', required: true },
        { name: 'database', label: 'Database Name', type: 'text', required: true },
        { name: 'username', label: 'Username', type: 'text', required: true },
        { name: 'password', label: 'Password', type: 'text', required: true },
        { name: 'type', label: 'Database Type', type: 'select', required: true, options: [
            { value: 'mysql', label: 'MySQL' },
            { value: 'postgresql', label: 'PostgreSQL' },
            { value: 'oracle', label: 'Oracle' },
            { value: 'sqlserver', label: 'SQL Server' }
        ]}
    ],
    github: [
        { name: 'token', label: 'Personal Access Token', type: 'text', required: true },
        { name: 'organization', label: 'Organization', type: 'text', required: false }
    ],
    gitlab: [
        { name: 'token', label: 'Personal Access Token', type: 'text', required: true },
        { name: 'url', label: 'GitLab URL', type: 'text', required: true }
    ],
    jira: [
        { name: 'url', label: 'Jira URL', type: 'text', required: true },
        { name: 'username', label: 'Username', type: 'text', required: true },
        { name: 'apiToken', label: 'API Token', type: 'text', required: true }
    ],
    okta: [
        { name: 'domain', label: 'Okta Domain', type: 'text', required: true },
        { name: 'apiToken', label: 'API Token', type: 'text', required: true }
    ],
    splunk: [
        { name: 'host', label: 'Splunk Host', type: 'text', required: true },
        { name: 'port', label: 'Port', type: 'text', required: true },
        { name: 'username', label: 'Username', type: 'text', required: true },
        { name: 'password', label: 'Password', type: 'text', required: true }
    ]
};
*/
// The data previously here is now intended to be populated in the `system_type_definitions` table
// and fetched via the `/api/system-type-definitions` endpoint.
// The frontend components (SystemIntegrationForm.js, SystemIntegrations.js)
// will be updated to use the fetched data.

export const systemTypeOptions = []; // Will be populated from API
export const configurationSchemas = {}; // Will be populated from API based on selected system type