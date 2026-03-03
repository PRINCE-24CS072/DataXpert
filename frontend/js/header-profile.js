// Instant Header Profile Loading
// Loads user profile in header across all pages instantly

(function() {
    // Load profile from localStorage immediately (no network call)
    function loadHeaderProfile() {
        const userStr = localStorage.getItem('dataxpert_user');
        if (!userStr) return;
        
        try {
            const user = JSON.parse(userStr);
            
            // Update name
            const nameEl = document.getElementById('userName');
            if (nameEl) nameEl.textContent = user.name || 'User';
            
            // Update email (small text under name)
            const emailEl = document.getElementById('userEmail');
            if (emailEl) emailEl.textContent = user.email || '';
            
            // Update avatar
            const avatarImg = document.getElementById('userAvatar');
            const avatarFallback = document.getElementById('avatarFallback');
            
            if (user.profile_image && avatarImg) {
                avatarImg.src = user.profile_image;
                avatarImg.style.display = 'block';
                if (avatarFallback) avatarFallback.style.display = 'none';
            } else if (avatarFallback) {
                if (avatarImg) avatarImg.style.display = 'none';
                avatarFallback.style.display = 'flex';
            }
        } catch (e) {
            console.error('Error loading header profile:', e);
        }
    }
    
    // Run immediately when script loads (before DOMContentLoaded)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeaderProfile);
    } else {
        loadHeaderProfile();
    }
    
    // Export for use in other scripts
    window.loadHeaderProfile = loadHeaderProfile;
})();
