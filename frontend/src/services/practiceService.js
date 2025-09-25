import api from '../api/axios';

const PRACTICE_ENDPOINTS = {
    BASE: 'practice/',
    INSTANCE: 'practice/get_instance/',
    UPDATE_INSTANCE: 'practice/update_instance/'
};

const practiceService = {
    getPractice: async () => {
        try {
            const response = await api.get(PRACTICE_ENDPOINTS.INSTANCE);
            return response.data;
        } catch (error) {
            console.error('Fehler beim Laden der Praxisdaten:', error.response || error);
            throw error;
        }
    },

    updatePractice: async (practiceData) => {
        try {
            const response = await api.put(PRACTICE_ENDPOINTS.UPDATE_INSTANCE, practiceData);
            return response.data;
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Praxisdaten:', error.response || error);
            throw error;
        }
    }
};

export default practiceService; 