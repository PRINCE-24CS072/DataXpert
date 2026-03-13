// ============================================
// DataXpert - Main JS
// Includes: DataCache, Toast System, Home Page
// ============================================

// ---- DATA CACHE SYSTEM ----
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
        } catch(e) { /* storage quota exceeded - ignore */ }
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

// ---- TOAST NOTIFICATION SYSTEM ----
const toastQueue = [];
const MAX_TOASTS = 3;

function showToast(message, type = 'success', title = '', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Fallback if no toast container
        console.log(`[Toast ${type}]: ${message}`);
        return;
    }

    // Remove oldest if at max
    while (toastQueue.length >= MAX_TOASTS) {
        const oldest = toastQueue.shift();
        if (oldest && oldest.parentNode) {
            oldest.classList.add('removing');
            setTimeout(() => oldest.remove(), 250);
        }
    }

    const icons = {
        success: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="color:var(--accent-green)"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="color:var(--accent-red)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        warning: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="color:var(--accent-amber)"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="color:var(--accent-blue)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const defaultTitles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${title || defaultTitles[type]}</div>
            <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-close" onclick="dismissToast(this.parentElement)">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    container.appendChild(toast);
    toastQueue.push(toast);

    // Click to dismiss
    toast.addEventListener('click', () => dismissToast(toast));

    // Auto-dismiss
    setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
        const idx = toastQueue.indexOf(toast);
        if (idx > -1) toastQueue.splice(idx, 1);
    }, 250);
}

// Legacy showMessage compatibility (used by auth.js and other files)
function showMessage(message, type = 'info') {
    const typeMap = { 'success': 'success', 'error': 'error', 'info': 'info', 'warning': 'warning' };
    showToast(message, typeMap[type] || 'info');
}

// clearMessages compatibility
function clearMessages() {
    const container = document.getElementById('toastContainer');
    if (container) container.innerHTML = '';
    toastQueue.length = 0;
}

// ---- MODAL HELPERS ----
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modal.classList.contains('modal-overlay')) {
        modal.classList.add('open');
    } else {
        modal.style.display = 'block';
        const content = modal.querySelector('.modal-content');
        if (content) setTimeout(() => content.classList.add('show'), 10);
    }
    if (typeof renderGoogleButtons === 'function') {
        setTimeout(renderGoogleButtons, 100);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modal.classList.contains('modal-overlay')) {
        modal.classList.remove('open');
    } else {
        const content = modal.querySelector('.modal-content');
        if (content) content.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

// ---- HOME PAGE LOGIC (only runs on index.html) ----
function setupHomePage() {
    // Only run if login/signup buttons exist (home page)
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (typeof switchAuthTab === 'function') switchAuthTab('login');
            else openModal('loginModal');
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            if (typeof switchAuthTab === 'function') switchAuthTab('signup');
            else openModal('signupModal');
        });
    }

    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            if (isAuthenticated()) {
                window.location.href = 'dashboard.html';
            } else {
                if (typeof switchAuthTab === 'function') switchAuthTab('signup');
                else openModal('signupModal');
            }
        });
    }

    const demoBtnHero = document.getElementById('demoBtnHero');
    if (demoBtnHero) {
        demoBtnHero.addEventListener('click', () => {
            if (isAuthenticated()) {
                window.location.href = 'analysis.html';
            } else {
                showToast('Please login to try the demo', 'info');
                setTimeout(() => {
                    if (typeof switchAuthTab === 'function') switchAuthTab('login');
                }, 800);
            }
        });
    }

    // Switch tab links
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToSignup) {
        switchToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof switchAuthTab === 'function') switchAuthTab('signup');
            else { closeModal('loginModal'); openModal('signupModal'); }
        });
    }
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof switchAuthTab === 'function') switchAuthTab('login');
            else { closeModal('signupModal'); openModal('loginModal'); }
        });
    }

    // Close modals on outside click (legacy modal system)
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ---- NAVBAR SETUP (for inner pages) ----
function setupNavbar() {
    // Avatar dropdown
    const avatarWrap = document.getElementById('avatarWrap');
    if (avatarWrap) {
        avatarWrap.addEventListener('click', (e) => {
            e.stopPropagation();
            avatarWrap.classList.toggle('open');
        });
        document.addEventListener('click', () => {
            avatarWrap.classList.remove('open');
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (typeof logout === 'function') logout();
        });
    }

    // Notification bell (placeholder)
    const notifBtn = document.getElementById('notificationBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            showToast('No new notifications', 'info');
        });
    }
}

// ---- PROFILE COMPLETION BANNER (dashboard) ----
function checkProfileCompletion() {
    const showBanner = localStorage.getItem('dataxpert_show_banner');
    const dismissed = sessionStorage.getItem('dataxpert_banner_dismissed');
    // Silently mark as seen - no banner in new design (users go to profile page)
    if (showBanner) localStorage.removeItem('dataxpert_show_banner');
}

function dismissProfileBanner() {
    const banner = document.getElementById('profileCompletionBanner');
    if (banner) banner.style.display = 'none';
    sessionStorage.setItem('dataxpert_banner_dismissed', 'true');
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    setupHomePage();
    setupNavbar();
});
