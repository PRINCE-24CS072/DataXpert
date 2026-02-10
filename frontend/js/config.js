// API Configuration
const API_BASE_URL = 'https://dataxpert-5twp.onrender.com/api';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = '72842356502-l4np4rfm963i89r17f8dlk7v7bmtrg6a.apps.googleusercontent.com';

// Local Storage Keys
const STORAGE_KEYS = {
    TOKEN: 'dataxpert_token',
    USER: 'dataxpert_user'
};

// API Endpoints
const API_ENDPOINTS = {
    // Auth
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    GOOGLE_AUTH: `${API_BASE_URL}/auth/google`,
    VERIFY: `${API_BASE_URL}/auth/verify`,
    
    // User
    PROFILE: `${API_BASE_URL}/user/profile`,
    
    // Teams
    TEAMS: `${API_BASE_URL}/teams`,
    
    // Business Data
    BUSINESS_DATA: `${API_BASE_URL}/business/data`,
    BUSINESS_SUMMARY: `${API_BASE_URL}/business/summary`,
    
    // AI Analysis
    AI_CHAT: `${API_BASE_URL}/ai/chat`,
    AI_CHATS: `${API_BASE_URL}/ai/chats`,
    AI_ANALYSIS: (chatId) => `${API_BASE_URL}/ai/analysis/${chatId}`,
    
    // Dashboard
    DASHBOARD_STATS: `${API_BASE_URL}/dashboard/stats`,
    DASHBOARD_CHARTS: `${API_BASE_URL}/dashboard/charts`
};

// Helper Functions
const getAuthHeaders = () => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const isAuthenticated = () => {
    return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
};

const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    window.location.href = 'index.html';
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE_URL,
        GOOGLE_CLIENT_ID,
        STORAGE_KEYS,
        API_ENDPOINTS,
        getAuthHeaders,
        isAuthenticated,
        logout
    };
}
