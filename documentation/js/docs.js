// Documentation JavaScript

// Smooth scrolling for anchor links
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

// Highlight active section in sidebar
function updateActiveSection() {
    const sections = document.querySelectorAll('.doc-section');
    const navLinks = document.querySelectorAll('.docs-sidebar a');

    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.scrollY >= sectionTop - 100) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveSection);

// Copy code blocks
document.querySelectorAll('.code-block pre').forEach(block => {
    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.innerHTML = '<i class="fas fa-copy"></i>';
    button.style.cssText = 'position:absolute;top:10px;right:10px;background:#6366f1;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;opacity:0;transition:opacity 0.3s;';
    
    block.parentElement.style.position = 'relative';
    block.parentElement.appendChild(button);
    
    block.parentElement.addEventListener('mouseenter', () => {
        button.style.opacity = '1';
    });
    
    block.parentElement.addEventListener('mouseleave', () => {
        button.style.opacity = '0';
    });
    
    button.addEventListener('click', () => {
        const code = block.querySelector('code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        });
    });
});

// Update last updated date
const lastUpdatedElement = document.getElementById('lastUpdated');
if (lastUpdatedElement) {
    const date = new Date();
    lastUpdatedElement.textContent = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}
