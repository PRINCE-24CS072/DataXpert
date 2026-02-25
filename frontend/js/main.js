// Main JavaScript for Homepage

// Modal Management
function setupModals() {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const ctaSignupBtn = document.getElementById('ctaSignupBtn');
    
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    
    const closeButtons = document.querySelectorAll('.close');

    // Open Login Modal
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            openModal('loginModal');
        });
    }

    // Open Signup Modal
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            openModal('signupModal');
        });
    }

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            if (isAuthenticated()) {
                window.location.href = 'dashboard.html';
            } else {
                openModal('signupModal');
            }
        });
    }

    if (ctaSignupBtn) {
        ctaSignupBtn.addEventListener('click', () => {
            openModal('signupModal');
        });
    }

    // Switch between modals
    if (switchToSignup) {
        switchToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear error messages when switching
            if (typeof clearMessages === 'function') {
                clearMessages();
            }
            closeModal('loginModal');
            openModal('signupModal');
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear error messages when switching
            if (typeof clearMessages === 'function') {
                clearMessages();
            }
            closeModal('signupModal');
            openModal('loginModal');
        });
    }

    // Close modal buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            closeModal(modalId);
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Clear any existing error messages from previous attempts
        if (typeof clearMessages === 'function') {
            clearMessages();
        }
        
        modal.style.display = 'block';
        setTimeout(() => {
            modal.querySelector('.modal-content').classList.add('show');
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.querySelector('.modal-content').classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Smooth Scrolling
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Navbar Scroll Effect
function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Active Navigation Link
function setupActiveNav() {
    const sections = document.querySelectorAll('section[id], footer[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    let isScrolling = false;
    let scrollTimeout;

    // Handle direct link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            isScrolling = true;
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 1000);
        });
    });

    window.addEventListener('scroll', () => {
        if (isScrolling) return;
        
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });
}

// Demo Button Handler
function setupDemoButton() {
    const demoBtnHero = document.getElementById('demoBtnHero');
    
    if (demoBtnHero) {
        demoBtnHero.addEventListener('click', async () => {
            if (isAuthenticated()) {
                window.location.href = 'analysis.html';
            } else {
                showMessage('Please login to try the demo', 'info');
                setTimeout(() => {
                    openModal('loginModal');
                }, 1000);
            }
        });
    }
}

// Check Authentication Status
function checkAuthStatus() {
    if (isAuthenticated()) {
        // Update nav buttons
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            navButtons.innerHTML = `
                <button class="btn btn-secondary" onclick="window.location.href='dashboard.html'">Dashboard</button>
                <button class="btn btn-primary" onclick="logout()">Logout</button>
            `;
        }
    }
}

// Intersection Observer for Animations
function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });

    // Observe stat cards
    document.querySelectorAll('.stat-card').forEach(card => {
        observer.observe(card);
    });
}

// Counter Animation
function animateCounters() {
    const counters = document.querySelectorAll('.stat-card h3');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const value = target.textContent;
                const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
                
                if (!isNaN(numeric)) {
                    animateValue(target, 0, numeric, 2000, value);
                }
                
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function animateValue(element, start, end, duration, originalText) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = originalText;
            clearInterval(timer);
        } else {
            const displayValue = Math.floor(current);
            element.textContent = originalText.replace(/[0-9.]+/, displayValue);
        }
    }, 16);
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', () => {
    setupModals();
    setupSmoothScrolling();
    setupNavbarScroll();
    setupActiveNav();
    setupDemoButton();
    checkAuthStatus();
    setupIntersectionObserver();
    animateCounters();
});
