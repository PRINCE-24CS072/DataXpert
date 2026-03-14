// ============================================================
// DataXpert – header-profile.js
// Loads user data into navbar; wires hamburger + dropdown
// ============================================================

(function HeaderProfile() {

    // ── Load user data into navbar elements ──────────────────
    function loadHeaderProfile() {
        const user = (typeof getUser === 'function') ? getUser() : null;
        if (!user) return;

        // Name + email in dropdown
        const nameEl  = document.getElementById('dropdownName');
        const emailEl = document.getElementById('dropdownEmail');
        if (nameEl)  nameEl.textContent  = user.name  || 'User';
        if (emailEl) emailEl.textContent = user.email || '';

        // Username next to avatar
        const usernameEl = document.getElementById('navUsername');
        if (usernameEl) usernameEl.textContent = user.name || 'User';

        // Initials
        const name     = user.name || 'U';
        const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
        const initialsEl = document.getElementById('navAvatarInitials');
        if (initialsEl) initialsEl.textContent = initials;

        // Avatar photo
        const avatarImg = document.getElementById('navAvatarImg');
        if (avatarImg) {
            if (user.profile_image) {
                avatarImg.src = user.profile_image;
                avatarImg.style.display = 'block';
                if (initialsEl) initialsEl.style.display = 'none';
            } else {
                avatarImg.style.display = 'none';
                if (initialsEl) initialsEl.style.display = 'flex';
            }
        }

        // Legacy element support
        const legacyName  = document.getElementById('userName');
        const legacyEmail = document.getElementById('userEmail');
        if (legacyName)  legacyName.textContent  = user.name  || 'User';
        if (legacyEmail) legacyEmail.textContent = user.email || '';

        const legacyAvatar = document.getElementById('userAvatar');
        if (legacyAvatar && user.profile_image) {
            legacyAvatar.src = user.profile_image;
            legacyAvatar.style.display = 'block';
            const fallback = document.getElementById('avatarFallback');
            if (fallback) fallback.style.display = 'none';
        }
    }

    // ── Hamburger / Mobile Menu ───────────────────────────────
    function setupHamburger() {
        const btn     = document.getElementById('hamburgerBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (!btn || !mobileMenu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = mobileMenu.classList.toggle('open');
            btn.setAttribute('aria-expanded', open);
            btn.classList.toggle('active', open);
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && e.target !== btn) {
                mobileMenu.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
                btn.classList.remove('active');
            }
        });

        // Close on nav link click
        mobileMenu.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                btn.classList.remove('active');
            });
        });
    }

    // ── Avatar Dropdown ───────────────────────────────────────
    function setupDropdown() {
        const wrap = document.getElementById('avatarWrap');
        const avatar = document.getElementById('navAvatar');
        if (!wrap || !avatar) return;

        // Click on avatar goes directly to profile page
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'profile.html';
        });

        // Click on username opens dropdown
        const username = document.getElementById('navUsername');
        if (username) {
            username.addEventListener('click', (e) => {
                e.stopPropagation();
                wrap.classList.toggle('open');
            });
        }

        document.addEventListener('click', () => wrap.classList.remove('open'));
    }

    // ── Logout ────────────────────────────────────────────────
    function setupLogout() {
        document.querySelectorAll('#logoutBtn, .logout-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof logout === 'function') logout();
            });
        });
    }

    // ── Notification Bell (placeholder) ──────────────────────
    function setupNotifications() {
        const btn = document.getElementById('notificationBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                if (typeof showToast === 'function') showToast('No new notifications', 'info');
            });
        }
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        loadHeaderProfile();
        setupHamburger();
        setupDropdown();
        setupLogout();
        setupNotifications();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external refresh (e.g., after profile update)
    window.loadHeaderProfile = loadHeaderProfile;
})();
