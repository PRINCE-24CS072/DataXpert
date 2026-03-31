// Theme Management Module
const THEME_KEY = 'dataxpert_theme';

// Initialize theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setTheme(savedTheme);
    
    // Update toggle button if exists
    updateThemeToggle(savedTheme);
}

// Set theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggle(theme);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Update toggle button appearance
function updateThemeToggle(theme) {
    const icon = document.querySelector('.theme-toggle-icon');
    if (icon) {
        if (theme === 'dark') {
            icon.className = 'theme-toggle-icon fas fa-moon';
        } else {
            icon.className = 'theme-toggle-icon fas fa-sun';
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initTheme);

// Listen for system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}
