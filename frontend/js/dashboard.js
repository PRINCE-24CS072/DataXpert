// ============================================================
// DataXpert - Dashboard JS
// Handles: metrics, charts, filters, modals, table, compare
// ============================================================

// ---- CHART INSTANCES ----
window.salesChartInstance = null;
window.profitExpenseChartInstance = null;
window.categoryChartInstance = null;

// ---- STATE ----
let activeFilter = 'all';
let dashboardData = null;
let lastUpdatedTimestamp = null;
let lastUpdatedInterval = null;

// ---- CHART DEFAULTS (applied after DOMContentLoaded) ----
function applyChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(148,163,184,0.12)';
    Chart.defaults.font = Chart.defaults.font || {};
    Chart.defaults.font.family = "'DM Mono', 'Inter', sans-serif";
}

// =============================================================
// UTILITY — HTML escape
// =============================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toISOString().split('T')[0];
    } catch (e) {
        return dateStr;
    }
}

function toISODate(d) {
    return d.toISOString().split('T')[0];
}

// =============================================================
// COUNT-UP ANIMATION
// =============================================================
function countUp(element, target, prefix, suffix) {
    if (!element) return;
    prefix = prefix || '';
    suffix = suffix || '';
    const duration = 800;
    const step = target / (duration / 16);
    let current = 0;
    function tick() {
        current = Math.min(current + step, target);
        element.textContent = prefix + Math.round(current).toLocaleString('en-IN') + suffix;
        if (current < target) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// =============================================================
// SKELETON HELPERS
// =============================================================
function showSkeletons() {
    ['totalSales', 'totalProfit', 'totalExpenses', 'dataCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('skeleton'); el.textContent = ''; }
    });
    ['salesSkeleton', 'profitSkeleton', 'expensesSkeleton', 'countSkeleton'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
}

function hideSkeletons() {
    ['totalSales', 'totalProfit', 'totalExpenses', 'dataCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('skeleton');
    });
    ['salesSkeleton', 'profitSkeleton', 'expensesSkeleton', 'countSkeleton'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// =============================================================
// LAST UPDATED TIMER
// =============================================================
function startLastUpdatedTimer() {
    lastUpdatedTimestamp = Date.now();
    const el = document.getElementById('lastUpdatedTime');
    if (!el) return;
    el.textContent = 'Just now';
    if (lastUpdatedInterval) clearInterval(lastUpdatedInterval);
    lastUpdatedInterval = setInterval(() => {
        if (!lastUpdatedTimestamp) return;
        const diff = Math.floor((Date.now() - lastUpdatedTimestamp) / 1000);
        if (diff < 60) {
            el.textContent = 'Just now';
        } else if (diff < 3600) {
            el.textContent = Math.floor(diff / 60) + ' min ago';
        } else {
            el.textContent = Math.floor(diff / 3600) + ' hr ago';
        }
    }, 30000);
}

// =============================================================
// LOAD DASHBOARD DATA
// =============================================================
async function loadDashboardData() {
    // Check cache first — avoid unnecessary network call
    if (typeof DataCache !== 'undefined' && DataCache.isValid()) {
        const cached = DataCache.get();
        if (cached) {
            dashboardData = cached;
            renderDashboard(cached);
            startLastUpdatedTimer();
            return;
        }
    }

    showSkeletons();

    try {
        // Fetch stats AND charts in parallel — both are required for full dashboard
        const [statsResp, chartsResp] = await Promise.all([
            fetch(API_ENDPOINTS.DASHBOARD_STATS, { method: 'GET', headers: getAuthHeaders() }),
            fetch(API_ENDPOINTS.DASHBOARD_CHARTS, { method: 'GET', headers: getAuthHeaders() })
        ]);

        if (statsResp.status === 401) {
            if (typeof logout === 'function') logout();
            return;
        }

        if (!statsResp.ok) throw new Error('HTTP ' + statsResp.status);

        const statsResult = await statsResp.json();
        if (statsResult.success === false) throw new Error(statsResult.message || 'Load failed');

        // Charts endpoint is best-effort — don't fail if it errors
        let chartsData = {};
        try {
            if (chartsResp.ok) {
                const chartsResult = await chartsResp.json();
                if (chartsResult.success) chartsData = chartsResult.charts || chartsResult.chart_data || {};
            }
        } catch (_) { /* charts are optional */ }

        // Flatten recent_data out of stats so renderDashboard can access it at root level
        const statsObj = statsResult.stats || {};
        const result = {
            ...statsResult,
            stats: statsObj,
            charts: chartsData,
            recent_data: statsObj.recent_data || statsResult.recent_data || []
        };

        dashboardData = result;
        if (typeof DataCache !== 'undefined') DataCache.set(result);

        renderDashboard(result);
        startLastUpdatedTimer();

    } catch (err) {
        hideSkeletons();
        console.error('Dashboard load error:', err);
        if (typeof showToast === 'function') showToast('Failed to load data. Try refreshing.', 'error');
        renderEmptyState();
    }
}

function renderEmptyState() {
    ['totalSales', 'totalProfit', 'totalExpenses', 'dataCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
    renderRecentData([]);
}

// =============================================================
// RENDER DASHBOARD
// =============================================================
function renderDashboard(data) {
    hideSkeletons();

    const stats = data.stats || {};
    const changes = data.changes || {};

    const totalSales    = parseFloat(stats.total_sales     || stats.totalSales     || 0);
    const totalProfit   = parseFloat(stats.total_profit    || stats.totalProfit    || 0);
    const totalExpenses = parseFloat(stats.total_expenses  || stats.totalExpenses  || 0);
    const dataCount     = parseInt(stats.data_count        || stats.dataCount      || stats.count || 0, 10);

    const salesEl    = document.getElementById('totalSales');
    const profitEl   = document.getElementById('totalProfit');
    const expensesEl = document.getElementById('totalExpenses');
    const countEl    = document.getElementById('dataCount');

    if (salesEl)    { salesEl.style.fontVariantNumeric    = 'tabular-nums'; countUp(salesEl,    totalSales,    '\u20b9', ''); }
    if (profitEl)   { profitEl.style.fontVariantNumeric   = 'tabular-nums'; countUp(profitEl,   totalProfit,   '\u20b9', ''); }
    if (expensesEl) { expensesEl.style.fontVariantNumeric = 'tabular-nums'; countUp(expensesEl, totalExpenses, '\u20b9', ''); }
    if (countEl)    { countEl.style.fontVariantNumeric    = 'tabular-nums'; countUp(countEl,    dataCount,     '',       ''); }

    renderChangeIndicator('salesChange',     changes.sales     || changes.total_sales     || 0);
    renderChangeIndicator('profitChange',    changes.profit    || changes.total_profit    || 0);
    renderChangeIndicator('expensesChange',  changes.expenses  || changes.total_expenses  || 0);
    renderChangeIndicator('dataCountChange', changes.count     || changes.data_count      || 0);

    const chartData     = data.charts         || {};
    const salesTrend    = chartData.sales_trend    || chartData.salesTrend    || {};
    const profitExpense = chartData.profit_expense || chartData.profitExpense || {};
    const categoryData  = chartData.categories     || {};

    renderSalesChart(salesTrend.labels || [], salesTrend.values || []);
    renderProfitExpenseChart(
        profitExpense.profit   || [],
        profitExpense.expenses || [],
        profitExpense.labels   || []
    );
    renderCategoryChart(categoryData.labels || [], categoryData.values || []);

    const rows = data.recent_data || data.recentData || [];
    renderRecentData(rows);
}

// =============================================================
// CHANGE INDICATORS
// =============================================================
function renderChangeIndicator(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const num = parseFloat(value) || 0;
    const abs = Math.abs(num).toFixed(1);
    if (num > 0) {
        el.innerHTML = `<span style="color:var(--accent-green,#22c55e)">&#9650; ${abs}%</span>`;
    } else if (num < 0) {
        el.innerHTML = `<span style="color:var(--accent-red,#ef4444)">&#9660; ${abs}%</span>`;
    } else {
        el.innerHTML = `<span style="color:var(--text-muted,#64748b)">&#8212; 0%</span>`;
    }
}

// =============================================================
// CHART RENDERING — dark-themed Chart.js
// =============================================================
function renderSalesChart(labels, values) {
    const canvas = document.getElementById('salesChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.salesChartInstance) { window.salesChartInstance.destroy(); window.salesChartInstance = null; }

    // Handle empty data
    if (!labels || !values || labels.length === 0 || values.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 280);
    gradient.addColorStop(0, 'rgba(99,102,241,0.35)');
    gradient.addColorStop(1, 'rgba(99,102,241,0.0)');

    window.salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales (\u20b9)',
                data: values,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.42,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#0d1117',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    borderColor: 'rgba(99,102,241,0.4)',
                    borderWidth: 1,
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    callbacks: {
                        label: ctx => ` \u20b9${Number(ctx.parsed.y).toLocaleString('en-IN')}`
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', font: { size: 11 } } },
                y: {
                    grid: { color: 'rgba(148,163,184,0.08)' },
                    ticks: {
                        color: '#64748b', font: { size: 11 },
                        callback: v => `\u20b9${Number(v).toLocaleString('en-IN')}`
                    }
                }
            }
        }
    });
}

function renderProfitExpenseChart(profitData, expenseData, labels) {
    const canvas = document.getElementById('profitExpenseChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.profitExpenseChartInstance) { window.profitExpenseChartInstance.destroy(); window.profitExpenseChartInstance = null; }

    // Handle empty data
    if (!labels || !profitData || !expenseData || labels.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    window.profitExpenseChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Profit',
                    data: profitData,
                    backgroundColor: 'rgba(34,197,94,0.75)',
                    borderColor: 'rgba(34,197,94,1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(239,68,68,0.65)',
                    borderColor: 'rgba(239,68,68,1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#94a3b8', boxWidth: 12, padding: 16, font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    borderColor: 'rgba(148,163,184,0.18)',
                    borderWidth: 1,
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: \u20b9${Number(ctx.parsed.y).toLocaleString('en-IN')}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                y: {
                    grid: { color: 'rgba(148,163,184,0.08)' },
                    ticks: {
                        color: '#64748b', font: { size: 11 },
                        callback: v => `\u20b9${Number(v).toLocaleString('en-IN')}`
                    }
                }
            }
        }
    });
}

function renderCategoryChart(categories, values) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.categoryChartInstance) { window.categoryChartInstance.destroy(); window.categoryChartInstance = null; }

    // Handle empty data
    if (!categories || !values || categories.length === 0 || values.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    const palette = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#ec4899','#14b8a6','#f97316','#3b82f6'];
    const bgColors = categories.map((_, i) => palette[i % palette.length]);

    window.categoryChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: values,
                backgroundColor: bgColors,
                borderColor: '#0d1117',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '65%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        boxWidth: 12,
                        padding: 14,
                        font: { size: 12 },
                        generateLabels: chart => {
                            const d = chart.data;
                            if (!d.labels.length) return [];
                            const total = d.datasets[0].data.reduce((a, b) => a + b, 0);
                            return d.labels.map((label, i) => {
                                const val = d.datasets[0].data[i];
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                                return {
                                    text: `${label} (${pct}%)`,
                                    fillStyle: d.datasets[0].backgroundColor[i],
                                    strokeStyle: d.datasets[0].borderColor,
                                    lineWidth: 1,
                                    index: i
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    borderColor: 'rgba(148,163,184,0.18)',
                    borderWidth: 1,
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
                            return ` \u20b9${Number(ctx.parsed).toLocaleString('en-IN')} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// =============================================================
// TIME FILTER SYSTEM
// =============================================================
function rebuildChartsFromFilter(rows) {
    if (!rows || rows.length === 0) {
        renderSalesChart([], []);
        renderProfitExpenseChart([], [], []);
        renderCategoryChart([], []);
        return;
    }

    const monthMap = {}, catMap = {}, profitByMonth = {}, expenseByMonth = {};

    rows.forEach(row => {
        const d = new Date(row.record_date || row.date || row.Date || row.created_at || '');
        if (isNaN(d.getTime())) return;

        const key    = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label  = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        const cat    = row.category || row.Category || 'Other';

        if (!monthMap[key])       monthMap[key]       = { label, value: 0 };
        if (!profitByMonth[key])  profitByMonth[key]  = { label, value: 0 };
        if (!expenseByMonth[key]) expenseByMonth[key] = { label, value: 0 };

        // Support both legacy (type+amount) and new (sales/expenses/profit) formats
        const sales    = parseFloat(row.sales    || 0);
        const expenses = parseFloat(row.expenses || 0);
        const profit   = parseFloat(row.profit   || 0);
        const legacyAmount = parseFloat(row.amount || row.Amount || 0);
        const type     = (row.type || row.Type || row.data_type || '').toLowerCase();

        if (sales > 0 || ['sale','sales','income','revenue'].includes(type)) {
            const amt = sales || legacyAmount;
            monthMap[key].value      += amt;
            profitByMonth[key].value += profit || amt;
        }
        if (expenses > 0 || ['expense','expenses','cost'].includes(type)) {
            expenseByMonth[key].value += expenses || legacyAmount;
        }
        if (profit > 0 && !sales) {
            profitByMonth[key].value += profit;
        }

        catMap[cat] = (catMap[cat] || 0) + (sales || expenses || profit || legacyAmount);
    });

    const sortedKeys     = Object.keys(monthMap).sort();
    const salesLabels    = sortedKeys.map(k => monthMap[k].label);
    const salesValues    = sortedKeys.map(k => monthMap[k].value);
    const profitValues   = sortedKeys.map(k => (profitByMonth[k]  || {}).value || 0);
    const expenseValues  = sortedKeys.map(k => (expenseByMonth[k] || {}).value || 0);
    const catKeys        = Object.keys(catMap);
    const catValues      = catKeys.map(k => catMap[k]);

    renderSalesChart(salesLabels, salesValues);
    renderProfitExpenseChart(profitValues, expenseValues, salesLabels);
    renderCategoryChart(catKeys, catValues);
}

// =============================================================
// RECENT DATA TABLE
// =============================================================
function renderRecentData(rows) {
    const tbody = document.getElementById('recentData');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted,#64748b);padding:2rem;">No data available for the selected period.</td></tr>';
        return;
    }

    // Sort by date descending (most recent first)
    const sortedRows = [...rows].sort((a, b) => {
        const dateA = new Date(a.record_date || a.date || a.Date || a.created_at || 0);
        const dateB = new Date(b.record_date || b.date || b.Date || b.created_at || 0);
        return dateB - dateA; // descending order
    });

    let html = '';
    sortedRows.slice(0, 10).forEach(row => {
        const id          = row.id   || row._id || '';
        const dateStr     = row.record_date || row.date || row.Date || row.created_at || '';
        const category    = row.category    || row.Category    || '—';
        const description = row.description || row.Description || row.notes || '—';

        // Normalize type and amount — support both new (sales/expenses/profit) and legacy (type+amount)
        let type = row.type || row.Type || row.data_type || '';
        let amount = 0;
        const sales    = parseFloat(row.sales    || 0);
        const expenses = parseFloat(row.expenses || 0);
        const profit   = parseFloat(row.profit   || 0);
        const legacyAmt = parseFloat(row.amount || row.Amount || 0);

        if (!type) {
            // Derive type from which value is largest
            if (sales >= expenses && sales >= profit && sales > 0)         { type = 'Sale';    amount = sales; }
            else if (expenses >= sales && expenses >= profit && expenses > 0){ type = 'Expense'; amount = expenses; }
            else if (profit > 0)                                            { type = 'Profit';  amount = profit; }
            else if (legacyAmt > 0)                                         { type = 'Entry';   amount = legacyAmt; }
        } else {
            amount = legacyAmt || sales || expenses || profit;
        }

        const typeLower = type.toLowerCase();
        let pillClass = 'status-pill';
        if (['sale','sales','income','revenue'].includes(typeLower)) pillClass += ' status-sale';
        else if (['expense','expenses','cost'].includes(typeLower))  pillClass += ' status-expense';
        else if (typeLower === 'profit')                             pillClass += ' status-profit';

        const displayType = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : '—';

        html += `<tr>
            <td class="mono" style="font-variant-numeric:tabular-nums">${escapeHtml(formatDate(dateStr))}</td>
            <td><span class="${pillClass}">${escapeHtml(displayType)}</span></td>
            <td class="mono" style="font-variant-numeric:tabular-nums">&#8377;${amount.toLocaleString('en-IN')}</td>
            <td>${escapeHtml(category)}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(description)}</td>
            <td>
                ${id ? `
                <button class="btn-icon-sm" onclick="editRow('${escapeHtml(String(id))}')" title="Edit" style="margin-right:4px">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon-sm btn-danger-sm" onclick="deleteRow('${escapeHtml(String(id))}')" title="Delete">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>` : ''}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// =============================================================
// EDIT / DELETE ROW
// =============================================================
async function editRow(id) {
    try {
        const response = await fetch(`${API_ENDPOINTS.BUSINESS_DATA}/${id}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Could not fetch row');
        const result = await response.json();
        const row = result.data || result;

        const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
        set('dataDate',        (row.date || '').split('T')[0]);
        set('dataType',        row.type        || row.data_type || '');
        set('dataAmount',      row.amount      || '');
        set('dataCategory',    row.category    || '');
        set('dataDescription', row.description || row.notes || '');

        const form = document.getElementById('addDataForm');
        if (form) {
            form.dataset.editId = id;
            const btn = form.querySelector('button[type="submit"]');
            if (btn) btn.textContent = 'Update Entry';
        }
        const title = document.querySelector('#addDataModal .modal-title');
        if (title) title.textContent = 'Edit Entry';

        if (typeof openModal  === 'function') openModal('addDataModal');
        else { const m = document.getElementById('addDataModal'); if (m) m.classList.add('open'); }

    } catch (err) {
        console.error('editRow error:', err);
        if (typeof showToast === 'function') showToast('Could not load entry for editing.', 'error');
    }
}

async function deleteRow(id) {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    try {
        const response = await fetch(`${API_ENDPOINTS.BUSINESS_DATA}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        if (typeof DataCache !== 'undefined') DataCache.invalidate();
        if (typeof showToast === 'function') showToast('Entry deleted.', 'success');
        loadDashboardData();
    } catch (err) {
        if (typeof showToast === 'function') showToast('Failed to delete entry.', 'error');
    }
}

// =============================================================
// ADD / EDIT DATA FORM
// =============================================================
function setupAddDataForm() {
    const form = document.getElementById('addDataForm');
    if (form) form.addEventListener('submit', handleAddData);
}

async function handleAddData(e) {
    e.preventDefault();
    const form = document.getElementById('addDataForm');
    if (!form) return;

    const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

    const date        = get('dataDate');
    const type        = get('dataType');
    const amountStr   = get('dataAmount');
    const category    = get('dataCategory');
    const description = get('dataDescription');
    const amount      = parseFloat(amountStr);

    if (!date)                      { if (typeof showToast === 'function') showToast('Please select a date.', 'warning');  return; }
    if (!type)                      { if (typeof showToast === 'function') showToast('Please select a type.', 'warning');  return; }
    if (isNaN(amount) || amount <= 0) { if (typeof showToast === 'function') showToast('Amount must be a positive number.', 'warning'); return; }

    const payload  = { date, type, amount, category, description };
    const editId   = form.dataset.editId;
    const isEdit   = !!editId;
    const url      = isEdit ? `${API_ENDPOINTS.BUSINESS_DATA}/${editId}` : API_ENDPOINTS.BUSINESS_DATA;
    const method   = isEdit ? 'PUT' : 'POST';
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = isEdit ? 'Updating...' : 'Adding...'; }

    try {
        const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'HTTP ' + response.status);
        }
        if (typeof DataCache !== 'undefined') DataCache.invalidate();
        if (typeof closeModal === 'function') closeModal('addDataModal');
        else { const m = document.getElementById('addDataModal'); if (m) m.classList.remove('open'); }
        resetAddDataForm();
        if (typeof showToast === 'function') showToast(isEdit ? 'Entry updated.' : 'Data added.', 'success');
        loadDashboardData();
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message || 'Failed to save.', 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = isEdit ? 'Update Entry' : 'Add Entry'; }
    }
}

function resetAddDataForm() {
    const form = document.getElementById('addDataForm');
    if (!form) return;
    form.reset();
    delete form.dataset.editId;
    const btn   = form.querySelector('button[type="submit"]');
    const title = document.querySelector('#addDataModal .modal-title');
    if (btn)   btn.textContent   = 'Add Entry';
    if (title) title.textContent = 'Add Data';
}

// =============================================================
// CLEAR DATA
// =============================================================
function setupClearData() {
    const btn = document.getElementById('confirmClearBtn');
    if (btn) btn.addEventListener('click', confirmClearData);
}

async function confirmClearData() {
    const btn = document.getElementById('confirmClearBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Clearing...'; }
    try {
        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA_CLEAR, { method: 'DELETE', headers: getAuthHeaders() });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        if (typeof DataCache !== 'undefined') DataCache.invalidate();
        if (typeof closeModal === 'function') closeModal('clearDataModal');
        else { const m = document.getElementById('clearDataModal'); if (m) m.classList.remove('open'); }
        if (typeof showToast === 'function') showToast('All data cleared.', 'success');
        loadDashboardData();
    } catch (err) {
        if (typeof showToast === 'function') showToast('Failed to clear data.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Yes, Clear All'; }
    }
}

// =============================================================
// COMPARE PANEL
// =============================================================
function openComparePanel()  { const p = document.getElementById('comparePanel'); if (p) p.classList.add('open'); }
function closeComparePanel() { const p = document.getElementById('comparePanel'); if (p) p.classList.remove('open'); }

function setupComparePanel() {
    const closeBtn = document.getElementById('closeCompare');
    if (closeBtn) closeBtn.addEventListener('click', closeComparePanel);
}

function updateComparePeriodInputs(period, type) {
    const inputsDiv = document.getElementById(`period${period}Inputs`);
    const fromInput = document.getElementById(`period${period}From`);
    const toInput = document.getElementById(`period${period}To`);

    if (!inputsDiv || !fromInput || !toInput) return;

    if (type === 'custom') {
        inputsDiv.style.display = 'flex';
        return;
    }

    inputsDiv.style.display = 'none';

    const now = new Date();
    let from, to;

    if (type === 'this-month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = now;
    } else if (type === 'last-month') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'this-quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1);
        to = now;
    } else if (type === 'last-quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
        to = new Date(now.getFullYear(), quarter * 3, 0);
    } else if (type === 'this-year') {
        from = new Date(now.getFullYear(), 0, 1);
        to = now;
    } else if (type === 'last-year') {
        from = new Date(now.getFullYear() - 1, 0, 1);
        to = new Date(now.getFullYear() - 1, 11, 31);
    }

    if (from && to) {
        fromInput.value = toISODate(from);
        toInput.value = toISODate(to);
    }
}

async function runComparison() {
    const periodAType = document.getElementById('periodAType')?.value;
    const periodBType = document.getElementById('periodBType')?.value;
    const resultsEl = document.getElementById('compareResults');

    let aFrom, aTo, bFrom, bTo;

    // Get Period A dates
    if (periodAType === 'custom') {
        aFrom = document.getElementById('periodAFrom')?.value;
        aTo = document.getElementById('periodATo')?.value;
    } else {
        updateComparePeriodInputs('A', periodAType);
        aFrom = document.getElementById('periodAFrom')?.value;
        aTo = document.getElementById('periodATo')?.value;
    }

    // Get Period B dates
    if (periodBType === 'custom') {
        bFrom = document.getElementById('periodBFrom')?.value;
        bTo = document.getElementById('periodBTo')?.value;
    } else {
        updateComparePeriodInputs('B', periodBType);
        bFrom = document.getElementById('periodBFrom')?.value;
        bTo = document.getElementById('periodBTo')?.value;
    }

    if (!aFrom || !aTo || !bFrom || !bTo) {
        if (typeof showToast === 'function') showToast('Please set dates for both periods.', 'warning');
        return;
    }

    const runBtn = document.querySelector('#comparePanel .btn-action.primary');
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = 'Comparing...'; }
    if (resultsEl) {
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted,#64748b)">Loading comparison...</div>';
    }

    try {
        const allRows = (dashboardData && (dashboardData.recent_data || dashboardData.recentData)) || [];
        const periodA = filterByDateRange(allRows, aFrom, aTo);
        const periodB = filterByDateRange(allRows, bFrom, bTo);
        const aStats = computePeriodStats(periodA);
        const bStats = computePeriodStats(periodB);

        if (resultsEl) {
            const periodALabel = periodAType === 'custom' ? `${aFrom} – ${aTo}` : formatPeriodLabel(periodAType);
            const periodBLabel = periodBType === 'custom' ? `${bFrom} – ${bTo}` : formatPeriodLabel(periodBType);
            resultsEl.innerHTML = buildCompareResultsHtml(aStats, bStats, periodALabel, periodBLabel);
        }

    } catch (err) {
        console.error('Comparison error:', err);
        if (resultsEl) resultsEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--accent-red,#ef4444)">Comparison failed.</div>';
    } finally {
        if (runBtn) { runBtn.disabled = false; runBtn.textContent = 'Compare →'; }
    }
}

function formatPeriodLabel(type) {
    const labels = {
        'this-month': 'This Month',
        'last-month': 'Last Month',
        'this-quarter': 'This Quarter',
        'last-quarter': 'Last Quarter',
        'this-year': 'This Year',
        'last-year': 'Last Year'
    };
    return labels[type] || type;
}

function filterByDateRange(rows, from, to) {
    const fromDate = from ? new Date(from) : null;
    const toDate   = to   ? new Date(to + 'T23:59:59') : null;
    return rows.filter(row => {
        const d = new Date(row.record_date || row.date || row.Date || row.created_at || '');
        if (isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate   && d > toDate)   return false;
        return true;
    });
}

function computePeriodStats(rows) {
    let sales = 0, expenses = 0, profit = 0;
    rows.forEach(row => {
        // Use new format (sales/expenses/profit) first
        const salesVal = parseFloat(row.sales || 0);
        const expensesVal = parseFloat(row.expenses || 0);
        const profitVal = parseFloat(row.profit || 0);

        // Fallback to legacy format (type+amount)
        const amount = parseFloat(row.amount || row.Amount || 0);
        const type = (row.type || row.Type || row.data_type || '').toLowerCase();

        if (salesVal > 0) {
            sales += salesVal;
        } else if (['sale','sales','income','revenue'].includes(type)) {
            sales += amount;
        }

        if (expensesVal > 0) {
            expenses += expensesVal;
        } else if (['expense','expenses','cost'].includes(type)) {
            expenses += amount;
        }

        if (profitVal > 0) {
            profit += profitVal;
        } else if (type === 'profit') {
            profit += amount;
        }
    });

    // If profit wasn't explicitly set, calculate from sales - expenses
    if (profit === 0 && (sales > 0 || expenses > 0)) {
        profit = sales - expenses;
    }

    return { sales, expenses, profit, count: rows.length };
}

function buildCompareResultsHtml(a, b, labelA, labelB) {
    const pct = (a, b) => {
        if (b === 0) return a > 0 ? '+100%' : '—';
        const p = ((a - b) / Math.abs(b) * 100).toFixed(1);
        return (parseFloat(p) > 0 ? '+' : '') + p + '%';
    };
    const clr = (a, b) => a >= b ? 'var(--accent-green,#22c55e)' : 'var(--accent-red,#ef4444)';
    const fmt = n => '\u20b9' + Number(n).toLocaleString('en-IN');

    let html = `<div style="padding:1rem">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div></div>
            <div style="text-align:center;font-weight:600">${escapeHtml(labelA)}</div>
            <div style="text-align:center;font-weight:600">${escapeHtml(labelB)}</div>
        </div>`;

    [
        { label: 'Sales',     ka: a.sales,    kb: b.sales    },
        { label: 'Expenses',  ka: a.expenses, kb: b.expenses },
        { label: 'Profit',    ka: a.profit,   kb: b.profit   },
        { label: 'Entries',   ka: a.count,    kb: b.count,  isCount: true }
    ].forEach(r => {
        const diff = pct(r.ka, r.kb);
        const c    = clr(r.ka, r.kb);
        html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;padding:.75rem 0;border-top:1px solid rgba(148,163,184,0.1)">
            <div style="color:var(--text-muted,#64748b);font-size:.875rem">${r.label}</div>
            <div style="text-align:center;font-variant-numeric:tabular-nums">${r.isCount ? r.ka : fmt(r.ka)}</div>
            <div style="text-align:center;font-variant-numeric:tabular-nums">${r.isCount ? r.kb : fmt(r.kb)} <span style="font-size:.75rem;color:${c}">${diff}</span></div>
        </div>`;
    });

    html += '</div>';
    return html;
}

// =============================================================
// TIME FILTER BUTTONS (with metrics recalculation)
// =============================================================
function applyTimeFilter(filter, button) {
    activeFilter = filter;

    // Update button states
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');

    // Show/hide custom date range
    const customRow = document.getElementById('customRangeRow');
    const filterInfo = document.getElementById('filterInfoRow');
    if (customRow) customRow.style.display = filter === 'custom' ? 'flex' : 'none';

    // Update filter info display
    if (filterInfo) {
        const labels = {
            all: '',
            year: 'Showing data from last 12 months',
            '6months': 'Showing data from last 6 months',
            '3months': 'Showing data from last 3 months',
            month: 'Showing data from last 30 days',
            week: 'Showing data from last 7 days',
            custom: 'Select date range below'
        };
        filterInfo.textContent = labels[filter] || '';
        filterInfo.style.display = labels[filter] ? 'block' : 'none';
    }

    // Apply filter if not custom (custom requires date selection)
    if (filter !== 'custom') {
        applyFilterToData(filter);
    }
}

function applyCustomRange() {
    const fromEl = document.getElementById('customFrom');
    const toEl = document.getElementById('customTo');

    if (!fromEl || !toEl || !fromEl.value || !toEl.value) {
        if (typeof showToast === 'function') showToast('Please select both From and To dates', 'warning');
        return;
    }

    const filterInfo = document.getElementById('filterInfoRow');
    if (filterInfo) {
        filterInfo.textContent = `Showing data from ${fromEl.value} to ${toEl.value}`;
        filterInfo.style.display = 'block';
    }

    applyFilterToData('custom', fromEl.value, toEl.value);
}

function applyFilterToData(filter, customFrom, customTo) {
    if (!dashboardData) return;

    const allRows = dashboardData.recent_data || dashboardData.recentData || [];
    const filtered = filterDataByRange(allRows, filter, customFrom, customTo);

    // Recalculate metrics from filtered data
    const metrics = calculateMetricsFromRows(filtered);
    updateMetricsDisplay(metrics);

    // Rebuild charts from filtered data
    rebuildChartsFromFilter(filtered);

    // Update recent data table
    renderRecentData(filtered);
}

function filterDataByRange(data, filter, customFrom, customTo) {
    if (!data || !Array.isArray(data)) return [];
    if (filter === 'all') return data;

    const now = new Date();
    let cutoff;

    if (filter === 'custom' && customFrom && customTo) {
        const fromDate = new Date(customFrom);
        const toDate = new Date(customTo + 'T23:59:59');
        return data.filter(row => {
            const d = new Date(row.record_date || row.date || row.Date || row.created_at || '');
            return !isNaN(d.getTime()) && d >= fromDate && d <= toDate;
        });
    }

    if (filter === 'week')          cutoff = new Date(now - 7   * 86400000);
    else if (filter === 'month')    cutoff = new Date(now - 30  * 86400000);
    else if (filter === '3months')  cutoff = new Date(now - 90  * 86400000);
    else if (filter === '6months')  cutoff = new Date(now - 180 * 86400000);
    else if (filter === 'year')     cutoff = new Date(now - 365 * 86400000);
    else return data;

    return data.filter(row => {
        const d = new Date(row.record_date || row.date || row.Date || row.created_at || '');
        return !isNaN(d.getTime()) && d >= cutoff;
    });
}

function calculateMetricsFromRows(rows) {
    let totalSales = 0, totalProfit = 0, totalExpenses = 0;

    rows.forEach(row => {
        const sales = parseFloat(row.sales || 0);
        const expenses = parseFloat(row.expenses || 0);
        const profit = parseFloat(row.profit || 0);

        totalSales += sales;
        totalExpenses += expenses;
        totalProfit += profit;
    });

    return {
        totalSales,
        totalProfit,
        totalExpenses,
        dataCount: rows.length
    };
}

function updateMetricsDisplay(metrics) {
    const salesEl = document.getElementById('totalSales');
    const profitEl = document.getElementById('totalProfit');
    const expensesEl = document.getElementById('totalExpenses');
    const countEl = document.getElementById('dataCount');

    if (salesEl) {
        salesEl.style.fontVariantNumeric = 'tabular-nums';
        countUp(salesEl, metrics.totalSales, '\u20b9', '');
    }
    if (profitEl) {
        profitEl.style.fontVariantNumeric = 'tabular-nums';
        countUp(profitEl, metrics.totalProfit, '\u20b9', '');
    }
    if (expensesEl) {
        expensesEl.style.fontVariantNumeric = 'tabular-nums';
        countUp(expensesEl, metrics.totalExpenses, '\u20b9', '');
    }
    if (countEl) {
        countEl.style.fontVariantNumeric = 'tabular-nums';
        countUp(countEl, metrics.dataCount, '', '');
    }
}

// =============================================================
// FILTER PILLS SETUP
// =============================================================
function setupFilterPills() {
    const pillMap = { filterAll: 'all', filterYear: 'year', filter6months: '6months', filter3months: '3months', filterMonth: 'month', filterWeek: 'week', filterCustom: 'custom' };
    Object.entries(pillMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => applyFilter(val));
    });
    const applyBtn = document.getElementById('applyCustomFilter');
    if (applyBtn) applyBtn.addEventListener('click', () => applyFilter('custom'));
}

// =============================================================
// UPLOAD ZONE SETUP
// =============================================================
function setupUploadZone() {
    const zone      = document.getElementById('uploadZone');
    const fileInput = document.getElementById('excelFileInput');
    const errorBox  = document.getElementById('uploadErrorBox');
    if (!zone || !fileInput) return;

    zone.addEventListener('click', e => { if (e.target !== fileInput) fileInput.click(); });
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragenter', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (errorBox) { errorBox.textContent = ''; errorBox.style.display = 'none'; }
        const files = e.dataTransfer.files;
        if (files && files.length > 0) handleUploadFile(files[0]);
    });

    fileInput.addEventListener('change', function() {
        if (errorBox) { errorBox.textContent = ''; errorBox.style.display = 'none'; }
        if (this.files && this.files.length > 0) handleUploadFile(this.files[0]);
    });
}

function handleUploadFile(file) {
    const errorBox = document.getElementById('uploadErrorBox');
    const allowed  = ['.xlsx', '.xls', '.csv'];
    const ext      = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowed.includes(ext)) {
        if (errorBox) { errorBox.textContent = 'Invalid file type. Use .xlsx, .xls, or .csv'; errorBox.style.display = 'block'; }
        return;
    }

    // Prefer uploadFile from data-import-export.js if available (does full validation)
    if (typeof uploadFile === 'function') {
        uploadFile(file);
        return;
    }

    const zone     = document.getElementById('uploadZone');
    const token    = getToken();
    const formData = new FormData();
    formData.append('file', file);

    if (zone) zone.classList.add('uploading');

    fetch(API_ENDPOINTS.BUSINESS_DATA_UPLOAD, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        body: formData
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(result => {
        if (zone) zone.classList.remove('uploading');
        if (result.ok && result.data.success !== false) {
            if (typeof DataCache !== 'undefined') DataCache.invalidate();
            const m = document.getElementById('uploadDataModal');
            if (m) m.classList.remove('open');
            if (typeof showToast === 'function') showToast('File uploaded successfully.', 'success');
            loadDashboardData();
        } else {
            throw new Error((result.data && result.data.message) || 'Upload failed');
        }
    })
    .catch(err => {
        if (zone) zone.classList.remove('uploading');
        if (errorBox) { errorBox.textContent = err.message || 'Upload failed'; errorBox.style.display = 'block'; }
        if (typeof showToast === 'function') showToast('Upload failed: ' + (err.message || 'Unknown error'), 'error');
    });
}

// =============================================================
// MODAL SETUP
// =============================================================
function setupModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
                if (overlay.id === 'addDataModal') resetAddDataForm();
            }
        });
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => {
                m.classList.remove('open');
                if (m.id === 'addDataModal') resetAddDataForm();
            });
        }
    });

    // Add Data button
    const addDataBtn = document.getElementById('addDataBtn');
    if (addDataBtn) {
        addDataBtn.addEventListener('click', () => {
            resetAddDataForm();
            openModalById('addDataModal');
        });
    }

    // Upload button
    const uploadBtn = document.getElementById('uploadDataBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            openModalById('uploadDataModal');
        });
    }

    // Clear Data button
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            openModalById('clearDataModal');
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const icon = refreshBtn.querySelector('svg');
            if (icon) icon.style.animation = 'spinning 1s linear infinite';
            if (typeof DataCache !== 'undefined') DataCache.invalidate();
            loadDashboardData().then(() => { if (icon) icon.style.animation = ''; }).catch(() => { if (icon) icon.style.animation = ''; });
            if (typeof showToast === 'function') showToast('Refreshing dashboard...', 'info');
        });
    }

    setupClearData();
}

// =============================================================
// INITIALIZATION
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    applyChartDefaults();
    loadDashboardData();
    setupFilterPills();
    setupUploadZone();
    setupComparePanel();
    setupAddDataForm();
    setupModals();
});
