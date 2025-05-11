import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request Interceptor für den Authorization Header
api.interceptors.request.use(
    (config) => {
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

// Hilfsfunktion zum Überprüfen des Tokens (optional)
api.checkAuthToken = () => {
    const token = localStorage.getItem('token');
    console.log('Current auth token:', token ? 'Vorhanden' : 'Nicht vorhanden');
    return !!token;
};

export default api; 