import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/',  // Hier /api/ hinzugefügt
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor für das Hinzufügen des Auth-Tokens
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

export default api; 