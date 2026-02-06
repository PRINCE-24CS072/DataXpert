// Authentication Module

// Initialize Google Sign-In
function initGoogleAuth() {
    console.log('Initializing Google Auth...');
    
    if (typeof google !== 'undefined' && google.accounts) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            
            // Render Google buttons
            renderGoogleButtons();
            console.log('Google Auth initialized successfully');
        } catch (error) {
            console.error('Google Auth initialization error:', error);
        }
    } else {
        console.error('Google Sign-In library not loaded');
        setTimeout(initGoogleAuth, 500); // Retry after 500ms
    }
}

// Render Google Sign-In Buttons
function renderGoogleButtons() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleSignupBtn = document.getElementById('googleSignupBtn');

    if (googleLoginBtn && typeof google !== 'undefined' && google.accounts) {
        try {
            google.accounts.id.renderButton(
                googleLoginBtn,
                {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'signin_with',
                    shape: 'rectangular'
                }
            );
            console.log('Login button rendered');
        } catch (error) {
            console.error('Error rendering login button:', error);
        }
    }

    if (googleSignupBtn && typeof google !== 'undefined' && google.accounts) {
        try {
            google.accounts.id.renderButton(
                googleSignupBtn,
                {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'signup_with',
                    shape: 'rectangular'
                }
            );
            console.log('Signup button rendered');
        } catch (error) {
            console.error('Error rendering signup button:', error);
        }
    }
}

// Handle Google OAuth Callback
async function handleGoogleCallback(response) {
    console.log('Google callback received');
    
    try {
        const result = await fetch(API_ENDPOINTS.GOOGLE_AUTH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: response.credential
            })
        });

        const data = await result.json();
        console.log('Backend response:', data);

        if (data.success) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Google authentication failed', 'error');
        }
    } catch (error) {
        console.error('Google auth error:', error);
        showMessage('Authentication error. Please try again.', 'error');
    }
}

// Google Login Button Handler (Backup - if rendering fails)
function setupGoogleButtons() {
    // This is now handled by renderGoogleButtons()
    // Keeping for backwards compatibility
    console.log('Google buttons setup complete');
}

// Email/Password Signup
async function handleSignup(event) {
    event.preventDefault();
    
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(API_ENDPOINTS.SIGNUP, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                confirmPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            showMessage('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Signup error. Please try again.', 'error');
    }
}

// Email/Password Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(API_ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login error. Please try again.', 'error');
    }
}

// Verify Token
async function verifyAuth() {
    if (!isAuthenticated()) {
        return false;
    }

    try {
        const response = await fetch(API_ENDPOINTS.VERIFY, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            return true;
        } else {
            logout();
            return false;
        }
    } catch (error) {
        console.error('Auth verification error:', error);
        return false;
    }
}

// Show Message
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMsg = document.querySelector('.message-toast');
    if (existingMsg) {
        existingMsg.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-toast message-${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up auth...');
    
    // Setup form handlers
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Initialize Google Auth (with retry mechanism)
    initGoogleAuth();
    
    // Also try to initialize when modal opens (in case library loads late)
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            setTimeout(renderGoogleButtons, 100);
        });
    }
    
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            setTimeout(renderGoogleButtons, 100);
        });
    }
});
