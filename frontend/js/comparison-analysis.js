// comparison-analysis.js — Period Comparison Panel Logic
// DataXpert Frontend — Comparison Module

'use strict';

// ─────────────────────────────────────────────
// 1. getDateRangeForPeriod
// ─────────────────────────────────────────────
function getDateRangeForPeriod(periodType, customStart, customEnd) {
    const now = new Date();
    const toISO = (d) => d.toISOString().split('T')[0];

    const startOf = (d) => {
        const c = new Date(d);
        c.setHours(0, 0, 0, 0);
        return c;
    };

    const endOf = (d) => {
        const c = new Date(d);
        c.setHours(23, 59, 59, 999);
        return c;
    };

    switch (periodType) {
        case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { start: toISO(start), end: toISO(end), label: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) };
        }
        case 'last_month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: toISO(start), end: toISO(end), label: start.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) };
        }
        case 'this_quarter': {
            const q = Math.floor(now.getMonth() / 3);
            const start = new Date(now.getFullYear(), q * 3, 1);
            const end = new Date(now.getFullYear(), q * 3 + 3, 0);
            return { start: toISO(start), end: toISO(end), label: `Q${q + 1} ${now.getFullYear()}` };
        }
        case 'last_quarter': {
            const q = Math.floor(now.getMonth() / 3) - 1;
            const yr = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
            const aq = ((q % 4) + 4) % 4;
            const start = new Date(yr, aq * 3, 1);
            const end = new Date(yr, aq * 3 + 3, 0);
            return { start: toISO(start), end: toISO(end), label: `Q${aq + 1} ${yr}` };
        }
        case 'this_year': {
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31);
            return { start: toISO(start), end: toISO(end), label: String(now.getFullYear()) };
        }
        case 'last_year': {
            const yr = now.getFullYear() - 1;
            const start = new Date(yr, 0, 1);
            const end = new Date(yr, 11, 31);
            return { start: toISO(start), end: toISO(end), label: String(yr) };
        }
        case 'last_7_days': {
            const start = new Date(now);
            start.setDate(start.getDate() - 6);
            return { start: toISO(startOf(start)), end: toISO(now), label: 'Last 7 Days' };
        }
        case 'last_30_days': {
            const start = new Date(now);
            start.setDate(start.getDate() - 29);
            return { start: toISO(startOf(start)), end: toISO(now), label: 'Last 30 Days' };
        }
        case 'custom': {
            if (!customStart || !customEnd) return null;
            const startD = new Date(customStart);
            const endD = new Date(customEnd);
            const fmtOpts = { day: 'numeric', month: 'short', year: 'numeric' };
            return {
                start: toISO(startD),
                end: toISO(endD),
                label: `${startD.toLocaleDateString('en-IN', fmtOpts)} – ${endD.toLocaleDateString('en-IN', fmtOpts)}`
            };
        }
        default:
            return null;
    }
}

// ─────────────────────────────────────────────
// 2. fetchPeriodData — DataCache-first
// ─────────────────────────────────────────────
async function fetchPeriodData(start, end) {
    // Check if the full dataset is cached and we can filter locally
    if (typeof DataCache !== 'undefined' && DataCache.isValid()) {
        const cached = DataCache.get();
        const rows = cached && cached.rows ? cached.rows
            : cached && Array.isArray(cached) ? cached
            : null;
        if (rows) {
            return rows.filter(r => {
                const d = r.date || r.created_at || '';
                return d >= start && d <= end;
            });
        }
    }

    // Fallback: fetch filtered data from API
    try {
        const url = `${API_ENDPOINTS.BUSINESS_DATA}?start=${start}&end=${end}`;
        const resp = await fetch(url, { headers: getAuthHeaders() });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.data || data.rows || data.records || [];
    } catch (_) {
        return [];
    }
}

// ─────────────────────────────────────────────
// 3. calculateMetrics
// ─────────────────────────────────────────────
function calculateMetrics(records) {
    const metrics = { sales: 0, expenses: 0, revenue: 0, profit: 0, entries: 0 };
    if (!records || records.length === 0) return metrics;

    records.forEach(r => {
        const amount = parseFloat(r.amount) || 0;
        const type = (r.type || '').toLowerCase();
        metrics.entries++;
        if (type === 'sale' || type === 'revenue') {
            metrics.sales += amount;
            metrics.revenue += amount;
        } else if (type === 'expense') {
            metrics.expenses += amount;
        } else if (type === 'profit') {
            metrics.profit += amount;
        }
    });

    // Derive profit if not explicitly tracked
    if (metrics.profit === 0 && metrics.revenue > 0) {
        metrics.profit = metrics.revenue - metrics.expenses;
    }

    return metrics;
}

// ─────────────────────────────────────────────
// 4. calculateChange — returns formatted string
// ─────────────────────────────────────────────
function calculateChange(current, previous) {
    if (!previous || previous === 0) return { text: 'N/A', positive: null };
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const sign = pct >= 0 ? '+' : '';
    return {
        text: `${sign}${pct.toFixed(1)}%`,
        positive: pct >= 0
    };
}

// ─────────────────────────────────────────────
// 5. renderCompareMetrics
// ─────────────────────────────────────────────
function renderCompareMetrics(metricsA, metricsB, labelA, labelB) {
    const fmt = (val) => '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    const metricRows = [
        { key: 'sales',    label: 'Total Sales' },
        { key: 'revenue',  label: 'Revenue' },
        { key: 'expenses', label: 'Expenses' },
        { key: 'profit',   label: 'Profit' },
        { key: 'entries',  label: 'Entries', isCount: true }
    ];

    const fmtVal = (val, isCount) => isCount
        ? Number(val).toLocaleString('en-IN')
        : fmt(val);

    let html = `
        <div class="compare-metrics-grid">
            <div class="compare-metric-header"></div>
            <div class="compare-metric-header period-a-label">${escapeHtml ? escapeHtml(labelA) : labelA}</div>
            <div class="compare-metric-header period-b-label">${escapeHtml ? escapeHtml(labelB) : labelB}</div>
            <div class="compare-metric-header">Change</div>
    `;

    metricRows.forEach(m => {
        const valA = metricsA[m.key] || 0;
        const valB = metricsB[m.key] || 0;
        const change = calculateChange(valB, valA);
        const changeClass = change.positive === true ? 'positive' : change.positive === false ? 'negative' : '';
        const arrow = change.positive === true ? '▲' : change.positive === false ? '▼' : '—';
        html += `
            <div class="compare-metric-row">
                <div class="compare-metric-name">${m.label}</div>
                <div class="compare-metric-val mono">${fmtVal(valA, m.isCount)}</div>
                <div class="compare-metric-val mono">${fmtVal(valB, m.isCount)}</div>
                <div class="compare-metric-change ${changeClass}">
                    <span class="change-arrow">${arrow}</span>
                    <span class="change-pct">${change.text}</span>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// ─────────────────────────────────────────────
// 6. renderCompareChart
// ─────────────────────────────────────────────
function renderCompareChart(metricsA, metricsB, labelA, labelB) {
    const canvas = document.getElementById('compareChart');
    if (!canvas) return;

    if (window.compareChartInstance) {
        window.compareChartInstance.destroy();
        window.compareChartInstance = null;
    }

    if (typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const categories = ['Sales', 'Revenue', 'Expenses', 'Profit'];
    const dataA = [metricsA.sales, metricsA.revenue, metricsA.expenses, metricsA.profit];
    const dataB = [metricsB.sales, metricsB.revenue, metricsB.expenses, metricsB.profit];

    window.compareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: labelA,
                    data: dataA,
                    backgroundColor: 'rgba(99,102,241,0.75)',
                    borderColor: 'rgba(99,102,241,1)',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: labelB,
                    data: dataB,
                    backgroundColor: 'rgba(34,211,238,0.75)',
                    borderColor: 'rgba(34,211,238,1)',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0', font: { family: 'DM Mono, monospace', size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
                    },
                    grid: { color: 'rgba(148,163,184,0.08)' }
                }
            }
        }
    });
}

// ─────────────────────────────────────────────
// 7. generateInsights
// ─────────────────────────────────────────────
function generateInsights(metricsA, metricsB, labelA, labelB) {
    const insights = [];

    const compare = (key, label, isExpense) => {
        const a = metricsA[key] || 0;
        const b = metricsB[key] || 0;
        const ch = calculateChange(b, a);
        if (ch.text === 'N/A') return null;

        const better = isExpense ? !ch.positive : ch.positive;
        const icon = ch.positive === true ? '▲' : ch.positive === false ? '▼' : '—';
        const cls = better ? 'insight-positive' : 'insight-negative';
        const fmtA = '₹' + Number(a).toLocaleString('en-IN', { maximumFractionDigits: 0 });
        const fmtB = '₹' + Number(b).toLocaleString('en-IN', { maximumFractionDigits: 0 });

        return `<li class="${cls}"><span class="insight-icon">${icon}</span> <strong>${label}</strong> moved from ${fmtA} (${labelA}) to ${fmtB} (${labelB}) — <strong>${ch.text}</strong></li>`;
    };

    const s = compare('sales', 'Total Sales', false);
    const r = compare('revenue', 'Revenue', false);
    const e = compare('expenses', 'Expenses', true);
    const p = compare('profit', 'Profit', false);

    if (s) insights.push(s);
    if (r) insights.push(r);
    if (e) insights.push(e);
    if (p) insights.push(p);

    // Entry count
    const ea = metricsA.entries || 0;
    const eb = metricsB.entries || 0;
    if (ea || eb) {
        const diff = eb - ea;
        const icon = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
        const cls = diff >= 0 ? 'insight-neutral' : 'insight-negative';
        insights.push(`<li class="${cls}"><span class="insight-icon">${icon}</span> <strong>Entries</strong>: ${ea.toLocaleString('en-IN')} (${labelA}) → ${eb.toLocaleString('en-IN')} (${labelB})</li>`);
    }

    // Profit margin
    const revA = metricsA.revenue || 0;
    const revB = metricsB.revenue || 0;
    if (revA && revB) {
        const marginA = ((metricsA.profit / revA) * 100).toFixed(1);
        const marginB = ((metricsB.profit / revB) * 100).toFixed(1);
        const marginDiff = parseFloat(marginB) - parseFloat(marginA);
        const icon = marginDiff >= 0 ? '▲' : '▼';
        const cls = marginDiff >= 0 ? 'insight-positive' : 'insight-negative';
        insights.push(`<li class="${cls}"><span class="insight-icon">${icon}</span> <strong>Profit Margin</strong>: ${marginA}% (${labelA}) → ${marginB}% (${labelB})</li>`);
    }

    return insights;
}

// ─────────────────────────────────────────────
// 8. renderCompareResults — assembles full DOM
// ─────────────────────────────────────────────
function renderCompareResults(metricsA, metricsB, labelA, labelB) {
    const resultsEl = document.getElementById('compareResults');
    if (!resultsEl) return;

    const insights = generateInsights(metricsA, metricsB, labelA, labelB);
    const insightsHTML = insights.length
        ? `<ul class="compare-insights-list">${insights.join('')}</ul>`
        : '<p class="compare-no-data">No significant changes detected.</p>';

    resultsEl.innerHTML = `
        <div class="compare-results-inner">
            <div class="compare-section">
                <h4 class="compare-section-title">Period Breakdown</h4>
                ${renderCompareMetrics(metricsA, metricsB, labelA, labelB)}
            </div>
            <div class="compare-section">
                <h4 class="compare-section-title">Visual Comparison</h4>
                <div class="compare-chart-wrap">
                    <canvas id="compareChart" style="max-height:220px;"></canvas>
                </div>
            </div>
            <div class="compare-section">
                <h4 class="compare-section-title">Key Insights</h4>
                <div id="compareInsightsList">${insightsHTML}</div>
            </div>
        </div>
    `;
    resultsEl.style.display = 'block';

    // Render chart after DOM update
    renderCompareChart(metricsA, metricsB, labelA, labelB);
}

// ─────────────────────────────────────────────
// 9. runComparison — main entry point
// ─────────────────────────────────────────────
async function runComparison() {
    const periodAType = document.getElementById('periodAType');
    const periodBType = document.getElementById('periodBType');
    const customAStart = document.getElementById('customAStart');
    const customAEnd = document.getElementById('customAEnd');
    const customBStart = document.getElementById('customBStart');
    const customBEnd = document.getElementById('customBEnd');
    const runBtn = document.getElementById('runCompareBtn');
    const resultsEl = document.getElementById('compareResults');

    if (!periodAType || !periodBType) return;

    const typeA = periodAType.value;
    const typeB = periodBType.value;

    const rangeA = getDateRangeForPeriod(
        typeA,
        customAStart ? customAStart.value : null,
        customAEnd ? customAEnd.value : null
    );
    const rangeB = getDateRangeForPeriod(
        typeB,
        customBStart ? customBStart.value : null,
        customBEnd ? customBEnd.value : null
    );

    if (!rangeA || !rangeB) {
        if (typeof showToast === 'function') showToast('Please select valid periods for both A and B.', 'warning');
        return;
    }

    // Show spinner
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="btn-spinner"></span> Comparing…';
    }
    if (resultsEl) {
        resultsEl.innerHTML = `
            <div class="compare-loading">
                <div class="skeleton" style="height:20px;width:60%;margin-bottom:8px;"></div>
                <div class="skeleton" style="height:20px;width:80%;margin-bottom:8px;"></div>
                <div class="skeleton" style="height:160px;width:100%;"></div>
            </div>
        `;
        resultsEl.style.display = 'block';
    }

    try {
        const [rowsA, rowsB] = await Promise.all([
            fetchPeriodData(rangeA.start, rangeA.end),
            fetchPeriodData(rangeB.start, rangeB.end)
        ]);

        const metricsA = calculateMetrics(rowsA);
        const metricsB = calculateMetrics(rowsB);

        renderCompareResults(metricsA, metricsB, rangeA.label, rangeB.label);
    } catch (err) {
        console.error('Comparison failed:', err);
        if (typeof showToast === 'function') showToast('Comparison failed. Please try again.', 'error');
        if (resultsEl) resultsEl.innerHTML = '<p class="compare-error">Failed to load comparison data.</p>';
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = 'Compare Periods';
        }
    }
}

// ─────────────────────────────────────────────
// 10. openComparePanel / closeComparePanel
// ─────────────────────────────────────────────
function openComparePanel() {
    const panel = document.getElementById('comparePanel');
    if (!panel) return;
    panel.classList.add('open');
    document.body.classList.add('compare-panel-open');
}

function closeComparePanel() {
    const panel = document.getElementById('comparePanel');
    if (!panel) return;
    panel.classList.remove('open');
    document.body.classList.remove('compare-panel-open');

    // Destroy chart on close to free memory
    if (window.compareChartInstance) {
        window.compareChartInstance.destroy();
        window.compareChartInstance = null;
    }
}

// ─────────────────────────────────────────────
// 11. setupComparePanel — wire up event listeners
// ─────────────────────────────────────────────
function setupComparePanel() {
    // Open button (in dashboard toolbar)
    const openBtn = document.getElementById('openCompareBtn');
    if (openBtn) openBtn.addEventListener('click', openComparePanel);

    // Close button inside panel
    const closeBtn = document.getElementById('closePanelBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeComparePanel);

    // Backdrop click to close
    const panel = document.getElementById('comparePanel');
    if (panel) {
        panel.addEventListener('click', (e) => {
            if (e.target === panel) closeComparePanel();
        });
    }

    // Run comparison button
    const runBtn = document.getElementById('runCompareBtn');
    if (runBtn) runBtn.addEventListener('click', runComparison);

    // Show/hide custom date rows based on period type selection
    const handlePeriodTypeChange = (selectEl, customRowId) => {
        if (!selectEl) return;
        selectEl.addEventListener('change', () => {
            const customRow = document.getElementById(customRowId);
            if (!customRow) return;
            customRow.style.display = selectEl.value === 'custom' ? 'flex' : 'none';
        });
    };

    handlePeriodTypeChange(document.getElementById('periodAType'), 'customRowA');
    handlePeriodTypeChange(document.getElementById('periodBType'), 'customRowB');

    // ESC key closes panel
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const p = document.getElementById('comparePanel');
            if (p && p.classList.contains('open')) closeComparePanel();
        }
    });
}

// ─────────────────────────────────────────────
// Auto-init on DOMContentLoaded
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupComparePanel();
});
