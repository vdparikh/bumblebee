import React from 'react';
import {
    FaAws, FaDatabase, FaKey, FaServer, FaUserSecret, FaLink, FaMicrosoft, FaGoogle,
    FaGithub, FaGitlab, FaShieldAlt, FaCloud, FaCode, FaChartLine, FaFileAlt, FaLock,
    FaUserLock, FaNetworkWired, FaSearch, FaFileSignature, FaClipboardCheck, FaFileContract,
    FaFileInvoiceDollar, FaUserShield, FaFileMedical, FaFileInvoice, FaFileWord, FaFileExcel,
    FaFilePdf, FaFileArchive, FaQuestionCircle // Added FaQuestionCircle as a default
} from 'react-icons/fa';
// Import any other icons you might use for system types

const iconComponents = {
    FaAws, FaDatabase, FaKey, FaServer, FaUserSecret, FaLink, FaMicrosoft, FaGoogle,
    FaGithub, FaGitlab, FaShieldAlt, FaCloud, FaCode, FaChartLine, FaFileAlt, FaLock,
    FaUserLock, FaNetworkWired, FaSearch, FaFileSignature, FaClipboardCheck, FaFileContract,
    FaFileInvoiceDollar, FaUserShield, FaFileMedical, FaFileInvoice, FaFileWord, FaFileExcel,
    FaFilePdf, FaFileArchive, FaQuestionCircle
    // Add other string-to-component mappings here
};

export const getSystemTypeIcon = (iconNameString, size = 24) => {
    const IconComponent = iconComponents[iconNameString] || iconComponents['FaQuestionCircle']; // Default icon
    return <IconComponent size={size} />;
};