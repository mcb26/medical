import api from '../api/axios';

const AUTH_ENDPOINTS = {
    LOGIN: 'token/',
    REFRESH: 'token/refresh/',
};

const login = async (username, password) => {
    try {
        const response = await api.post(AUTH_ENDPOINTS.LOGIN, {
            username,
            password
        });
        
        if (response.data.access) {
            localStorage.setItem('token', response.data.access);
            if (response.data.refresh) {
                localStorage.setItem('refreshToken', response.data.refresh);
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        return false;
    }
};

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
};

const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp > Date.now() / 1000;
    } catch {
        return false;
    }
};

const getToken = () => localStorage.getItem('token');

const refreshToken = async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) return false;

    try {
        const response = await api.post(AUTH_ENDPOINTS.REFRESH, {
            refresh
        });
        if (response.data.access) {
            localStorage.setItem('token', response.data.access);
            return true;
        }
        return false;
    } catch {
        return false;
    }
};

// Export einzelner Funktionen für direkten Import
export { login, logout, isAuthenticated, getToken, refreshToken };

// Export des gesamten auth-Objekts als default
const auth = {
    login,
    logout,
    isAuthenticated,
    getToken,
    refreshToken
};

export default auth; 