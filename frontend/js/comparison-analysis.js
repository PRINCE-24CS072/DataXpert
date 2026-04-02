// Comparison Analysis Module
// AI-backed comparison across time periods or categories

const COMPARISON_PERIODS = {
    week: { label: 'This Week vs Last Week', days: 7 },
    month: { label: 'This Month vs Last Month', days: 30 },
    quarter: { label: 'This Quarter vs Last Quarter', days: 90 },
    year: { label: 'This Year vs Last Year', days: 365 },
    custom: { label: 'Custom Range', days: null }
};

let lastComparisonReport = null;
let lastComparisonAnalysis = null;

function createComparisonModal() {
    const modal = document.createElement('div');
    modal.id = 'comparisonModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 920px;">
            <span class="close" onclick="closeComparisonModal()">&times;</span>
            <h2><i class="fas fa-balance-scale"></i> Period Comparison</h2>
            <p>Compare your business metrics across different time periods with AI insights</p>

            <div class="comparison-controls" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: 12px; margin: 20px 0; align-items: end;">
                <div>
                    <label for="comparisonPeriod" style="display:block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary);">Period</label>
                    <select id="comparisonPeriod" class="form-control" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);" onchange="toggleComparisonCustomRange()">
                        <option value="week">This Week vs Last Week</option>
                        <option value="month" selected>This Month vs Last Month</option>
                        <option value="quarter">This Quarter vs Last Quarter</option>
                        <option value="year">This Year vs Last Year</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
                <div id="comparisonCustomStartWrap" style="display:none;">
                    <label for="comparisonStartDate" style="display:block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary);">Start Date</label>
                    <input type="date" id="comparisonStartDate" class="form-control" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                </div>
                <div id="comparisonCustomEndWrap" style="display:none;">
                    <label for="comparisonEndDate" style="display:block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary);">End Date</label>
                    <input type="date" id="comparisonEndDate" class="form-control" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                </div>
                <button class="btn btn-primary" onclick="runComparison()" style="height: 42px;">
                    <i class="fas fa-sync"></i> Compare
                </button>
            </div>

            <div id="comparisonResults" style="display: none;">
                <div class="comparison-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 20px;">
                    <div class="comparison-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                        <h4 style="color: var(--primary-color); margin-bottom: 15px;">
                            <i class="fas fa-calendar-day"></i> Current Period
                        </h4>
                        <p id="currentPeriodRange" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px;"></p>
                        <div id="currentMetrics"></div>
                    </div>

                    <div class="comparison-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                        <h4 style="color: var(--text-secondary); margin-bottom: 15px;">
                            <i class="fas fa-calendar-alt"></i> Previous Period
                        </h4>
                        <p id="previousPeriodRange" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px;"></p>
                        <div id="previousMetrics"></div>
                    </div>
                </div>

                <div class="changes-summary" style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--card-bg) 100%); border-radius: 12px;">
                    <h4 style="margin-bottom: 20px;"><i class="fas fa-chart-line"></i> Changes</h4>
                    <div id="changesGrid" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 15px;"></div>
                </div>

                <div class="ai-summary" style="margin-top: 20px; padding: 20px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px;">
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-robot"></i> AI Summary</h4>
                    <p id="comparisonAiSummary" style="margin-bottom: 12px; color: var(--text-secondary);"></p>
                    <ul id="comparisonAiInsights" style="margin: 0; padding-left: 20px;"></ul>
                    <div id="comparisonAiRecommendations" style="margin-top: 14px;"></div>
                </div>
            </div>

            <div id="comparisonLoading" style="display: none; text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary-color);"></i>
                <p style="margin-top: 15px; color: var(--text-secondary);">Analyzing data...</p>
            </div>

            <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="exportComparisonReport()" id="exportComparisonBtn" style="display:none;">
                    <i class="fas fa-file-pdf"></i> Export Report
                </button>
                <button class="btn btn-secondary" onclick="closeComparisonModal()">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    toggleComparisonCustomRange();
}

function toggleComparisonCustomRange() {
    const periodSelect = document.getElementById('comparisonPeriod');
    const isCustom = periodSelect && periodSelect.value === 'custom';
    const startWrap = document.getElementById('comparisonCustomStartWrap');
    const endWrap = document.getElementById('comparisonCustomEndWrap');

    if (startWrap) {
        startWrap.style.display = isCustom ? 'block' : 'none';
    }
    if (endWrap) {
        endWrap.style.display = isCustom ? 'block' : 'none';
    }
}

function formatCurrency(value) {
    const numericValue = Number(value) || 0;
    return `₹${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
    const numericValue = Number(value) || 0;
    const sign = numericValue > 0 ? '+' : '';
    return `${sign}${numericValue.toFixed(1)}%`;
}

function formatPeriodLabel(report, fallbackLabel) {
    if (!report || !report.currentPeriod || !report.previousPeriod) {
        return fallbackLabel;
    }

    return `${report.currentPeriod.start} - ${report.currentPeriod.end}`;
}

function updateMetricsDisplay(elementId, metrics) {
    const container = document.getElementById(elementId);
    if (!container || !metrics) {
        return;
    }

    container.innerHTML = `
        <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <span>Total Sales</span>
                <strong>${formatCurrency(metrics.totalSales)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <span>Total Expenses</span>
                <strong>${formatCurrency(metrics.totalExpenses)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <span>Total Revenue</span>
                <strong>${formatCurrency(metrics.totalRevenue)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <span>Total Profit</span>
                <strong>${formatCurrency(metrics.totalProfit)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Transactions</span>
                <strong>${Number(metrics.transactionCount || 0).toLocaleString()}</strong>
            </div>
        </div>
    `;
}

function updateChangesGrid(changes) {
    const container = document.getElementById('changesGrid');
    if (!container || !changes) {
        return;
    }

    const createChangeCard = (label, value, icon) => {
        const numericValue = Number(value) || 0;
        const isPositive = numericValue >= 0;
        const color = isPositive ? '#10b981' : '#ef4444';
        const arrow = isPositive ? '↑' : '↓';

        return `
            <div style="text-align: center; padding: 15px; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                <i class="${icon}" style="font-size: 24px; color: var(--primary-color); margin-bottom: 10px;"></i>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">${label}</div>
                <div style="font-size: 18px; font-weight: 700; color: ${color};">
                    ${arrow} ${Math.abs(numericValue).toFixed(1)}%
                </div>
            </div>
        `;
    };

    container.innerHTML = `
        ${createChangeCard('Sales', changes.sales, 'fas fa-rupee-sign')}
        ${createChangeCard('Expenses', changes.expenses, 'fas fa-wallet')}
        ${createChangeCard('Revenue', changes.revenue, 'fas fa-chart-line')}
        ${createChangeCard('Profit', changes.profit, 'fas fa-coins')}
        ${createChangeCard('Transactions', changes.transactions, 'fas fa-exchange-alt')}
    `;
}

function updateAiSummary(analysis) {
    const summaryElement = document.getElementById('comparisonAiSummary');
    const insightsElement = document.getElementById('comparisonAiInsights');
    const recommendationsElement = document.getElementById('comparisonAiRecommendations');

    if (!summaryElement || !insightsElement || !recommendationsElement || !analysis) {
        return;
    }

    summaryElement.textContent = analysis.summary || 'No AI summary available.';
    insightsElement.innerHTML = (analysis.insights || []).map(insight => `<li>${insight}</li>`).join('');
    recommendationsElement.innerHTML = (analysis.recommendations && analysis.recommendations.length)
        ? `
            <strong>Recommendations</strong>
            <ul style="margin: 8px 0 0; padding-left: 20px;">
                ${analysis.recommendations.map(item => `<li>${item}</li>`).join('')}
            </ul>
        `
        : '';
}

async function runComparison() {
    const periodSelect = document.getElementById('comparisonPeriod');
    const periodType = periodSelect ? periodSelect.value : 'month';
    const isCustom = periodType === 'custom';
    const customStart = document.getElementById('comparisonStartDate')?.value;
    const customEnd = document.getElementById('comparisonEndDate')?.value;

    if (isCustom && (!customStart || !customEnd)) {
        showMessage('Select both start and end dates for a custom comparison', 'error');
        return;
    }

    const resultsElement = document.getElementById('comparisonResults');
    const loadingElement = document.getElementById('comparisonLoading');
    const exportButton = document.getElementById('exportComparisonBtn');

    if (resultsElement) resultsElement.style.display = 'none';
    if (loadingElement) loadingElement.style.display = 'block';
    if (exportButton) exportButton.style.display = 'none';

    try {
        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA_COMPARE, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                period_type: periodType,
                custom_start: customStart || null,
                custom_end: customEnd || null
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Unable to generate comparison');
        }

        lastComparisonReport = result.report;
        lastComparisonAnalysis = result.ai_analysis;

        document.getElementById('currentPeriodRange').textContent = formatPeriodLabel(result.report, 'Current period');
        document.getElementById('previousPeriodRange').textContent = `${result.report.previousPeriod.start} - ${result.report.previousPeriod.end}`;

        updateMetricsDisplay('currentMetrics', result.report.currentPeriod.metrics);
        updateMetricsDisplay('previousMetrics', result.report.previousPeriod.metrics);
        updateChangesGrid(result.report.changes);
        updateAiSummary(result.ai_analysis);

        if (loadingElement) loadingElement.style.display = 'none';
        if (resultsElement) resultsElement.style.display = 'block';
        if (exportButton) exportButton.style.display = 'inline-flex';
    } catch (error) {
        console.error('Comparison error:', error);
        if (loadingElement) loadingElement.style.display = 'none';
        showMessage(error.message || 'Error generating comparison', 'error');
    }
}

async function exportComparisonReport() {
    if (!lastComparisonReport || !lastComparisonAnalysis) {
        showMessage('Run a comparison before exporting the report', 'error');
        return;
    }

    if (typeof html2pdf === 'undefined') {
        showMessage('PDF export library is not loaded', 'error');
        return;
    }

    const existingReport = document.getElementById('comparisonExportReport');
    if (existingReport) {
        existingReport.remove();
    }

    const report = document.createElement('div');
    report.id = 'comparisonExportReport';
    report.style.position = 'fixed';
    report.style.left = '-9999px';
    report.style.top = '0';
    report.style.width = '900px';
    report.style.padding = '32px';
    report.style.background = '#ffffff';
    report.style.color = '#111827';
    report.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px; font-size: 28px;">DataXpert Comparison Report</h1>
            <p style="margin: 0; color: #6b7280;">${lastComparisonReport.currentPeriod.start} to ${lastComparisonReport.currentPeriod.end}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
            <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h3 style="margin-top: 0;">Current Period</h3>
                <p><strong>Sales:</strong> ${formatCurrency(lastComparisonReport.currentPeriod.metrics.totalSales)}</p>
                <p><strong>Expenses:</strong> ${formatCurrency(lastComparisonReport.currentPeriod.metrics.totalExpenses)}</p>
                <p><strong>Revenue:</strong> ${formatCurrency(lastComparisonReport.currentPeriod.metrics.totalRevenue)}</p>
                <p><strong>Profit:</strong> ${formatCurrency(lastComparisonReport.currentPeriod.metrics.totalProfit)}</p>
                <p><strong>Transactions:</strong> ${lastComparisonReport.currentPeriod.metrics.transactionCount}</p>
            </div>
            <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h3 style="margin-top: 0;">Previous Period</h3>
                <p><strong>Sales:</strong> ${formatCurrency(lastComparisonReport.previousPeriod.metrics.totalSales)}</p>
                <p><strong>Expenses:</strong> ${formatCurrency(lastComparisonReport.previousPeriod.metrics.totalExpenses)}</p>
                <p><strong>Revenue:</strong> ${formatCurrency(lastComparisonReport.previousPeriod.metrics.totalRevenue)}</p>
                <p><strong>Profit:</strong> ${formatCurrency(lastComparisonReport.previousPeriod.metrics.totalProfit)}</p>
                <p><strong>Transactions:</strong> ${lastComparisonReport.previousPeriod.metrics.transactionCount}</p>
            </div>
        </div>
        <div style="margin-bottom: 24px;">
            <h3>Changes</h3>
            <p>Sales: ${formatPercent(lastComparisonReport.changes.sales)}</p>
            <p>Expenses: ${formatPercent(lastComparisonReport.changes.expenses)}</p>
            <p>Revenue: ${formatPercent(lastComparisonReport.changes.revenue)}</p>
            <p>Profit: ${formatPercent(lastComparisonReport.changes.profit)}</p>
            <p>Transactions: ${formatPercent(lastComparisonReport.changes.transactions)}</p>
        </div>
        <div>
            <h3>AI Summary</h3>
            <p>${lastComparisonAnalysis.summary || ''}</p>
            <ul>
                ${(lastComparisonAnalysis.insights || []).map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    `;

    document.body.appendChild(report);

    try {
        await html2pdf().set({
            margin: 10,
            filename: `dataxpert-comparison-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(report).save();

        showMessage('Comparison report exported successfully!', 'success');
    } catch (error) {
        console.error('Comparison export error:', error);
        showMessage('Unable to export comparison report', 'error');
    } finally {
        report.remove();
    }
}

function openComparisonModal() {
    if (!document.getElementById('comparisonModal')) {
        createComparisonModal();
    }

    document.getElementById('comparisonModal').style.display = 'block';
    document.getElementById('comparisonResults').style.display = 'none';
    document.getElementById('comparisonLoading').style.display = 'none';
    document.getElementById('exportComparisonBtn').style.display = 'none';
    toggleComparisonCustomRange();
}

function closeComparisonModal() {
    const modal = document.getElementById('comparisonModal');
    if (modal) modal.style.display = 'none';
}
