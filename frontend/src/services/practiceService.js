import api from '../api/axios';

const PRACTICE_ENDPOINTS = {
    BASE: 'practice/',
    INSTANCE: 'practice/instance/'
};

const practiceService = {
    getPractice: async () => {
        try {
            console.log('Requesting practice data...');  // Debug-Log
            const response = await api.get(PRACTICE_ENDPOINTS.INSTANCE);
            console.log('Response:', response.data);  // Debug-Log
            return response.data;
        } catch (error) {
            console.error('Fehler beim Laden der Praxisdaten:', error.response || error);
            throw error;
        }
    },

    updatePractice: async (practiceData) => {
        try {
            const response = await api.put(PRACTICE_ENDPOINTS.INSTANCE, practiceData);
            return response.data;
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Praxisdaten:', error.response || error);
            throw error;
        }
    }
};

export default practiceService; 