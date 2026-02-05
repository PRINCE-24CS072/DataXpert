// Dashboard JavaScript

let charts = {
    sales: null,
    profitExpense: null,
    category: null
};

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
    loadDashboardData();
    setupEventListeners();
});

// Load user information
function loadUserInfo() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('userName').textContent = user.name || 'User';
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch(API_ENDPOINTS.DASHBOARD_STATS, {
            headers: getAuthHeaders()
        });
        const statsData = await statsResponse.json();

        if (statsData.success) {
            updateStats(statsData.stats);
            updateRecentData(statsData.stats.recent_data);
        }

        // Load charts
        const chartsResponse = await fetch(API_ENDPOINTS.DASHBOARD_CHARTS, {
            headers: getAuthHeaders()
        });
        const chartsData = await chartsResponse.json();

        if (chartsData.success) {
            renderCharts(chartsData.charts);
        }

        // Load teams
        await loadTeams();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showMessage('Error loading dashboard data', 'error');
    }
}

// Update stats
function updateStats(stats) {
    document.getElementById('totalSales').textContent = `$${formatNumber(stats.total_sales || 0)}`;
    document.getElementById('totalProfit').textContent = `$${formatNumber(stats.total_profit || 0)}`;
    document.getElementById('totalExpenses').textContent = `$${formatNumber(stats.total_expenses || 0)}`;
    document.getElementById('dataCount').textContent = stats.data_count || 0;
}

// Update recent data
function updateRecentData(recentData) {
    const container = document.getElementById('recentData');
    
    if (!recentData || recentData.length === 0) {
        container.innerHTML = '<p class="no-data">No recent activity</p>';
        return;
    }

    container.innerHTML = recentData.map(item => `
        <div class="data-item">
            <div class="data-info">
                <span class="data-category">${item.category || 'General'}</span>
                <span class="data-date">${formatDate(item.record_date)}</span>
            </div>
            <div class="data-values">
                <span class="data-sales">Sales: $${formatNumber(item.sales)}</span>
                <span class="data-profit ${item.profit >= 0 ? 'positive' : 'negative'}">
                    Profit: $${formatNumber(item.profit)}
                </span>
            </div>
        </div>
    `).join('');
}

// Render charts
function renderCharts(chartsData) {
    // Sales Chart
    if (chartsData.sales && chartsData.sales.labels.length > 0) {
        const salesCtx = document.getElementById('salesChart').getContext('2d');
        if (charts.sales) charts.sales.destroy();
        
        charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: chartsData.sales,
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

    // Profit vs Expense Chart
    if (chartsData.profitExpense && chartsData.profitExpense.labels.length > 0) {
        const profitExpenseCtx = document.getElementById('profitExpenseChart').getContext('2d');
        if (charts.profitExpense) charts.profitExpense.destroy();
        
        charts.profitExpense = new Chart(profitExpenseCtx, {
            type: 'bar',
            data: chartsData.profitExpense,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // Category Chart
    if (chartsData.category && chartsData.category.labels && chartsData.category.labels.length > 0) {
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        if (charts.category) charts.category.destroy();
        
        charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: chartsData.category,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'bottom' }
                }
            }
        });
    }
}

// Load teams
async function loadTeams() {
    try {
        const response = await fetch(API_ENDPOINTS.TEAMS, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            renderTeams(data.teams);
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Render teams
function renderTeams(teams) {
    const container = document.getElementById('teamsGrid');
    
    if (!teams || teams.length === 0) {
        container.innerHTML = '<p class="no-data">No teams yet. Create your first team!</p>';
        return;
    }

    container.innerHTML = teams.map(team => `
        <div class="team-card">
            <div class="team-icon">
                <i class="fas fa-users"></i>
            </div>
            <h4>${team.team_name}</h4>
            <p>Created: ${formatDate(team.created_at)}</p>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Add data button
    const addDataBtn = document.getElementById('addDataBtn');
    if (addDataBtn) {
        addDataBtn.addEventListener('click', () => openModal('addDataModal'));
    }

    // Create team button
    const createTeamBtn = document.getElementById('createTeamBtn');
    if (createTeamBtn) {
        createTeamBtn.addEventListener('click', () => openModal('createTeamModal'));
    }

    // Add data form
    const addDataForm = document.getElementById('addDataForm');
    if (addDataForm) {
        addDataForm.addEventListener('submit', handleAddData);
        
        // Auto-calculate profit
        const salesInput = document.getElementById('sales');
        const expensesInput = document.getElementById('expenses');
        const profitInput = document.getElementById('profit');
        
        function calculateProfit() {
            const sales = parseFloat(salesInput.value) || 0;
            const expenses = parseFloat(expensesInput.value) || 0;
            profitInput.value = (sales - expenses).toFixed(2);
        }
        
        salesInput.addEventListener('input', calculateProfit);
        expensesInput.addEventListener('input', calculateProfit);
    }

    // Create team form
    const createTeamForm = document.getElementById('createTeamForm');
    if (createTeamForm) {
        createTeamForm.addEventListener('submit', handleCreateTeam);
    }

    // Close buttons
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            closeModal(modalId);
        });
    });

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

// Handle add data
async function handleAddData(event) {
    event.preventDefault();
    
    const data = {
        record_date: document.getElementById('recordDate').value,
        category: document.getElementById('category').value,
        sales: parseFloat(document.getElementById('sales').value),
        expenses: parseFloat(document.getElementById('expenses').value),
        profit: parseFloat(document.getElementById('profit').value)
    };

    try {
        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Data added successfully!', 'success');
            closeModal('addDataModal');
            document.getElementById('addDataForm').reset();
            loadDashboardData(); // Reload dashboard
        } else {
            showMessage(result.message || 'Failed to add data', 'error');
        }
    } catch (error) {
        console.error('Error adding data:', error);
        showMessage('Error adding data', 'error');
    }
}

// Handle create team
async function handleCreateTeam(event) {
    event.preventDefault();
    
    const teamName = document.getElementById('teamName').value;

    try {
        const response = await fetch(API_ENDPOINTS.TEAMS, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ team_name: teamName })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Team created successfully!', 'success');
            closeModal('createTeamModal');
            document.getElementById('createTeamForm').reset();
            loadTeams(); // Reload teams
        } else {
            showMessage(result.message || 'Failed to create team', 'error');
        }
    } catch (error) {
        console.error('Error creating team:', error);
        showMessage('Error creating team', 'error');
    }
}

// Utility functions
function formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
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
