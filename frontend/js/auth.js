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
            // Store tokens - user can now access dashboard
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            // Cache initial stats if available
            if (data.stats) {
                localStorage.setItem('dataxpert_cached_stats', JSON.stringify(data.stats));
            }
            
            // Check if profile needs completion (missing business name)
            if (data.needs_profile_completion) {
                // Store flag for profile completion banner
                localStorage.setItem('dataxpert_needs_profile_completion', 'true');
                showMessage('Welcome! Please complete your profile to get the best experience.', 'info');
            } else {
                showMessage('Login successful! Redirecting...', 'success');
            }
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
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
    
    // Clear any previous error messages
    clearMessages();
    
    const username = document.getElementById('signupUsername').value.trim();
    const businessName = document.getElementById('signupBusinessName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate required fields
    if (!username) {
        showMessage('Username is required', 'error');
        return;
    }

    if (!businessName) {
        showMessage('Business name is required', 'error');
        return;
    }

    if (!email) {
        showMessage('Email is required', 'error');
        return;
    }

    if (!password) {
        showMessage('Password is required', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    console.log('Attempting signup for:', email);
    
    // Get submit button and add loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    
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

        console.log('Response status:', response.status);
        
        // Parse JSON response regardless of status code
        let data;
        try {
            data = await response.json();
            console.log('Response data:', data);
        } catch (e) {
            console.error('Failed to parse response:', e);
            showMessage('Server error. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        if (data.success) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            // Cache initial stats to avoid extra API call
            if (data.stats) {
                localStorage.setItem('dataxpert_cached_stats', JSON.stringify(data.stats));
            }
            
            // Check if business name is missing - suggest completing profile
            if (!data.user.business_name) {
                localStorage.setItem('dataxpert_needs_profile_completion', 'true');
            }
            
            showMessage('Account created successfully! ✓ Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Show the specific error message from backend
            console.error('Signup failed:', data.message);
            showMessage(data.message || 'Signup failed. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        console.error('Signup error:', error);
        // Check if it's a network error
        if (error.message === 'Failed to fetch' || !navigator.onLine) {
            showMessage('Cannot connect to server. Please check your internet connection.', 'error');
        } else {
            showMessage('An error occurred during signup. Please try again.', 'error');
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Email/Password Login
async function handleLogin(event) {
    event.preventDefault();
    
    // Clear any previous error messages
    clearMessages();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validate required fields
    if (!email) {
        showMessage('Email is required', 'error');
        return;
    }

    if (!password) {
        showMessage('Password is required', 'error');
        return;
    }

    // Get submit button and add loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

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
            
            // Cache initial stats to avoid extra API call
            if (data.stats) {
                localStorage.setItem('dataxpert_cached_stats', JSON.stringify(data.stats));
            }
            
            showMessage('Login successful! ✓ Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Check if user needs to sign up first
            if (data.need_signup) {
                showMessage('No account found with this email. Please sign up first', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                // Optionally switch to signup modal after 2 seconds
                setTimeout(() => {
                    closeModal('loginModal');
                    openModal('signupModal');
                }, 2500);
            } else if (data.profile_incomplete) {
                showMessage('Please complete your signup first', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            } else {
                showMessage(data.message || 'Login failed. Please check your credentials.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.message === 'Failed to fetch' || !navigator.onLine) {
            showMessage('Cannot connect to server. Please check your internet connection.', 'error');
        } else {
            showMessage('An error occurred during login. Please try again.', 'error');
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
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
// Clear all error messages (useful when switching modals)
function clearMessages() {
    const existingMsg = document.querySelector('.message-toast');
    if (existingMsg) {
        existingMsg.remove();
    }
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    clearMessages();

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
    
    const businessName = document.getElementById('googleBusinessName').value.trim();
    const password = document.getElementById('googlePassword').value;
    const confirmPassword = document.getElementById('googleConfirmPassword').value;
    
    // Business name is required
    if (!businessName) {
        showMessage('Business name is required', 'error');
        return;
    }
    
    // Validate passwords only if provided
    if (password || confirmPassword) {
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }
    }
    
    // Get user data from session storage
    const incompleteUserData = sessionStorage.getItem('incomplete_user');
    if (!incompleteUserData) {
        showMessage('Session expired. Please login again.', 'error');
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
                password: password || null,  // Send null if empty
                confirmPassword: confirmPassword || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear session storage
            sessionStorage.removeItem('incomplete_user');
            
            // Store tokens
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            // Cache stats
            if (data.stats) {
                localStorage.setItem('dataxpert_cached_stats', JSON.stringify(data.stats));
            }
            
            // Remove profile completion flag
            localStorage.removeItem('dataxpert_needs_profile_completion');
            
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

// Skip profile completion (temporary - can be completed later from profile page)
function skipProfileCompletion() {
    const incompleteUserData = sessionStorage.getItem('incomplete_user');
    if (!incompleteUserData) {
        showMessage('Session expired. Please login again.', 'error');
        document.getElementById('googleProfileModal').style.display = 'none';
        return;
    }
    
    // User already has token from Google signup, just redirect
    document.getElementById('googleProfileModal').style.display = 'none';
    showMessage('You can complete your profile anytime from settings', 'info');
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
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
