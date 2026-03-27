const API_URL = 'http://127.0.0.1:8080/api/v1/auth/';

const login = async (username, password) => {
    try {
        const response = await fetch(API_URL + 'login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Authentication failed');
        }

        if (data.token) {
            localStorage.setItem('user', JSON.stringify(data));
        }
        return data;
    } catch (error) {
        // If it's a network error, tell the user the backend might be down
        if (error.message === 'Failed to fetch') {
            throw new Error('Network Error: Cannot connect to the server. Please ensure the backend is running.');
        }
        throw error;
    }
};

const logout = () => {
    localStorage.removeItem('user');
};

const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        const user = JSON.parse(userStr);
        if (user && user.token) {
            // Decode JWT payload to check expiration
            const payloadBase64 = user.token.split('.')[1];
            const decodedJson = atob(payloadBase64);
            const payload = JSON.parse(decodedJson);
            const expTime = payload.exp * 1000; // Convert to milliseconds

            if (Date.now() >= expTime) {
                // Token expired
                logout();
                return null;
            }
            return user;
        }
        return null;
    } catch {
        return null;
    }
};

const authHeader = () => {
    const user = getCurrentUser();
    if (user && user.token) {
        return { Authorization: 'Bearer ' + user.token };
    } else {
        return {};
    }
};

const getToken = () => {
    const user = getCurrentUser();
    return user ? user.token : null;
};

export default {
    login,
    logout,
    getCurrentUser,
    authHeader,
    getToken,
};
