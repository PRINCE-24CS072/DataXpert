// Authentication Module

// Initialize Google Sign-In
function initGoogleAuth() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback
        });
    }
}

// Handle Google OAuth Callback
async function handleGoogleCallback(response) {
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

// Google Login Button Handler
function setupGoogleButtons() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleSignupBtn = document.getElementById('googleSignupBtn');

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            if (typeof google !== 'undefined' && google.accounts) {
                google.accounts.id.prompt();
            } else {
                showMessage('Google Sign-In not loaded', 'error');
            }
        });
    }

    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', () => {
            if (typeof google !== 'undefined' && google.accounts) {
                google.accounts.id.prompt();
            } else {
                showMessage('Google Sign-In not loaded', 'error');
            }
        });
    }
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
    // Setup form handlers
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Setup Google buttons
    setupGoogleButtons();
    initGoogleAuth();
});
