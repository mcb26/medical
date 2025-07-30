import axios from 'axios';

// Einfache Base-URL für Single-Database-System
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request Interceptor für Authorization
api.interceptors.request.use(
    (config) => {
        // Token hinzufügen
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }
        
        return Promise.reject(error);
    }
);

// Hilfsfunktion zum Überprüfen des Tokens
api.checkAuthToken = () => {
    const token = localStorage.getItem('token');
    console.log('Current auth token:', token ? 'Vorhanden' : 'Nicht vorhanden');
    return !!token;
};

export default api; 