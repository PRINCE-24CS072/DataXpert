// Environment Configuration - Development
const ENV = 'development';
const API_BASE_URL = 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = '72842356502-l4np4rfm963i89r17f8dlk7v7bmtrg6a.apps.googleusercontent.com';

// Feature Flags
const FEATURES = {
    DARK_MODE: true,
    DATA_IMPORT: true,
    EXPORT_PDF: true,
    COMPARISON_ANALYSIS: true,
    DEBUG_MODE: true
};

console.log(`[DataXpert] Running in ${ENV} mode`);
