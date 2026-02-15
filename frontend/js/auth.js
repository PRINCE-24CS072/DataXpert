// Authentication Module

// Google Auth retry counter
let googleAuthRetries = 0;
const MAX_GOOGLE_AUTH_RETRIES = 10;

// Track current Google action (login or signup)
let currentGoogleAction = 'login';

// Initialize Google Sign-In
function initGoogleAuth() {
    if (googleAuthRetries >= MAX_GOOGLE_AUTH_RETRIES) {
        console.warn('Google Sign-In library failed to load after multiple attempts. Using email/password auth only.');
        return;
    }
    
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
            console.log('✅ Google Auth initialized successfully');
        } catch (error) {
            console.error('Google Auth initialization error:', error);
        }
    } else {
        googleAuthRetries++;
        if (googleAuthRetries < MAX_GOOGLE_AUTH_RETRIES) {
            setTimeout(initGoogleAuth, 500); // Retry after 500ms
        } else {
            console.warn('Google Sign-In not available. Email/password authentication is still working.');
        }
    }
}

// Render Google Sign-In Buttons
function renderGoogleButtons() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleSignupBtn = document.getElementById('googleSignupBtn');

    if (googleLoginBtn && typeof google !== 'undefined' && google.accounts) {
        try {
            // Clear previous content
            googleLoginBtn.innerHTML = '';
            // Set action to login when this button is used
            googleLoginBtn.onclick = () => { currentGoogleAction = 'login'; };
            
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
            console.log('✅ Login button rendered');
        } catch (error) {
            console.error('Error rendering login button:', error);
            showFallbackButton(googleLoginBtn, 'Login');
        }
    } else if (googleLoginBtn) {
        showFallbackButton(googleLoginBtn, 'Login');
    }

    if (googleSignupBtn && typeof google !== 'undefined' && google.accounts) {
        try {
            // Clear previous content
            googleSignupBtn.innerHTML = '';
            // Set action to signup when this button is used
            googleSignupBtn.onclick = () => { currentGoogleAction = 'signup'; };
            
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
            console.log('✅ Signup button rendered');
        } catch (error) {
            console.error('Error rendering signup button:', error);
            showFallbackButton(googleSignupBtn, 'Sign Up');
        }
    } else if (googleSignupBtn) {
        showFallbackButton(googleSignupBtn, 'Sign Up');
    }
}

// Show fallback button when Google isn't available
function showFallbackButton(container, action) {
    container.innerHTML = `
        <button class="btn btn-secondary btn-full" style="opacity: 0.5; cursor: not-allowed;" disabled>
            <i class="fab fa-google"></i> ${action} with Google (Coming Soon)
        </button>
    `;
}

// Handle Google OAuth Callback
async function handleGoogleCallback(response) {
    console.log('Google callback received, action:', currentGoogleAction);
    
    try {
        const result = await fetch(API_ENDPOINTS.GOOGLE_AUTH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: response.credential,
                action: currentGoogleAction  // Pass 'login' or 'signup'
            })
        });

        const data = await result.json();
        console.log('Backend response:', data);

        if (data.success) {
            // Check if profile needs completion
            if (data.profile_incomplete) {
                // Store user data temporarily
                sessionStorage.setItem('incomplete_user', JSON.stringify(data.user));
                
                // Populate user info in the profile completion form
                const usernameField = document.getElementById('googleUsername');
                const emailField = document.getElementById('googleEmail');
                
                if (usernameField && data.user.name) {
                    usernameField.value = data.user.name;
                }
                if (emailField && data.user.email) {
                    emailField.value = data.user.email;
                }
                
                // Close other modals
                closeAllModals();
                // Show profile completion modal
                document.getElementById('googleProfileModal').style.display = 'block';
                showMessage('Please complete your profile to continue', 'info');
            } else {
                // Profile complete, proceed with login
                localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
                
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }
        } else {
            // Handle different error scenarios
            if (data.need_signup) {
                // User tried to login but doesn't exist
                showMessage('No account found with this email. Please sign up first', 'error');
                // Switch to signup modal after 2 seconds
                setTimeout(() => {
                    document.getElementById('loginModal').style.display = 'none';
                    document.getElementById('signupModal').style.display = 'block';
                }, 2000);
            } else if (data.already_exists) {
                // User tried to signup but already exists
                showMessage('An account with this email already exists. Please login instead', 'error');
                // Switch to login modal after 2 seconds
                setTimeout(() => {
                    document.getElementById('signupModal').style.display = 'none';
                    document.getElementById('loginModal').style.display = 'block';
                }, 2000);
            } else {
                showMessage(data.message || 'Google authentication failed', 'error');
            }
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
    const businessName = document.getElementById('signupBusinessName').value;
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
                businessName,
                email,
                password,
                confirmPassword
            })
        });

        // Parse JSON response regardless of status code
        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error('Failed to parse response:', e);
            showMessage('Server error. Please try again.', 'error');
            return;
        }

        if (data.success) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            showMessage('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Show the specific error message from backend
            showMessage(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        // Check if it's a network error
        if (error.message === 'Failed to fetch' || !navigator.onLine) {
            showMessage('Cannot connect to server. Please make sure the backend is running.', 'error');
        } else {
            showMessage('Signup error. Please try again.', 'error');
        }
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
            // Check if user needs to sign up first
            if (data.need_signup) {
                showMessage('No account found with this email. Please sign up first', 'error');
                // Optionally switch to signup modal after 2 seconds
                setTimeout(() => {
                    document.getElementById('loginModal').style.display = 'none';
                    document.getElementById('signupModal').style.display = 'block';
                }, 2000);
            } else if (data.profile_incomplete) {
                showMessage('Please complete your signup first', 'error');
            } else {
                showMessage(data.message || 'Login failed', 'error');
            }
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
    
    // Create message content
    const messageText = document.createElement('span');
    messageText.textContent = message;
    messageText.style.flex = '1';
    
    messageDiv.appendChild(messageText);
    
    document.body.appendChild(messageDiv);

    // Auto remove after duration based on message type
    const duration = type === 'error' ? 5000 : type === 'success' ? 3000 : 4000;
    
    const timeoutId = setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 300);
    }, duration);
    
    // Allow manual dismiss by clicking
    messageDiv.style.cursor = 'pointer';
    messageDiv.addEventListener('click', () => {
        clearTimeout(timeoutId);
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 300);
    });
}

// Google Profile Completion Handler
async function handleGoogleProfileCompletion(event) {
    event.preventDefault();
    
    const businessName = document.getElementById('googleBusinessName').value;
    const password = document.getElementById('googlePassword').value;
    const confirmPassword = document.getElementById('googleConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    // Get user data from session storage
    const incompleteUserData = sessionStorage.getItem('incomplete_user');
    if (!incompleteUserData) {
        showMessage('Session expired. Please try again.', 'error');
        document.getElementById('googleProfileModal').style.display = 'none';
        return;
    }
    
    const user = JSON.parse(incompleteUserData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/complete-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                businessName,
                password,
                confirmPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear session storage
            sessionStorage.removeItem('incomplete_user');
            
            // Store tokens
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            showMessage('Profile completed! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Failed to complete profile', 'error');
        }
    } catch (error) {
        console.error('Profile completion error:', error);
        showMessage('Error completing profile. Please try again.', 'error');
    }
}

// Close all modals utility
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up auth...');
    
    // Setup form handlers
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleProfileForm = document.getElementById('googleProfileForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (googleProfileForm) {
        googleProfileForm.addEventListener('submit', handleGoogleProfileCompletion);
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
