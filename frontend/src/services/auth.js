import api from '../api/axios';
import notificationService from './notificationService';

const AUTH_ENDPOINTS = {
    LOGIN: 'token/',
    REFRESH: 'token/refresh/',
    PROFILE: 'users/me/',
};

// Hilfsfunktion zur Generierung von Initialen
const generateInitials = (firstName, lastName) => {
    if (!firstName && !lastName) {
        return 'U'; // Fallback für unbekannte Benutzer
    }
    
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    return firstInitial + lastInitial;
};

// Hilfsfunktion zur Extraktion von Vor- und Nachname aus einem String
const parseName = (fullName) => {
    if (!fullName) return { firstName: '', lastName: '' };
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
        return { firstName: nameParts[0], lastName: '' };
    }
    
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    return { firstName, lastName };
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
            
            // Benutzerprofil nach erfolgreichem Login laden
            await fetchUserProfile();
            
            // NotificationService nach erfolgreichem Login initialisieren
            if (typeof window !== 'undefined') {
                notificationService.initialize();
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        // Re-throw the error so the component can handle it
        throw error;
    }
};

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userProfile');
    
    // Benachrichtigungen bereinigen
    notificationService.cleanup();
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

// Benutzerprofil laden und im localStorage speichern
const fetchUserProfile = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const response = await api.get(AUTH_ENDPOINTS.PROFILE, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.data) {
            localStorage.setItem('userProfile', JSON.stringify(response.data));
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

// Benutzerprofil aus localStorage abrufen
const getUserProfile = () => {
    try {
        const profileData = localStorage.getItem('userProfile');
        return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
        console.error('Error parsing user profile:', error);
        return null;
    }
};

// Initialen des aktuellen Benutzers generieren
const getUserInitials = () => {
    const profile = getUserProfile();
    
    if (!profile) {
        // Fallback: Versuche Initialen aus dem Token zu extrahieren
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const username = payload.username || '';
                const { firstName, lastName } = parseName(username);
                return generateInitials(firstName, lastName);
            } catch {
                return 'U';
            }
        }
        return 'U';
    }

    // Verwende first_name und last_name falls verfügbar
    if (profile.first_name || profile.last_name) {
        return generateInitials(profile.first_name, profile.last_name);
    }

    // Fallback: Verwende username
    if (profile.username) {
        const { firstName, lastName } = parseName(profile.username);
        return generateInitials(firstName, lastName);
    }

    return 'U';
};

// Vollständigen Namen des Benutzers abrufen
const getUserFullName = () => {
    const profile = getUserProfile();
    
    if (!profile) return 'Unbekannter Benutzer';
    
    if (profile.first_name && profile.last_name) {
        return `${profile.first_name} ${profile.last_name}`;
    }
    
    if (profile.first_name) {
        return profile.first_name;
    }
    
    if (profile.last_name) {
        return profile.last_name;
    }
    
    return profile.username || 'Unbekannter Benutzer';
};

// Benutzerprofil aktualisieren
const updateUserProfile = async (profileData) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;

        const response = await api.patch(AUTH_ENDPOINTS.PROFILE, profileData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.data) {
            localStorage.setItem('userProfile', JSON.stringify(response.data));
            // Custom Events auslösen
            window.dispatchEvent(new CustomEvent('userProfile-updated'));
            window.dispatchEvent(new CustomEvent('permissions-updated'));
            return response.data;
        }
        return false;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};

// Funktion um Berechtigungen zu aktualisieren
const updatePermissions = () => {
  // Custom Event auslösen um Berechtigungen zu aktualisieren
  window.dispatchEvent(new CustomEvent('permissions-updated'));
};

// Export einzelner Funktionen für direkten Import
export { 
    login, 
    logout, 
    isAuthenticated, 
    getToken, 
    refreshToken,
    fetchUserProfile,
    getUserProfile,
    getUserInitials,
    getUserFullName,
    updateUserProfile,
    updatePermissions,
    generateInitials,
    parseName
};

// Export des gesamten auth-Objekts als default
const auth = {
    login,
    logout,
    isAuthenticated,
    getToken,
    refreshToken,
    fetchUserProfile,
    getUserProfile,
    getUserInitials,
    getUserFullName,
    updateUserProfile,
    updatePermissions,
    generateInitials,
    parseName
};

export default auth; 