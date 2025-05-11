import api from '../api/axios';

const PRESCRIPTION_ENDPOINTS = {
    BASE: 'prescriptions/',
};

export const prescriptionService = {
    getPrescriptions: async (page = 1, pageSize = 10) => {
        try {
            const response = await api.get(`prescriptions/?page=${page}&pageSize=${pageSize}`);
            return {
                data: response.data,
                total: response.headers['x-total-count'] || response.data.length,
                success: true
            };
        } catch (error) {
            console.error('Fehler beim Laden der Verordnungen:', error);
            return {
                data: null,
                total: 0,
                success: false,
                error: error
            };
        }
    },

    getPrescription: async (id) => {
        try {
            const response = await api.get(`${PRESCRIPTION_ENDPOINTS.BASE}${id}/`);
            return {
                data: response.data,
                success: true
            };
        } catch (error) {
            console.error(`Fehler beim Laden der Verordnung ${id}:`, error);
            return {
                data: null,
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }
};

export default prescriptionService; 