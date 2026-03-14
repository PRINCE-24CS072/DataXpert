// analysis.js — AI Chat & Analysis Page Logic
// DataXpert Frontend — Analysis Module

'use strict';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let currentChatId = null;

// ─────────────────────────────────────────────
// 1. escapeHtml — basic XSS prevention
// ─────────────────────────────────────────────
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, ch => map[ch]);
}

// ─────────────────────────────────────────────
// 2. formatMessage — convert AI markdown to HTML
// ─────────────────────────────────────────────
function formatMessage(text) {
    if (!text) return '';

    const lines = text.split('\n');
    let html = '';
    let inOl = false;
    let inUl = false;

    const closeOpenLists = () => {
        if (inOl) { html += '</ol>'; inOl = false; }
        if (inUl) { html += '</ul>'; inUl = false; }
    };

    const applyInline = (line) => {
        // Bold: **text**
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Inline code: `code`
        line = line.replace(/`([^`]+)`/g, '<code class="mono">$1</code>');
        // ₹ numbers get mono class
        line = line.replace(/(₹\s*[\d,]+(?:\.\d{1,2})?)/g, '<span class="mono">$1</span>');
        return line;
    };

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        if (/^##\s+/.test(trimmed)) {
            closeOpenLists();
            html += `<h4 class="ai-header">${applyInline(trimmed.replace(/^##\s+/, ''))}</h4>`;
            continue;
        }
        if (/^\d+\.\s+/.test(trimmed)) {
            if (inUl) { html += '</ul>'; inUl = false; }
            if (!inOl) { html += '<ol>'; inOl = true; }
            html += `<li>${applyInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`;
            continue;
        }
        if (/^-\s+/.test(trimmed)) {
            if (inOl) { html += '</ol>'; inOl = false; }
            if (!inUl) { html += '<ul>'; inUl = true; }
            html += `<li>${applyInline(trimmed.replace(/^-\s+/, ''))}</li>`;
            continue;
        }
        if (trimmed === '') {
            closeOpenLists();
            html += '<br>';
            continue;
        }
        closeOpenLists();
        html += `<p>${applyInline(trimmed)}</p>`;
    }

    closeOpenLists();
    html = html.replace(/^(<br>)+/, '').replace(/(<br>)+$/, '');
    return html;
}

// ─────────────────────────────────────────────
// 3. addMessageToChat
// ─────────────────────────────────────────────
function addMessageToChat(content, role) {
    const container = document.getElementById('chatContainer');
    if (!container) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

    const wrapper = document.createElement('div');
    wrapper.classList.add('chat-message-wrapper', role === 'user' ? 'user-wrapper' : 'ai-wrapper');

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', role === 'user' ? 'user-bubble' : 'ai-bubble');

    if (role === 'user') {
        bubble.textContent = content;
    } else {
        bubble.innerHTML = formatMessage(content);
    }

    const timestamp = document.createElement('span');
    timestamp.classList.add('chat-timestamp');
    timestamp.textContent = timeStr;

    wrapper.appendChild(bubble);
    wrapper.appendChild(timestamp);
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

// ─────────────────────────────────────────────
// 4. showTypingIndicator / hideTypingIndicator
// ─────────────────────────────────────────────
function showTypingIndicator() {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    hideTypingIndicator();

    const wrapper = document.createElement('div');
    wrapper.id = 'typingIndicator';
    wrapper.classList.add('chat-message-wrapper', 'ai-wrapper');

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', 'ai-bubble', 'typing-bubble');
    bubble.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// ─────────────────────────────────────────────
// 5. handleSendMessage
// ─────────────────────────────────────────────
async function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    autoResizeTextarea(input);

    const welcome = document.querySelector('.analysis-welcome');
    if (welcome) welcome.style.display = 'none';

    addMessageToChat(message, 'user');

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = true;
    showTypingIndicator();

    try {
        const response = await fetch(API_ENDPOINTS.AI_CHAT, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message: message, chat_id: currentChatId })
        });

        const data = await response.json();
        hideTypingIndicator();

        if (data.success) {
            if (data.chat_id) currentChatId = data.chat_id;
            // Backend returns response as object {text, summary, ...} or plain string
            const responseText = typeof data.response === 'string'
                ? data.response
                : (data.response && (data.response.text || data.response.summary || data.response.message))
                    || data.message
                    || 'Analysis complete.';
            addMessageToChat(responseText, 'assistant');
            // Check all possible locations chart data could live in the response
            const chartData = data.chart_data
                || (data.response && data.response.chart_data)
                || (data.analysis && (data.analysis.chart || data.analysis.chart_data));
            if (chartData) renderAnalysisChart(chartData);
        } else {
            addMessageToChat('Sorry, I encountered an error. Please try again.', 'assistant');
            if (typeof showToast === 'function') showToast(data.message || 'Analysis failed', 'error');
        }
    } catch (err) {
        hideTypingIndicator();
        addMessageToChat('Network error. Please check your connection.', 'assistant');
        if (typeof showToast === 'function') showToast('Network error', 'error');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        const msgInput = document.getElementById('messageInput');
        if (msgInput) msgInput.focus();
    }
}

// ─────────────────────────────────────────────
// 6. loadChatHistory
// ─────────────────────────────────────────────
async function loadChatHistory() {
    try {
        if (!API_ENDPOINTS.AI_CHATS) return;

        const response = await fetch(API_ENDPOINTS.AI_CHATS, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) return;

        const data = await response.json();
        if (!data.success || !data.chats || data.chats.length === 0) return;

        const sorted = data.chats.sort((a, b) => {
            return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
        });

        const mostRecent = sorted[0];
        currentChatId = mostRecent.id || mostRecent.chat_id || null;

        const messages = mostRecent.messages || [];
        if (messages.length === 0) return;

        const welcome = document.querySelector('.analysis-welcome');
        if (welcome) welcome.style.display = 'none';

        messages.slice(-10).forEach(msg => {
            addMessageToChat(msg.content || msg.message || '', msg.role === 'user' ? 'user' : 'assistant');
        });
    } catch (err) {
        console.warn('Could not load chat history:', err);
    }
}

// ─────────────────────────────────────────────
// 7. loadMiniMetrics
// ─────────────────────────────────────────────
async function loadMiniMetrics() {
    let stats = null;

    // Try to get from cache first
    if (typeof DataCache !== 'undefined' && DataCache.get) {
        const cached = DataCache.get();
        if (cached && cached.stats) stats = cached.stats;
        else if (cached) stats = cached;
    }

    // If not in cache, try sessionStorage
    if (!stats) {
        try {
            const raw = sessionStorage.getItem('dx_cache');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.data && parsed.data.stats) stats = parsed.data.stats;
                else if (parsed && parsed.data) stats = parsed.data;
            }
        } catch (_) {}
    }

    // If still no stats, fetch from API
    if (!stats) {
        try {
            const response = await fetch(API_ENDPOINTS.DASHBOARD_STATS, { 
                method: 'GET', 
                headers: getAuthHeaders() 
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.stats) {
                    stats = result.stats;
                    // Cache it for future use
                    if (typeof DataCache !== 'undefined') {
                        DataCache.set({ stats });
                    }
                }
            }
        } catch (err) {
            console.warn('Could not load stats:', err);
        }
    }

    if (!stats) return;

    const formatINR = (value) => {
        if (value === undefined || value === null) return '—';
        const num = parseFloat(value);
        if (isNaN(num)) return '—';
        return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    const formatCount = (value) => {
        if (value === undefined || value === null) return '—';
        const num = parseInt(value, 10);
        if (isNaN(num)) return '—';
        return num.toLocaleString('en-IN');
    };

    const setMini = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<span class="mono">${value}</span>`;
    };

    setMini('miniSales',    formatINR(stats.total_revenue  || stats.total_sales   || stats.revenue));
    setMini('miniProfit',   formatINR(stats.total_profit   || stats.profit));
    setMini('miniExpenses', formatINR(stats.total_expenses || stats.expenses));
    setMini('miniEntries',  formatCount(stats.total_entries || stats.entries      || stats.count || stats.data_count));
}

// ─────────────────────────────────────────────
// 8. autoResizeTextarea
// ─────────────────────────────────────────────
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;
    const maxHeight = lineHeight * 5 + 16;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

// ─────────────────────────────────────────────
// 9. setupSuggestionChips
// ─────────────────────────────────────────────
function setupSuggestionChips() {
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.dataset.question;
            if (!question) return;
            const input = document.getElementById('messageInput');
            const form  = document.getElementById('chatForm');
            if (input) input.value = question;
            if (form)  form.dispatchEvent(new Event('submit'));
        });
    });
}

// ─────────────────────────────────────────────
// 10. renderAnalysisChart
// ─────────────────────────────────────────────
function renderAnalysisChart(chartData) {
    const resultsContent  = document.getElementById('resultsContent');
    const analysisResults = document.getElementById('analysisResults');
    if (!resultsContent || !analysisResults) return;

    resultsContent.innerHTML = '';
    analysisResults.style.display = 'block';

    const canvas = document.createElement('canvas');
    canvas.id = 'analysisChart';
    canvas.style.maxHeight = '260px';
    resultsContent.appendChild(canvas);

    if (typeof Chart === 'undefined') {
        resultsContent.innerHTML = '<p class="mono" style="font-size:0.8rem;opacity:0.6">Chart.js not loaded.</p>';
        return;
    }

    if (window._analysisChartInstance) {
        window._analysisChartInstance.destroy();
        window._analysisChartInstance = null;
    }

    const ctx      = canvas.getContext('2d');
    const type     = chartData.type     || 'bar';
    const labels   = chartData.labels   || [];
    const datasets = chartData.datasets || [];

    const palette = [
        'rgba(99,102,241,0.8)', 'rgba(34,211,238,0.8)',
        'rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)'
    ];

    const styledDatasets = datasets.map((ds, idx) => ({
        borderWidth: 2,
        borderRadius: type === 'bar' ? 6 : 0,
        backgroundColor: ds.backgroundColor || palette[idx % palette.length],
        borderColor: ds.borderColor || (ds.backgroundColor || palette[idx % palette.length]).replace('0.8', '1'),
        ...ds
    }));

    window._analysisChartInstance = new Chart(ctx, {
        type: type,
        data: { labels, datasets: styledDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#e2e8f0', font: { family: 'DM Mono, monospace' } } },
                title: chartData.title
                    ? { display: true, text: chartData.title, color: '#e2e8f0', font: { size: 14 } }
                    : { display: false }
            },
            scales: (type !== 'pie' && type !== 'doughnut') ? {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
                    },
                    grid: { color: 'rgba(148,163,184,0.1)' }
                }
            } : {}
        }
    });
}

// ─────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Load stats asynchronously
    loadMiniMetrics();
    setupSuggestionChips();

    const chatForm = document.getElementById('chatForm');
    if (chatForm) chatForm.addEventListener('submit', handleSendMessage);

    const msgInput = document.getElementById('messageInput');
    if (msgInput) {
        msgInput.addEventListener('input', () => autoResizeTextarea(msgInput));
        msgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatForm) chatForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    const closeResults = document.getElementById('closeResults');
    if (closeResults) {
        closeResults.addEventListener('click', () => {
            const ar = document.getElementById('analysisResults');
            if (ar) ar.style.display = 'none';
        });
    }

    loadChatHistory();
});
