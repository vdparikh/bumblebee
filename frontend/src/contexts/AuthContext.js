import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
// API call for login
const loginApi = async (email, password) => {
    const response = await fetch('http://localhost:8080/api/auth/login', { // Ensure this path matches your Go router
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
    return response.json(); // Expects { token: "...", user: { id: "...", name: "...", email: "...", role: "..." } }
};

// API call for registration
const registerApi = async (name, email, password) => {
    const response = await fetch('http://localhost:8080/api/auth/register', { // Ensure this path matches your Go router
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
    return response.json(); // Expects { token: "...", user: { ... }, message: "..." }
};

// API call to get current user details if only token is stored or to verify token
const getCurrentUserApi = async (token) => {
    // Corrected path to match backend routing under /api/auth/me
    // Using the full path for clarity, assuming frontend and backend might be on different ports during dev.
    const response = await fetch('http://localhost:8080/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json', // Good practice
        },
    });
    if (!response.ok) {
        if (response.status === 401) { // Unauthorized, likely bad/expired token
             throw new Error('Session expired or invalid. Please login again.');
        }
        throw new Error('Failed to fetch current user data. Status: ' + response.status);
    }
    return response.json(); // Expects { id: "...", name: "...", email: "...", role: "..." }
};

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [loading, setLoading] = useState(true); // To handle initial auth check
    const navigate = useNavigate();

    useEffect(() => {
        // On initial load, try to get user info if token exists
        const verifyTokenAndFetchUser = async () => {
            if (token) { // `token` here is from `useState(localStorage.getItem('authToken'))`
                try {
                    // Fetch user details from backend using token to verify and get latest info
                    const userDetails = await getCurrentUserApi(token); // This API call is crucial
                    setCurrentUser(userDetails);
                    localStorage.setItem('currentUser', JSON.stringify(userDetails)); // Update local storage

                } catch (e) {
                    console.error("Token validation failed or error fetching user:", e.message);
                    // Clear invalid token and user data
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    setToken(null); // This will trigger a re-render
                    setCurrentUser(null); // This will trigger a re-render
                    // Optionally navigate to login if not already on a public page
                    // if (window.location.pathname !== '/login') navigate('/login');
                }
            } else {
                // If there's no token, we are also done with initial loading.
                setLoading(false);
            }
            setLoading(false); // Removed redundant setLoading call
        };
        verifyTokenAndFetchUser();
    }, [token, navigate]); // Added navigate to dependency array

    const login = useCallback(async (email, password) => {
        const response = await loginApi(email, password);
        const { token: newToken, user } = response;
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setToken(newToken);
        setCurrentUser(user);
        navigate('/'); // Redirect to dashboard after login
    }, [navigate]);

    const register = useCallback(async (name, email, password) => {
        const response = await registerApi(name, email, password);
        const { token: newToken, user } = response; // Assuming register API also returns token and user
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setToken(newToken);
        setCurrentUser(user);
        navigate('/'); // Redirect to dashboard after registration and login
        // Or navigate('/login') and show a success message if you want them to log in manually
    }, [navigate]);

    const logout = useCallback(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        setToken(null);
        setCurrentUser(null);
        navigate('/login');
    }, [navigate]);

    const value = { currentUser, token, login, logout, register, loadingAuth: loading };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);