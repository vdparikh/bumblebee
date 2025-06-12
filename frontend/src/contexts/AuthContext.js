import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const loginApi = async (email, password) => {
    const response = await fetch('http://localhost:8080/api/auth/login', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed with status: ' + response.status }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json(); 
};


const registerApi = async (name, email, password) => {
    const response = await fetch('http://localhost:8080/api/auth/register', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed with status: ' + response.status }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json(); 
};


const getCurrentUserApi = async (token) => {
    
    
    const response = await fetch('http://localhost:8080/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json', 
        },
    });
    if (!response.ok) {
        if (response.status === 401) { 
             throw new Error('Session expired or invalid. Please login again.');
        }
        throw new Error('Failed to fetch current user data. Status: ' + response.status);
    }
    return response.json(); 
};

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUserData, setCurrentUserData] = useState(null); // Renamed to store original user data
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [simulatedRole, setSimulatedRole] = useState(localStorage.getItem('simulatedRole'));
    const [loading, setLoading] = useState(true); 
    const navigate = useNavigate();

    useEffect(() => {
        
        const verifyTokenAndFetchUser = async () => {
            if (token) { 
                try {
                    
                    const userDetails = await getCurrentUserApi(token); 
                    setCurrentUserData(userDetails); // Store fetched user data
                    localStorage.setItem('currentUser', JSON.stringify(userDetails)); 

                } catch (e) {
                    console.error("Token validation failed or error fetching user:", e.message);
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('simulatedRole'); // Clear simulation on auth error
                    setToken(null); 
                    setCurrentUserData(null); 
                    setSimulatedRole(null);
                    
                }
            } else {
                
                setLoading(false);
            }
            setLoading(false); 
        };
        verifyTokenAndFetchUser();
    }, [token, navigate]); 

    const login = useCallback(async (email, password) => {
        const response = await loginApi(email, password);
        const { token: newToken, user } = response;
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('currentUser', JSON.stringify(user)); // Store original user data
        setToken(newToken);
        setCurrentUserData(user); // Set original user data
        setSimulatedRole(null); // Clear any simulation on new login
        localStorage.removeItem('simulatedRole');
        navigate('/'); 
    }, [navigate]);

    const register = useCallback(async (name, email, password) => {
        const response = await registerApi(name, email, password);
        const { token: newToken, user } = response; 
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('currentUser', JSON.stringify(user)); // Store original user data
        setToken(newToken);
        setCurrentUserData(user); // Set original user data
        setSimulatedRole(null); // Clear any simulation on new registration
        localStorage.removeItem('simulatedRole');
        navigate('/'); 
        
    }, [navigate]);

    const logout = useCallback(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('simulatedRole');
        setToken(null);
        setCurrentUserData(null);
        setSimulatedRole(null);
        navigate('/login');
    }, [navigate]);

    const startRoleSimulation = useCallback((roleToSimulate) => {
        if (currentUserData && (currentUserData.role === 'admin' || currentUserData.role === 'auditor')) {
            setSimulatedRole(roleToSimulate);
            localStorage.setItem('simulatedRole', roleToSimulate);
        } else {
            console.warn("Current user does not have permission to simulate roles or user data not loaded.");
        }
    }, [currentUserData]);

    const stopRoleSimulation = useCallback(() => {
        setSimulatedRole(null);
        localStorage.removeItem('simulatedRole');
    }, []);

    // Construct the currentUser object for the context consumers
    const currentUser = currentUserData ? {
        ...currentUserData, // Spread original user data (id, name, email)
        role: simulatedRole || currentUserData.role, // Effective role
        actualRole: currentUserData.role, // True authenticated role from backend
        isSimulating: !!simulatedRole,
    } : null;

    const value = { currentUser, token, login, logout, register, loadingAuth: loading, startRoleSimulation, stopRoleSimulation };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);