// Authentication Module

// Google Auth retry counter
let googleAuthRetries = 0;
const MAX_GOOGLE_AUTH_RETRIES = 20;
const GOOGLE_RETRY_INTERVAL = 100; // Fast retry interval (100ms)

// Track current Google action - determined by which modal is open
function getCurrentGoogleAction() {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    
    // Check which modal is currently visible
    if (signupModal && signupModal.style.display === 'block') {
        return 'signup';
    }
    if (loginModal && loginModal.style.display === 'block') {
        return 'login';
    }
    
    // Default to login
    return 'login';
}

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
        } catch (error) {
            console.error('Google Auth initialization error:', error);
        }
    } else {
        googleAuthRetries++;
        if (googleAuthRetries < MAX_GOOGLE_AUTH_RETRIES) {
            setTimeout(initGoogleAuth, GOOGLE_RETRY_INTERVAL); // Fast retry
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

// Handle Google OAuth Callback - Fast simplified flow
async function handleGoogleCallback(response) {
    // Determine action based on which modal is currently open
    const action = getCurrentGoogleAction();
    
    try {
        const result = await fetch(API_ENDPOINTS.GOOGLE_AUTH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: response.credential,
                action: action
            })
        });

        const data = await result.json();

        if (data.success) {
            // Store authentication tokens
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            // Set flag to show profile completion banner
            localStorage.setItem('dataxpert_show_banner', 'true');
            
            // Close modals
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('signupModal').style.display = 'none';
            
            // Show success message and redirect immediately
            showMessage(data.message || 'Success! Redirecting...', 'success');
            
            // Fast redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            // Handle error scenarios
            if (data.need_signup) {
                // LOGIN with non-existent account → Switch to signup
                showMessage(data.message, 'error');
                setTimeout(() => {
                    document.getElementById('loginModal').style.display = 'none';
                    document.getElementById('signupModal').style.display = 'block';
                }, 1000);
            } else if (data.already_exists) {
                // SIGNUP with existing account → Switch to login
                showMessage(data.message, 'error');
                setTimeout(() => {
                    document.getElementById('signupModal').style.display = 'none';
                    document.getElementById('loginModal').style.display = 'block';
                }, 1000);
            } else {
                showMessage(data.message || 'Authentication failed', 'error');
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
}

// Email/Password Signup - Fast simplified flow
async function handleSignup(event) {
    event.preventDefault();
    
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
        
        const data = await response.json();

        if (data.success) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            
            // Set flag to show profile completion banner
            localStorage.setItem('dataxpert_show_banner', 'true');
            
            showMessage('Account created successfully!', 'success');
            
            // Close modal and redirect immediately
            document.getElementById('signupModal').style.display = 'none';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            // Handle errors
            if (data.already_exists) {
                showMessage(data.message, 'error');
                // Redirect to login modal
                setTimeout(() => {
                    document.getElementById('signupModal').style.display = 'none';
                    document.getElementById('loginModal').style.display = 'block';
                }, 1500);
            } else {
                showMessage(data.message || 'Signup failed. Please try again.', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        console.error('Signup error:', error);
        if (error.message === 'Failed to fetch' || !navigator.onLine) {
            showMessage('Cannot connect to server. Please check your internet connection.', 'error');
        } else {
            showMessage('An error occurred during signup. Please try again.', 'error');
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Email/Password Login - Fast simplified flow
async function handleLogin(event) {
    event.preventDefault();
    
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
            
            // Set flag to show profile completion banner
            localStorage.setItem('dataxpert_show_banner', 'true');
            
            showMessage('Login successful!', 'success');
            
            // Close modal and redirect immediately
            document.getElementById('loginModal').style.display = 'none';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            // Handle errors
            if (data.need_signup) {
                showMessage(data.message, 'error');
                // Redirect to signup modal
                setTimeout(() => {
                    document.getElementById('loginModal').style.display = 'none';
                    document.getElementById('signupModal').style.display = 'block';
                }, 1500);
            } else {
                showMessage(data.message || 'Login failed. Please check your credentials.', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
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
            
            showMessage('Profile completed! ✓', 'success');
            // Immediate redirect
            window.location.href = 'dashboard.html';
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
    // Immediate redirect
    window.location.href = 'dashboard.html';
}

// Close all modals utility
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Show Profile Setup Modal (after signup)
let profileSetupImageFile = null;

function showProfileSetupModal(user) {
    const modal = document.getElementById('profileSetupModal');
    if (!modal) {
        // If modal doesn't exist, redirect to dashboard
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Pre-fill name if available
    const fullNameInput = document.getElementById('setupFullName');
    if (fullNameInput && user && user.name) {
        fullNameInput.value = user.name;
    }
    
    // Update preview image
    const previewImg = document.getElementById('setupProfilePreview');
    if (previewImg && user && user.name) {
        previewImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff&size=200`;
    }
    
    modal.style.display = 'block';
}

// Handle profile image preview
function setupProfileImagePreview() {
    const fileInput = document.getElementById('setupProfileImageInput');
    const previewImg = document.getElementById('setupProfilePreview');
    
    if (fileInput && previewImg) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    showMessage('Please select an image file', 'error');
                    return;
                }
                
                // Validate file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    showMessage('Image must be less than 5MB', 'error');
                    return;
                }
                
                profileSetupImageFile = file;
                
                // Show preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Handle Profile Setup Form Submission
async function handleProfileSetup(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('setupFullName').value.trim();
    
    if (!fullName) {
        showMessage('Full name is required', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // First update the profile name
        const profileResponse = await fetch(API_ENDPOINTS.USER_PROFILE, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name: fullName
            })
        });
        
        const profileData = await profileResponse.json();
        
        if (!profileData.success) {
            showMessage(profileData.message || 'Failed to update profile', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        
        // Update local storage with new name
        let user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
        user.name = fullName;
        
        // If there's a profile image to upload
        if (profileSetupImageFile) {
            const formData = new FormData();
            formData.append('profile_image', profileSetupImageFile);
            
            const imageResponse = await fetch(API_ENDPOINTS.UPLOAD_PROFILE_IMAGE, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
                },
                body: formData
            });
            
            const imageData = await imageResponse.json();
            
            if (imageData.success && imageData.profile_image) {
                user.profile_image = imageData.profile_image;
            }
        }
        
        // Save updated user to localStorage
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        
        showMessage('Profile setup complete! ✓', 'success');
        
        // Close modal and redirect immediately
        document.getElementById('profileSetupModal').style.display = 'none';
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Profile setup error:', error);
        showMessage('Error setting up profile. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Skip profile setup
function skipProfileSetup() {
    document.getElementById('profileSetupModal').style.display = 'none';
    showMessage('You can complete your profile anytime from settings', 'info');
    // Immediate redirect
    window.location.href = 'dashboard.html';
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // Setup form handlers
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleProfileForm = document.getElementById('googleProfileForm');
    const profileSetupForm = document.getElementById('profileSetupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (googleProfileForm) {
        googleProfileForm.addEventListener('submit', handleGoogleProfileCompletion);
    }
    
    if (profileSetupForm) {
        profileSetupForm.addEventListener('submit', handleProfileSetup);
        setupProfileImagePreview();
    }

    // Initialize Google Auth immediately (script preloaded in head)
    initGoogleAuth();
    
    // Also render buttons when modal opens (in case Google loads late)
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            renderGoogleButtons(); // No delay - render immediately
        });
    }
    
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            renderGoogleButtons(); // No delay - render immediately
        });
    }
});
