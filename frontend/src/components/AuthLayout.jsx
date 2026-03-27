import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import Login from './Login';

const AuthLayout = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            const user = authService.getCurrentUser();
            if (user && user.token) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
            setLoading(false);
        };

        checkAuth();

        // Check authentication status periodically in case token expires while app is open
        const intervalId = setInterval(checkAuth, 60000); // Check every minute

        return () => clearInterval(intervalId);
    }, []);

    // Idle Timeout Logic (15 minutes of inactivity)
    useEffect(() => {
        if (!isAuthenticated) return;

        let timeoutId;
        const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

        const handleActivity = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                authService.logout();
                setIsAuthenticated(false);
                window.location.reload(); // Force full reload to wipe states
            }, IDLE_TIMEOUT_MS);
        };

        // Initialize timeout
        handleActivity();

        // Listen for activity
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [isAuthenticated]);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center font-mono">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                <p className="text-cyan-500 tracking-widest uppercase text-sm animate-pulse">Initializing Secure Connection...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <>
            {children}
        </>
    );
};

export default AuthLayout;
