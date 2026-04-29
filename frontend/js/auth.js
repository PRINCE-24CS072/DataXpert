// Authentication Module - Fixed: No blur overlay, inline errors only

let googleAuthRetries = 0;
let googleAuthPolling = false;
const MAX_GOOGLE_AUTH_RETRIES = 50;
const GOOGLE_RETRY_INTERVAL = 50;

function getCurrentGoogleAction() {
    // New tab-based UI
    const loginTab = document.getElementById('loginTab');
    if (loginTab && loginTab.classList.contains('active')) return 'login';

    // Legacy modal system fallback
    const signupModal = document.getElementById('signupModal');
    if (signupModal && signupModal.style.display === 'block') return 'signup';
    return 'login';
}

function initGoogleAuth() {
    if (googleAuthPolling) return; // already polling — don't start a second loop
    if (googleAuthRetries >= MAX_GOOGLE_AUTH_RETRIES) {
        console.warn('Google Sign-In not available.');
        return;
    }
    const gsiReady = (typeof google !== 'undefined' && google.accounts) || window._gsiReady;
    if (gsiReady && typeof google !== 'undefined' && google.accounts) {
        googleAuthPolling = false;
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            renderGoogleButtons();
        } catch(e) {
            console.error('Google Auth init error:', e);
        }
    } else {
        googleAuthPolling = true;
        googleAuthRetries++;
        if (googleAuthRetries < MAX_GOOGLE_AUTH_RETRIES) {
            setTimeout(() => {
                googleAuthPolling = false;
                initGoogleAuth();
            }, GOOGLE_RETRY_INTERVAL);
        } else {
            googleAuthPolling = false;
        }
    }
}

function renderGoogleButtons() {
    const renderBtn = (container, text) => {
        if (!container || typeof google === 'undefined' || !google.accounts) {
            if (container) showFallbackButton(container, text);
            return;
        }
        container.innerHTML = '';
        try {
            google.accounts.id.renderButton(container, {
                theme: 'outline', size: 'large',
                width: container.offsetWidth || 320,
                text: text === 'Login' ? 'signin_with' : 'signup_with',
                shape: 'rectangular'
            });
        } catch(e) {
            showFallbackButton(container, text);
        }
    };
    renderBtn(document.getElementById('googleLoginBtn'), 'Login');
    renderBtn(document.getElementById('googleSignupBtn'), 'Sign Up');
}

function showFallbackButton(container, action) {
    container.innerHTML = `
        <button class="btn-ghost" style="width:100%;opacity:0.5;cursor:not-allowed;" disabled>
            <i class="fab fa-google"></i> ${action} with Google
        </button>
    `;
}

async function handleGoogleCallback(response) {
    const action = getCurrentGoogleAction();
    try {
        const result = await fetch(API_ENDPOINTS.GOOGLE_AUTH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential, action })
        });
        const data = await result.json();

        if (data.success) {
            setToken(data.token);
            setUser(data.user);
            showToast(data.message || 'Signed in successfully!', 'success');
            window.location.href = 'dashboard.html';
        } else {
            if (data.need_signup) {
                // REQ 12: Show inline error — do NOT auto-redirect or blur
                showInlineAuthError('loginError', 'No account found with this Google account. Please sign up first.');
                // After 1.5s offer to switch tab (no immediate redirect)
                setTimeout(() => {
                    if (typeof switchAuthTab === 'function') switchAuthTab('signup');
                }, 1800);
            } else if (data.already_exists) {
                showInlineAuthError('signupError', 'An account already exists with this Google account. Please login.');
                setTimeout(() => {
                    if (typeof switchAuthTab === 'function') switchAuthTab('login');
                }, 1800);
            } else {
                showInlineAuthError('loginError', data.message || 'Authentication failed. Please try again.');
            }
        }
    } catch(e) {
        console.error('Google auth error:', e);
        showInlineAuthError('loginError', 'Connection error. Please check your internet.');
    }
}

// ---- INLINE ERROR (STRICT: NO BLUR, NO OVERLAY) ----
function showInlineAuthError(elementId, message) {
    // REQ 2: Show field-level error with icon + shake the card (not full blur)
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('visible');
    }

    // Also update field-error elements if they exist (below specific inputs)
    // Map error container IDs to input groups
    const fieldErrorMap = {
        loginError: 'loginPassword',
        signupError: 'signupPassword'
    };
    const targetInputId = fieldErrorMap[elementId];
    if (targetInputId) {
        // Remove old field-error if present
        const existing = document.getElementById(elementId + '_field');
        if (existing) existing.remove();
        const input = document.getElementById(targetInputId);
        if (input && input.parentElement) {
            const fieldErr = document.createElement('p');
            fieldErr.className = 'field-error';
            fieldErr.id = elementId + '_field';
            fieldErr.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`;
            input.parentElement.insertAdjacentElement('afterend', fieldErr);
            setTimeout(() => { fieldErr.remove(); }, 4000);
        }
    }

    // REQ 2: Shake the auth-card (not the form — card level for full shake)
    const card = document.querySelector('.auth-card');
    if (card) {
        card.classList.remove('shake-card');
        void card.offsetWidth;
        card.classList.add('shake-card');
        setTimeout(() => card.classList.remove('shake-card'), 400);
    } else {
        // Fallback: shake form
        const form = el ? (el.closest('form') || el.closest('.auth-form')) : null;
        if (form) {
            form.classList.remove('shake');
            void form.offsetWidth;
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 400);
        }
    }

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
        if (el) { el.classList.remove('visible'); el.textContent = ''; }
    }, 4000);

    // Also show toast as secondary feedback
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    }
}

// OLD showMessage compat - routes to inline error on auth pages, toast elsewhere
function showMessage(message, type = 'info') {
    // Determine if we're on auth page
    const loginPanel = document.getElementById('loginPanel');
    const signupPanel = document.getElementById('signupPanel');

    if (type === 'error' && (loginPanel || signupPanel)) {
        // Show inline error - determine which panel is active
        if (loginPanel && loginPanel.style.display !== 'none') {
            showInlineAuthError('loginError', message);
        } else if (signupPanel && signupPanel.style.display !== 'none') {
            showInlineAuthError('signupError', message);
        } else {
            // Fallback to toast
            if (typeof showToast === 'function') showToast(message, type);
        }
    } else {
        if (typeof showToast === 'function') showToast(message, type);
    }
}

function clearMessages() {
    document.querySelectorAll('.auth-error-msg').forEach(el => {
        el.classList.remove('visible');
        el.textContent = '';
    });
}

// ---- EMAIL LOGIN ----
async function handleLogin(event) {
    event.preventDefault();
    clearMessages();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validate
    if (!email || !password) {
        showInlineAuthError('loginError', 'Please fill in all fields.');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showInlineAuthError('loginError', 'Please enter a valid email address.');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const orig = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    try {
        const response = await fetch(API_ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            setToken(data.token);
            setUser(data.user);
            // Remember email if checkbox checked
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('dx_remember_email', email);
            } else {
                localStorage.removeItem('dx_remember_email');
            }
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 400);
        } else {
            // REQ 6/12: STRICT — NO BLUR, NO OVERLAY — inline error only
            let errorMsg;
            if (data.need_signup || response.status === 404) {
                // REQ 12: User tried to login but has no account — show clear message
                errorMsg = 'No account found with this email. Please sign up first.';
            } else if (response.status === 401 || data.code === 'INVALID_PASSWORD' ||
                       (data.message && data.message.toLowerCase().includes('password'))) {
                errorMsg = 'Incorrect password. Please try again.';
            } else if (response.status === 403) {
                errorMsg = 'Your account is suspended. Please contact support.';
            } else {
                errorMsg = data.message || 'Login failed. Please check your credentials.';
            }
            showInlineAuthError('loginError', errorMsg);
            submitBtn.disabled = false;
            submitBtn.innerHTML = orig;
        }
    } catch(e) {
        let errorMsg = 'Connection error. Please check your internet.';
        if (!navigator.onLine) errorMsg = 'No internet connection. Please check your network.';
        showInlineAuthError('loginError', errorMsg);
        submitBtn.disabled = false;
        submitBtn.innerHTML = orig;
    }
}

// ---- EMAIL SIGNUP ----
async function handleSignup(event) {
    event.preventDefault();
    clearMessages();

    const username = document.getElementById('signupUsername').value.trim();
    const businessName = document.getElementById('signupBusinessName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!username || !email || !password) {
        showInlineAuthError('signupError', 'Please fill in all required fields.');
        return;
    }
    if (password.length < 6) {
        showInlineAuthError('signupError', 'Password must be at least 6 characters.');
        return;
    }
    if (password !== confirmPassword) {
        showInlineAuthError('signupError', 'Passwords do not match.');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const orig = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    try {
        const response = await fetch(API_ENDPOINTS.SIGNUP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, businessName, email, password, confirmPassword })
        });
        const data = await response.json();

        if (data.success) {
            setToken(data.token);
            setUser(data.user);
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Account created!';
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 400);
        } else {
            if (data.already_exists) {
                showInlineAuthError('signupError', 'An account with this email already exists. Please login.');
                setTimeout(() => {
                    if (typeof switchAuthTab === 'function') switchAuthTab('login');
                }, 1500);
            } else {
                showInlineAuthError('signupError', data.message || 'Signup failed. Please try again.');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = orig;
        }
    } catch(e) {
        showInlineAuthError('signupError', 'Connection error. Please check your internet.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = orig;
    }
}

// ---- AUTH VERIFICATION ----
async function verifyAuth() {
    if (!isLoggedIn()) return false;
    try {
        const response = await fetch(API_ENDPOINTS.VERIFY, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            setUser(data.user);
            return true;
        } else {
            logout();
            return false;
        }
    } catch(e) {
        console.error('Auth verification error:', e);
        return false; // Network error - don't logout
    }
}

// ---- PROFILE SETUP ----
let profileSetupImageFile = null;

function showProfileSetupModal(user) {
    const modal = document.getElementById('profileSetupModal');
    if (!modal) { window.location.href = 'dashboard.html'; return; }
    const fullNameInput = document.getElementById('setupFullName');
    if (fullNameInput && user && user.name) fullNameInput.value = user.name;
    const previewImg = document.getElementById('setupProfilePreview');
    if (previewImg && user && user.name) {
        previewImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff&size=200`;
    }
    modal.classList.add('open');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
}

function setupProfileImagePreview() {
    const fileInput = document.getElementById('setupProfileImageInput');
    const previewImg = document.getElementById('setupProfilePreview');
    if (fileInput && previewImg) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image must be less than 5MB', 'error');
                return;
            }
            profileSetupImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => { previewImg.src = e.target.result; };
            reader.readAsDataURL(file);
        });
    }
}

async function handleProfileSetup(event) {
    event.preventDefault();
    const fullName = document.getElementById('setupFullName').value.trim();
    if (!fullName) { showToast('Full name is required', 'error'); return; }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const orig = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving...';

    try {
        const res = await fetch(API_ENDPOINTS.USER_PROFILE, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: fullName })
        });
        const profileData = await res.json();
        if (!profileData.success) {
            showToast(profileData.message || 'Failed to update profile', 'error');
            submitBtn.disabled = false; submitBtn.innerHTML = orig; return;
        }
        let user = getUser() || {};
        user.name = fullName;
        if (profileSetupImageFile) {
            const formData = new FormData();
            formData.append('profile_image', profileSetupImageFile);
            const imgRes = await fetch(API_ENDPOINTS.UPLOAD_PROFILE_IMAGE, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            const imgData = await imgRes.json();
            if (imgData.success && imgData.profile_image) user.profile_image = imgData.profile_image;
        }
        setUser(user);
        const modal = document.getElementById('profileSetupModal');
        if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
        window.location.href = 'dashboard.html';
    } catch(e) {
        showToast('Error setting up profile. Please try again.', 'error');
        submitBtn.disabled = false; submitBtn.innerHTML = orig;
    }
}

function skipProfileSetup() {
    const modal = document.getElementById('profileSetupModal');
    if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
    window.location.href = 'dashboard.html';
}

// Google profile completion
async function handleGoogleProfileCompletion(event) {
    event.preventDefault();
    const businessName = document.getElementById('googleBusinessName').value.trim();
    const password = document.getElementById('googlePassword').value;
    const confirmPassword = document.getElementById('googleConfirmPassword').value;
    if (!businessName) { showToast('Business name is required', 'error'); return; }
    if (password && password !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    if (password && password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    const incompleteUserData = sessionStorage.getItem('incomplete_user');
    if (!incompleteUserData) { showToast('Session expired. Please login again.', 'error'); return; }
    const user = JSON.parse(incompleteUserData);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/complete-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, businessName, password: password || null, confirmPassword: confirmPassword || null })
        });
        const data = await response.json();
        if (data.success) {
            sessionStorage.removeItem('incomplete_user');
            setToken(data.token);
            setUser(data.user);
            localStorage.removeItem('dataxpert_needs_profile_completion');
            window.location.href = 'dashboard.html';
        } else { showToast(data.message || 'Failed to complete profile', 'error'); }
    } catch(e) { showToast('Error completing profile. Please try again.', 'error'); }
}

function skipProfileCompletion() {
    const modal = document.getElementById('googleProfileModal');
    if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
    window.location.href = 'dashboard.html';
}

// showInlineError alias (used in index.html)
window.showInlineError = showInlineAuthError;

// ---- INIT ----
// onGoogleLibraryLoad fires the instant GSI SDK is ready — zero polling delay
window.onGoogleLibraryLoad = function () {
    googleAuthPolling = false;
    googleAuthRetries = 0;
    initGoogleAuth();
};

// Try Google auth immediately (SDK may already be loaded before DOMContentLoaded)
initGoogleAuth();

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleProfileForm = document.getElementById('googleProfileForm');
    const profileSetupForm = document.getElementById('profileSetupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (googleProfileForm) googleProfileForm.addEventListener('submit', handleGoogleProfileCompletion);
    if (profileSetupForm) { profileSetupForm.addEventListener('submit', handleProfileSetup); setupProfileImagePreview(); }

    // Auto-fill remembered email
    const remembered = localStorage.getItem('dx_remember_email') || localStorage.getItem('dataxpert_remember_email');
    if (remembered) {
        const el = document.getElementById('loginEmail');
        if (el) el.value = remembered;
    }

    // Dismiss error on input change
    document.querySelectorAll('#loginEmail, #loginPassword').forEach(input => {
        input.addEventListener('input', () => {
            const err = document.getElementById('loginError');
            if (err) { err.classList.remove('visible'); err.textContent = ''; }
        });
    });
    document.querySelectorAll('#signupUsername, #signupEmail, #signupPassword, #confirmPassword').forEach(input => {
        input.addEventListener('input', () => {
            const err = document.getElementById('signupError');
            if (err) { err.classList.remove('visible'); err.textContent = ''; }
        });
    });

    // Re-try Google auth in case it wasn't ready yet when first called
    if (typeof google === 'undefined' || !google.accounts) {
        initGoogleAuth();
    }
});
