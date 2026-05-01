// AI Analysis JavaScript

let currentChart = null;
let currentFilterMode = 'all-sales'; // Track current filter mode
let currentFilterType = null; // Track selected filter type

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    const verified = await verifyAuth();
    if (!verified) {
        return;
    }

    loadUserInfo();
    setupEventListeners();
    loadChatHistory();
});

// Load user information
function loadUserInfo() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('userName').textContent = user.name || 'User';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Analysis Window Toggle Buttons
    setupAnalysisWindowControls();

    // Chat form
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', handleSendMessage);
    }

    // Auto-resize textarea
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });

        // Enter to send, Shift+Enter for new line
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Suggestion chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            messageInput.value = question;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Close results
    const closeResults = document.getElementById('closeResults');
    if (closeResults) {
        closeResults.addEventListener('click', () => {
            document.getElementById('analysisResults').style.display = 'none';
        });
    }

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

// Setup Analysis Window Controls
function setupAnalysisWindowControls() {
    // Toggle buttons
    const allSalesBtn = document.getElementById('allSalesBtn');
    const customRangeBtn = document.getElementById('customRangeBtn');
    const filterPanel = document.getElementById('filterPanel');

    if (allSalesBtn) {
        allSalesBtn.addEventListener('click', () => {
            currentFilterMode = 'all-sales';
            allSalesBtn.classList.add('active');
            customRangeBtn.classList.remove('active');
            filterPanel.style.display = 'none';
            resetFilters();
        });
    }

    if (customRangeBtn) {
        customRangeBtn.addEventListener('click', () => {
            currentFilterMode = 'custom-range';
            customRangeBtn.classList.add('active');
            allSalesBtn.classList.remove('active');
            filterPanel.style.display = 'block';
        });
    }

    // Filter type buttons
    document.querySelectorAll('.filter-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filterType = this.getAttribute('data-filter-type');
            selectFilterType(filterType);
        });
    });

    // Apply filter button
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', handleApplyFilter);
    }
}

// Select filter type
function selectFilterType(filterType) {
    currentFilterType = filterType;
    
    // Update active button
    document.querySelectorAll('.filter-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-type-btn[data-filter-type="${filterType}"]`).classList.add('active');
    
    // Hide all input groups
    document.getElementById('yearInputGroup').style.display = 'none';
    document.getElementById('monthInputGroup').style.display = 'none';
    document.getElementById('dateInputGroup').style.display = 'none';
    document.getElementById('dateRangeInputGroup').style.display = 'none';
    
    // Show selected input group
    switch(filterType) {
        case 'year':
            document.getElementById('yearInputGroup').style.display = 'flex';
            break;
        case 'month':
            document.getElementById('monthInputGroup').style.display = 'flex';
            break;
        case 'date':
            document.getElementById('dateInputGroup').style.display = 'flex';
            break;
        case 'date-range':
            document.getElementById('dateRangeInputGroup').style.display = 'flex';
            break;
    }
}

// Handle Apply Filter
function handleApplyFilter() {
    if (!currentFilterType) {
        alert('Please select a filter type');
        return;
    }

    let filterData = { type: currentFilterType };

    switch(currentFilterType) {
        case 'year':
            const year = document.getElementById('yearInput').value;
            if (!year) {
                alert('Please select a year');
                return;
            }
            filterData.value = year;
            break;
        case 'month':
            const month = document.getElementById('monthInput').value;
            if (!month) {
                alert('Please select a month');
                return;
            }
            filterData.value = month;
            break;
        case 'date':
            const date = document.getElementById('dateInput').value;
            if (!date) {
                alert('Please select a date');
                return;
            }
            filterData.value = formatDateToDDMMYYYY(date);
            break;
        case 'date-range':
            const fromDate = document.getElementById('dateFromInput').value;
            const toDate = document.getElementById('dateToInput').value;
            if (!fromDate || !toDate) {
                alert('Please select both From and To dates');
                return;
            }
            filterData.from = formatDateToDDMMYYYY(fromDate);
            filterData.to = formatDateToDDMMYYYY(toDate);
            break;
    }

    // Send filter to chat/analysis
    console.log('Filter applied:', filterData);
    
    // Display filter summary in chat
    const summaryText = generateFilterSummary(filterData);
    addMessageToChat(`Applied filter: ${summaryText}`, 'system');
}

// Reset all filters
function resetFilters() {
    document.getElementById('yearInput').value = '';
    document.getElementById('monthInput').value = '';
    document.getElementById('dateInput').value = '';
    document.getElementById('dateFromInput').value = '';
    document.getElementById('dateToInput').value = '';
    currentFilterType = null;
    
    // Remove active class from filter type buttons
    document.querySelectorAll('.filter-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hide all input groups
    document.getElementById('yearInputGroup').style.display = 'none';
    document.getElementById('monthInputGroup').style.display = 'none';
    document.getElementById('dateInputGroup').style.display = 'none';
    document.getElementById('dateRangeInputGroup').style.display = 'none';
}

// Format date to DD-MM-YYYY
function formatDateToDDMMYYYY(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Generate filter summary text
function generateFilterSummary(filterData) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    switch(filterData.type) {
        case 'year':
            return `Year ${filterData.value}`;
        case 'month':
            return `${monthNames[parseInt(filterData.value)]}`;
        case 'date':
            return `Date ${filterData.value}`;
        case 'date-range':
            return `From ${filterData.from} to ${filterData.to}`;
        default:
            return 'Unknown filter';
    }
}

// Handle send message
async function handleSendMessage(event) {
    event.preventDefault();
    
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Hide welcome message
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.style.display = 'none';
    }

    // Add user message to chat
    addMessageToChat(message, 'user');

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        const response = await fetch(API_ENDPOINTS.AI_CHAT, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        if (data.success) {
            // Add AI response to chat
            addMessageToChat(data.response.text, 'assistant');

            // Show analysis results if available
            if (data.analysis) {
                displayAnalysisResults(data.analysis);
            }
        } else {
            addMessageToChat(data.message || 'Sorry, I encountered an error.', 'error');
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        console.error('Chat error:', error);
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'error');
    }
}

// Add message to chat
function addMessageToChat(message, role) {
    const chatContainer = document.getElementById('chatContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
    } else if (role === 'assistant') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${formatMessage(message)}</div>
            </div>
        `;
    } else if (role === 'error') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="message-content">
                <p style="color: #ef4444;">${escapeHtml(message)}</p>
            </div>
        `;
    } else if (role === 'system') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-info-circle"></i>
            </div>
            <div class="message-content">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
    const chatContainer = document.getElementById('chatContainer');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant-message typing-indicator';
    typingDiv.id = `typing-${Date.now()}`;
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return typingDiv.id;
}

// Remove typing indicator
function removeTypingIndicator(id) {
    const typingDiv = document.getElementById(id);
    if (typingDiv) {
        typingDiv.remove();
    }
}

// Display analysis results
function displayAnalysisResults(analysis) {
    const resultsContainer = document.getElementById('analysisResults');
    const resultsContent = document.getElementById('resultsContent');
    
    let html = '';
    
    // Insights
    if (analysis.insights && analysis.insights.length > 0) {
        html += '<div class="result-section"><h4>📊 Key Insights</h4><ul>';
        analysis.insights.forEach(insight => {
            html += `<li>${escapeHtml(insight)}</li>`;
        });
        html += '</ul></div>';
    }
    
    // Recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
        html += '<div class="result-section"><h4>💡 Recommendations</h4><ul>';
        analysis.recommendations.forEach(rec => {
            html += `<li>${escapeHtml(rec)}</li>`;
        });
        html += '</ul></div>';
    }
    
    // Chart data
    if (analysis.data) {
        html += '<div class="result-section"><h4>📈 Visualization</h4>';
        html += '<canvas id="analysisChart" style="max-height: 300px;"></canvas>';
        html += '</div>';
    }
    
    resultsContent.innerHTML = html;
    resultsContainer.style.display = 'block';
    
    // Render chart if data available
    if (analysis.data) {
        setTimeout(() => renderAnalysisChart(analysis.data), 100);
    }
}

// Render analysis chart
function renderAnalysisChart(data) {
    const ctx = document.getElementById('analysisChart');
    if (!ctx) return;
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    const chartData = {
        labels: Object.keys(data),
        datasets: [{
            label: 'Value',
            data: Object.values(data),
            backgroundColor: [
                'rgba(99, 102, 241, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)'
            ],
            borderColor: [
                'rgba(99, 102, 241, 1)',
                'rgba(16, 185, 129, 1)',
                'rgba(245, 158, 11, 1)'
            ],
            borderWidth: 2
        }]
    };
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Load chat history
async function loadChatHistory() {
    try {
        const response = await fetch(API_ENDPOINTS.AI_CHATS, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success && data.chats && data.chats.length > 0) {
            // Hide welcome message
            const welcomeMsg = document.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.style.display = 'none';
            }

            // Display last few chats
            data.chats.slice(0, 10).reverse().forEach(chat => {
                if (chat.message) {
                    addMessageToChat(chat.message, 'user');
                }
                if (chat.response) {
                    addMessageToChat(chat.response, 'assistant');
                }
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Utility functions
function formatMessage(message) {
    // Convert newlines to <br>
    message = escapeHtml(message);
    message = message.replace(/\n/g, '<br>');
    
    // Convert markdown-style bold
    message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert markdown-style lists
    message = message.replace(/^• /gm, '<li>');
    
    return message;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
