import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from 'react-bootstrap';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { currentUser, token, loadingAuth } = useAuth();
    const location = useLocation();

    if (loadingAuth) {
        return <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}><Spinner animation="border" /></div>;
    }

    if (!token || !currentUser) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        // Redirect to an unauthorized page or dashboard if role not allowed
        return <Navigate to="/" state={{ unauthorized: true }} replace />; // Or a specific /unauthorized page
    }

    return children;
};

export default ProtectedRoute;