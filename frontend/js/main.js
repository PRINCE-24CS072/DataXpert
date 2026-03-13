// ============================================
// DataXpert - Main JS
// Includes: DataCache, Toast System, Home Page
// ============================================

// DataCache is defined in config.js (loaded before main.js)

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

// ---- NUMBER / DATE FORMATTERS ----

/** Format a number as Indian Rupee string — e.g. ₹1,23,456 */
function formatINR(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '₹0';
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Compact INR — ₹1.2L, ₹3.4Cr */
function formatINRCompact(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '₹0';
    if (Math.abs(num) >= 1e7) return '₹' + (num / 1e7).toFixed(2) + 'Cr';
    if (Math.abs(num) >= 1e5) return '₹' + (num / 1e5).toFixed(2) + 'L';
    if (Math.abs(num) >= 1e3) return '₹' + (num / 1e3).toFixed(1) + 'K';
    return '₹' + num.toFixed(0);
}

/** Format date string to readable format — '2024-01-15' → 'Jan 15, 2024' */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch(e) { return dateStr; }
}

/** Returns true if the string is a valid date */
function isValidDate(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
}

// ---- ANIMATE COUNT-UP ----
/**
 * Animate a DOM element counting from 0 to `target` over `duration` ms.
 * @param {HTMLElement} el - The element whose textContent to update
 * @param {number} target
 * @param {number} [duration=1000]
 * @param {Function} [formatter] - optional value formatter
 */
function animateCountUp(el, target, duration = 1000, formatter = null) {
    if (!el) return;
    const start = Date.now();
    const startVal = parseFloat(el.getAttribute('data-start') || '0');
    const fmt = formatter || (v => Math.round(v).toLocaleString('en-IN'));
    const step = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = fmt(startVal + (target - startVal) * ease);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target);
    };
    requestAnimationFrame(step);
}

// ---- CSV UTILITIES ----

/** Download a CSV template for business data import */
function downloadCSVTemplate() {
    const headers = 'date,category,sales,expenses,profit,description';
    const sample = '2024-01-15,Electronics,150000,80000,70000,Sample entry';
    const csv = [headers, sample].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataxpert_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('Template downloaded', 'success');
}

/**
 * Export an array of objects as a CSV file.
 * @param {Array<Object>} data
 * @param {string} [filename='export.csv']
 */
function exportToCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
        if (typeof showToast === 'function') showToast('No data to export', 'warning');
        return;
    }
    const cols = Object.keys(data[0]);
    const rows = data.map(row => cols.map(c => {
        const v = row[c] == null ? '' : String(row[c]);
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','));
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('CSV exported', 'success');
}

/**
 * downloadTemplate()
 * Primary CSV template download function (required public API).
 * Dynamically generates a .csv file with proper column headers and
 * 2 formatted example rows, then auto-downloads via Blob URL.
 * Columns: date, category, sales, expenses, profit, description
 */
function downloadTemplate() {
    const headers = 'date,category,sales,expenses,profit,description';
    const row1    = '2024-01-15,Electronics,150000,80000,70000,January electronics sales';
    const row2    = '2024-02-10,Services,95000,42000,53000,February consulting services';
    const csv     = [headers, row1, row2].join('\n');
    const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = 'dataxpert_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') {
        showToast('Template downloaded — fill in your data and upload via Dashboard', 'success');
    }
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    setupHomePage();
    setupNavbar();
});
