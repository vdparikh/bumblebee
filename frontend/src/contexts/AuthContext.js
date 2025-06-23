import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    doLogin,
    getCurrentUser,
    doRegister,
} from '../services/api';


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
                    
                    const userDetails = await getCurrentUser(token); 
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
        const authData = { email, password }
        const responseData = await doLogin(authData);
        const response = responseData.data;
        console.log(responseData)
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
        const response = await doRegister(name, email, password);
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