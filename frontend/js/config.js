// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://dataxpert-5twp.onrender.com/api';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = '72842356502-l4np4rfm963i89r17f8dlk7v7bmtrg6a.apps.googleusercontent.com';

// Local Storage Keys
const STORAGE_KEYS = {
    TOKEN: 'dataxpert_token',
    USER: 'dataxpert_user'
};

// API Endpoints
const API_ENDPOINTS = {
    BASE: API_BASE_URL,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    GOOGLE_AUTH: `${API_BASE_URL}/auth/google`,
    VERIFY: `${API_BASE_URL}/auth/verify`,
    COMPLETE_PROFILE: `${API_BASE_URL}/auth/complete-profile`,
    USER_PROFILE: `${API_BASE_URL}/user/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
    UPLOAD_PROFILE_IMAGE: `${API_BASE_URL}/users/upload-profile-image`,
    ACTIVITY_HISTORY: `${API_BASE_URL}/activity/history`,
    TEAMS: `${API_BASE_URL}/teams`,
    BUSINESS_DATA: `${API_BASE_URL}/business/data`,
    BUSINESS_SUMMARY: `${API_BASE_URL}/business/summary`,
    BUSINESS_DATA_UPLOAD: `${API_BASE_URL}/business-data/upload-smart`,
    BUSINESS_DATA_ANALYZE: `${API_BASE_URL}/business-data/analyze-file`,
    BUSINESS_DATA_CLEAR: `${API_BASE_URL}/business-data/clear`,
    BUSINESS_DATA_CHART: `${API_BASE_URL}/business-data/generate-chart`,
    AI_CHAT: `${API_BASE_URL}/ai/chat`,
    AI_CHATS: `${API_BASE_URL}/ai/chats`,
    AI_ANALYSIS: (chatId) => `${API_BASE_URL}/ai/analysis/${chatId}`,
    DASHBOARD_STATS: `${API_BASE_URL}/dashboard/stats`,
    DASHBOARD_CHARTS: `${API_BASE_URL}/dashboard/charts`
};

const getAuthHeaders = () => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const isAuthenticated = () => !!localStorage.getItem(STORAGE_KEYS.TOKEN);

const logout = () => {
    if (typeof DataCache !== 'undefined') DataCache.invalidate();
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    window.location.href = 'index.html';
};
