// Header Profile Module
// Loads user profile into navbar dropdown and avatar

(function() {
    function loadHeaderProfile() {
        const userStr = localStorage.getItem('dataxpert_user');
        if (!userStr) return;

        let user;
        try { user = JSON.parse(userStr); } catch(e) { return; }

        // Name
        const nameEl = document.getElementById('dropdownName');
        if (nameEl) nameEl.textContent = user.name || 'User';

        // Email
        const emailEl = document.getElementById('dropdownEmail');
        if (emailEl) emailEl.textContent = user.email || '';

        // Avatar initials
        const name = user.name || 'U';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

        const initialsEl = document.getElementById('navAvatarInitials');
        if (initialsEl) initialsEl.textContent = initials;

        // Avatar image
        const avatarImg = document.getElementById('navAvatarImg');
        if (avatarImg && user.profile_image) {
            avatarImg.src = user.profile_image;
            avatarImg.style.display = 'block';
            if (initialsEl) initialsEl.style.display = 'none';
        } else if (avatarImg) {
            avatarImg.style.display = 'none';
            if (initialsEl) initialsEl.style.display = 'flex';
        }

        // Legacy: also update old header elements if present
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = user.name || 'User';

        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = user.email || '';

        const oldAvatarImg = document.getElementById('userAvatar');
        if (oldAvatarImg && user.profile_image) {
            oldAvatarImg.src = user.profile_image;
            oldAvatarImg.style.display = 'block';
            const fallback = document.getElementById('avatarFallback');
            if (fallback) fallback.style.display = 'none';
        }
    }

    // Run immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeaderProfile);
    } else {
        loadHeaderProfile();
    }

    // Export
    window.loadHeaderProfile = loadHeaderProfile;
})();
