// Comparison Analysis Module
// Compare data between different time periods

// Time period presets
const COMPARISON_PERIODS = {
    'week': { label: 'This Week vs Last Week', days: 7 },
    'month': { label: 'This Month vs Last Month', days: 30 },
    'quarter': { label: 'This Quarter vs Last Quarter', days: 90 },
    'year': { label: 'This Year vs Last Year', days: 365 },
    'custom': { label: 'Custom Range', days: null }
};

// Calculate date range
function getDateRange(periodDays, isComparison = false) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - periodDays);
    
    if (isComparison) {
        // Get the previous period
        const compEnd = new Date(start);
        const compStart = new Date(start);
        compStart.setDate(compStart.getDate() - periodDays);
        return { start: compStart, end: compEnd };
    }
    
    return { start, end };
}

// Fetch data for a period
async function fetchPeriodData(startDate, endDate) {
    const response = await fetch(`${API_ENDPOINTS.BUSINESS_DATA}?from_date=${startDate.toISOString().split('T')[0]}&to_date=${endDate.toISOString().split('T')[0]}`, {
        headers: getAuthHeaders()
    });
    
    const result = await response.json();
    return result.success ? result.data : [];
}

// Calculate metrics from data
function calculateMetrics(data) {
    return {
        totalSales: data.filter(d => d.type === 'sale').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
        totalExpenses: data.filter(d => d.type === 'expense').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
        totalRevenue: data.filter(d => d.type === 'revenue').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
        transactionCount: data.length,
        averageTransaction: data.length > 0 ? data.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) / data.length : 0
    };
}

// Calculate percentage change
function calculateChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
}

// Generate comparison report
async function generateComparisonReport(periodType) {
    const period = COMPARISON_PERIODS[periodType];
    if (!period || !period.days) return null;
    
    // Current period
    const currentRange = getDateRange(period.days, false);
    const currentData = await fetchPeriodData(currentRange.start, currentRange.end);
    const currentMetrics = calculateMetrics(currentData);
    
    // Previous period
    const previousRange = getDateRange(period.days, true);
    const previousData = await fetchPeriodData(previousRange.start, previousRange.end);
    const previousMetrics = calculateMetrics(previousData);
    
    // Calculate changes
    const comparison = {
        period: period.label,
        currentPeriod: {
            start: currentRange.start.toLocaleDateString(),
            end: currentRange.end.toLocaleDateString(),
            metrics: currentMetrics
        },
        previousPeriod: {
            start: previousRange.start.toLocaleDateString(),
            end: previousRange.end.toLocaleDateString(),
            metrics: previousMetrics
        },
        changes: {
            sales: calculateChange(currentMetrics.totalSales, previousMetrics.totalSales),
            expenses: calculateChange(currentMetrics.totalExpenses, previousMetrics.totalExpenses),
            revenue: calculateChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
            transactions: calculateChange(currentMetrics.transactionCount, previousMetrics.transactionCount)
        }
    };
    
    return comparison;
}

// Create comparison modal
function createComparisonModal() {
    const modal = document.createElement('div');
    modal.id = 'comparisonModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close" onclick="closeComparisonModal()">&times;</span>
            <h2><i class="fas fa-balance-scale"></i> Period Comparison</h2>
            <p>Compare your business metrics across different time periods</p>
            
            <div class="comparison-controls" style="display: flex; gap: 15px; margin: 20px 0;">
                <select id="comparisonPeriod" class="form-control" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <option value="week">This Week vs Last Week</option>
                    <option value="month" selected>This Month vs Last Month</option>
                    <option value="quarter">This Quarter vs Last Quarter</option>
                    <option value="year">This Year vs Last Year</option>
                </select>
                <button class="btn btn-primary" onclick="runComparison()">
                    <i class="fas fa-sync"></i> Compare
                </button>
            </div>
            
            <div id="comparisonResults" style="display: none;">
                <div class="comparison-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                    <!-- Current Period -->
                    <div class="comparison-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                        <h4 style="color: var(--primary-color); margin-bottom: 15px;">
                            <i class="fas fa-calendar-day"></i> Current Period
                        </h4>
                        <p id="currentPeriodRange" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px;"></p>
                        <div id="currentMetrics"></div>
                    </div>
                    
                    <!-- Previous Period -->
                    <div class="comparison-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                        <h4 style="color: var(--text-secondary); margin-bottom: 15px;">
                            <i class="fas fa-calendar-alt"></i> Previous Period
                        </h4>
                        <p id="previousPeriodRange" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px;"></p>
                        <div id="previousMetrics"></div>
                    </div>
                </div>
                
                <!-- Changes Summary -->
                <div class="changes-summary" style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--card-bg) 100%); border-radius: 12px;">
                    <h4 style="margin-bottom: 20px;"><i class="fas fa-chart-line"></i> Changes</h4>
                    <div id="changesGrid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;"></div>
                </div>
            </div>
            
            <div id="comparisonLoading" style="display: none; text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary-color);"></i>
                <p style="margin-top: 15px; color: var(--text-secondary);">Analyzing data...</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Run comparison
async function runComparison() {
    const periodSelect = document.getElementById('comparisonPeriod');
    const periodType = periodSelect.value;
    
    document.getElementById('comparisonResults').style.display = 'none';
    document.getElementById('comparisonLoading').style.display = 'block';
    
    try {
        const report = await generateComparisonReport(periodType);
        
        if (!report) {
            showMessage('Unable to generate comparison', 'error');
            return;
        }
        
        // Update period ranges
        document.getElementById('currentPeriodRange').textContent = 
            `${report.currentPeriod.start} - ${report.currentPeriod.end}`;
        document.getElementById('previousPeriodRange').textContent = 
            `${report.previousPeriod.start} - ${report.previousPeriod.end}`;
        
        // Update metrics displays
        updateMetricsDisplay('currentMetrics', report.currentPeriod.metrics);
        updateMetricsDisplay('previousMetrics', report.previousPeriod.metrics);
        
        // Update changes grid
        updateChangesGrid(report.changes);
        
        document.getElementById('comparisonLoading').style.display = 'none';
        document.getElementById('comparisonResults').style.display = 'block';
        
    } catch (error) {
        console.error('Comparison error:', error);
        showMessage('Error generating comparison', 'error');
        document.getElementById('comparisonLoading').style.display = 'none';
    }
}

// Update metrics display
function updateMetricsDisplay(elementId, metrics) {
    const container = document.getElementById(elementId);
    container.innerHTML = `
        <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <span>Total Sales</span>
                <strong>₹${metrics.totalSales.toLocaleString()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <span>Total Expenses</span>
                <strong>₹${metrics.totalExpenses.toLocaleString()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <span>Total Revenue</span>
                <strong>₹${metrics.totalRevenue.toLocaleString()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Transactions</span>
                <strong>${metrics.transactionCount}</strong>
            </div>
        </div>
    `;
}

// Update changes grid
function updateChangesGrid(changes) {
    const container = document.getElementById('changesGrid');
    
    const createChangeCard = (label, value, icon) => {
        const isPositive = parseFloat(value) >= 0;
        const color = isPositive ? '#10b981' : '#ef4444';
        const arrow = isPositive ? '↑' : '↓';
        
        return `
            <div style="text-align: center; padding: 15px; background: var(--card-bg); border-radius: 8px;">
                <i class="${icon}" style="font-size: 24px; color: var(--primary-color); margin-bottom: 10px;"></i>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">${label}</div>
                <div style="font-size: 18px; font-weight: 700; color: ${color};">
                    ${arrow} ${Math.abs(value)}%
                </div>
            </div>
        `;
    };
    
    container.innerHTML = `
        ${createChangeCard('Sales', changes.sales, 'fas fa-rupee-sign')}
        ${createChangeCard('Expenses', changes.expenses, 'fas fa-wallet')}
        ${createChangeCard('Revenue', changes.revenue, 'fas fa-chart-line')}
        ${createChangeCard('Transactions', changes.transactions, 'fas fa-exchange-alt')}
    `;
}

// Open comparison modal
function openComparisonModal() {
    if (!document.getElementById('comparisonModal')) {
        createComparisonModal();
    }
    document.getElementById('comparisonModal').style.display = 'block';
    document.getElementById('comparisonResults').style.display = 'none';
    document.getElementById('comparisonLoading').style.display = 'none';
}

// Close comparison modal
function closeComparisonModal() {
    const modal = document.getElementById('comparisonModal');
    if (modal) modal.style.display = 'none';
}
