// ============================================================
// DataXpert – config.js  (load FIRST in every HTML file)
// API base, endpoints, auth helpers, apiRequest, DataCache
// ============================================================

// ── Base URL ──────────────────────────────────────────────
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://dataxpert-5twp.onrender.com/api';

// ── Google OAuth ──────────────────────────────────────────
const GOOGLE_CLIENT_ID = '72842356502-l4np4rfm963i89r17f8dlk7v7bmtrg6a.apps.googleusercontent.com';

// ── Storage Keys ──────────────────────────────────────────
const STORAGE_KEYS = {
    TOKEN: 'dx_token',
    USER:  'dx_user'
};

// Migrate from old key names (one-time, transparent)
(function migrateLegacyStorage() {
    try {
        if (!localStorage.getItem('dx_token') && localStorage.getItem('dataxpert_token')) {
            localStorage.setItem('dx_token', localStorage.getItem('dataxpert_token'));
            localStorage.removeItem('dataxpert_token');
        }
        if (!localStorage.getItem('dx_user') && localStorage.getItem('dataxpert_user')) {
            localStorage.setItem('dx_user', localStorage.getItem('dataxpert_user'));
            localStorage.removeItem('dataxpert_user');
        }
    } catch(e) { /* ignore */ }
})();

// ── Auth Helpers ──────────────────────────────────────────
const getToken  = ()       => localStorage.getItem(STORAGE_KEYS.TOKEN);
const setToken  = (t)      => localStorage.setItem(STORAGE_KEYS.TOKEN, t);
const getUser   = ()       => { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'); } catch(e) { return null; } };
const setUser   = (u)      => localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
const clearAuth = ()       => { localStorage.removeItem(STORAGE_KEYS.TOKEN); localStorage.removeItem(STORAGE_KEYS.USER); };
const isLoggedIn = ()      => !!getToken();
const requireAuth = ()     => { if (!isLoggedIn()) { window.location.href = 'index.html'; return false; } return true; };

// ── Backward-Compat Aliases ───────────────────────────────
const isAuthenticated = isLoggedIn;
const logout = () => {
    if (typeof DataCache !== 'undefined') DataCache.invalidate();
    clearAuth();
    window.location.href = 'index.html';
};
const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getToken() ? `Bearer ${getToken()}` : ''
});

// ── API Endpoints ─────────────────────────────────────────
const API_ENDPOINTS = {
    BASE:                   API_BASE_URL,
    SIGNUP:                 `${API_BASE_URL}/auth/signup`,
    LOGIN:                  `${API_BASE_URL}/auth/login`,
    GOOGLE_AUTH:            `${API_BASE_URL}/auth/google`,
    VERIFY:                 `${API_BASE_URL}/auth/verify`,
    COMPLETE_PROFILE:       `${API_BASE_URL}/auth/complete-profile`,
    USER_PROFILE:           `${API_BASE_URL}/user/profile`,
    CHANGE_PASSWORD:        `${API_BASE_URL}/users/change-password`,
    UPLOAD_PROFILE_IMAGE:   `${API_BASE_URL}/users/upload-profile-image`,
    ACTIVITY_HISTORY:       `${API_BASE_URL}/activity/history`,
    TEAMS:                  `${API_BASE_URL}/teams`,
    BUSINESS_DATA:          `${API_BASE_URL}/business/data`,
    BUSINESS_SUMMARY:       `${API_BASE_URL}/business/summary`,
    BUSINESS_DATA_UPLOAD:   `${API_BASE_URL}/business-data/upload-smart`,
    BUSINESS_DATA_ANALYZE:  `${API_BASE_URL}/business-data/analyze-file`,
    BUSINESS_DATA_CLEAR:    `${API_BASE_URL}/business-data/clear`,
    BUSINESS_DATA_CHART:    `${API_BASE_URL}/business-data/generate-chart`,
    AI_CHAT:                `${API_BASE_URL}/ai/chat`,
    AI_CHATS:               `${API_BASE_URL}/ai/chats`,
    AI_ANALYSIS:            (chatId) => `${API_BASE_URL}/ai/analysis/${chatId}`,
    DASHBOARD_STATS:        `${API_BASE_URL}/dashboard/stats`,
    DASHBOARD_CHARTS:       `${API_BASE_URL}/dashboard/charts`
};

// ── Unified apiRequest Helper ─────────────────────────────
// Usage: const data = await apiRequest(API_ENDPOINTS.DASHBOARD_STATS);
//        const data = await apiRequest(url, { method:'POST', body: JSON.stringify({...}) });
async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { 'Authorization': `Bearer ${token}` } : {},
        options.headers || {}
    );
    // Remove Content-Type for FormData (browser sets multipart boundary)
    if (options.body instanceof FormData) delete headers['Content-Type'];

    const response = await fetch(url, Object.assign({}, options, { headers }));

    if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }
    const data = await response.json();
    if (!data.success && data.message) throw new Error(data.message);
    return data;
}

// ── DataCache ─────────────────────────────────────────────
const DataCache = {
    data: null,
    lastFetched: null,
    TTL: 5 * 60 * 1000, // 5 minutes

    isValid() {
        return this.data !== null &&
            this.lastFetched !== null &&
            (Date.now() - this.lastFetched) < this.TTL;
    },

    set(data) {
        this.data = data;
        this.lastFetched = Date.now();
        try {
            sessionStorage.setItem('dx_cache', JSON.stringify({
                data: data,
                lastFetched: this.lastFetched
            }));
        } catch(e) { /* quota exceeded */ }
    },

    get() {
        if (this.data && this.isValid()) return this.data;
        try {
            const stored = sessionStorage.getItem('dx_cache');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.data = parsed.data;
                this.lastFetched = parsed.lastFetched;
                if (this.isValid()) return this.data;
            }
        } catch(e) { /* parse error */ }
        return null;
    },

    invalidate() {
        this.data = null;
        this.lastFetched = null;
        try { sessionStorage.removeItem('dx_cache'); } catch(e) {}
    }
};
