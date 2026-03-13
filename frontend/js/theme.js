// ============================================================
// DataXpert – theme.js
// Dark-first theme manager with IIFE + persistence
// ============================================================

(function ThemeManager() {
    const THEME_KEY = 'dx_theme';

    const MOON_SVG = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
    const SUN_SVG  = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;

    function getTheme() {
        return localStorage.getItem(THEME_KEY) || 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateIcon(theme);
        // Sync profile page preference toggle if present
        const el = document.getElementById('themePreference');
        if (el) el.checked = theme === 'dark';
    }

    function updateIcon(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.innerHTML = theme === 'dark' ? MOON_SVG : SUN_SVG;
        btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }

    function toggle() {
        applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    }

    function init() {
        applyTheme(getTheme()); // apply immediately (no flash)
        const btn = document.getElementById('themeToggle');
        if (btn) btn.addEventListener('click', toggle);
    }

    // Expose globally for profile page preference toggle
    window.toggleTheme = toggle;
    window.setTheme    = applyTheme;
    window.initTheme   = init;

    // Apply theme immediately to prevent flash, then wire button on DOM ready
    applyTheme(getTheme());
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Respect system preference changes only when user has no explicit choice
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(THEME_KEY)) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
})();
