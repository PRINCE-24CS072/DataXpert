// Theme Management Module
const THEME_KEY = 'dataxpert_theme';

function initTheme() {
    // Default to DARK theme for new "Obsidian Pro" design
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggleIcon(theme);
    // Sync preferences toggle on profile page
    const prefToggle = document.getElementById('themePreference');
    if (prefToggle) prefToggle.checked = theme === 'dark';
}

function toggleTheme() {
    const currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function updateThemeToggleIcon(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    // SVG for sun (light mode) or moon (dark mode)
    if (theme === 'dark') {
        btn.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
        btn.title = 'Switch to light mode';
    } else {
        btn.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
        btn.title = 'Switch to dark mode';
    }
}

// Setup theme toggle button
function setupThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.addEventListener('click', toggleTheme);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupThemeToggle();
});

// Listen for system theme preference changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}
