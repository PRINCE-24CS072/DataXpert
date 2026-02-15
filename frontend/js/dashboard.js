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
    setupProfileHandlers();
    setupTeamsHandlers();
    setupExcelUploadHandlers();
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

// ==================== PROFILE MANAGEMENT ====================

function setupProfileHandlers() {
    // Profile button click
    const profileBtn = document.getElementById('profileSidebarBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadProfileData();
            openModal('profileModal');
        });
    }

    // Profile image upload
    const profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput) {
        profileImageInput.addEventListener('change', handleProfileImageUpload);
    }

    // Update profile form
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', handleUpdateProfile);
   }

    // Change password form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
}

async function loadProfileData() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return;

    const user = JSON.parse(userStr);
    
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profileBusinessName').value = user.business_name || '';
    
    const profileImage = document.getElementById('profileImagePreview');
    if (profileImage) {
        profileImage.src = user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&size=200`;
    }
}

async function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image size must be less than 5MB', 'error');
        return;
    }

    try {
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profileImagePreview').src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload to server
        const formData = new FormData();
        formData.append('profile_image', file);

        const response = await fetch(`${API_BASE_URL}/users/upload-profile-image`, {
            method: 'POST',
            headers: getAuthHeadersForFormData(),
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // Update local storage
            const userStr = localStorage.getItem(STORAGE_KEYS.USER);
            if (userStr) {
                const user = JSON.parse(userStr);
                user.profile_image = result.profile_image;
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            }
            showMessage('Profile image updated successfully!', 'success');
        } else {
            showMessage(result.message || 'Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showMessage('Error uploading image', 'error');
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();

    const name = document.getElementById('profileName').value;
    const businessName = document.getElementById('profileBusinessName').value;

    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name,
                business_name: businessName
            })
        });

        const result = await response.json();

        if (result.success) {
            // Update local storage
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
            showMessage('Profile updated successfully!', 'success');
            loadUserInfo();
        } else {
            showMessage(result.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile', 'error');
    }
}

async function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/change-password`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showMessage(result.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showMessage('Error changing password', 'error');
    }
}

// ==================== TEAMS MANAGEMENT ====================

function setupTeamsHandlers() {
    // Teams button click
    const teamsBtn = document.getElementById('teamsSidebarBtn');
    if (teamsBtn) {
        teamsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadTeamsModal();
            openModal('teamsModal');
        });
    }
}

async function loadTeamsModal() {
    const container = document.getElementById('teamsListContainer');
    container.innerHTML = '<p class="loading-text">Loading teams...</p>';

    try {
        const response = await fetch(API_ENDPOINTS.TEAMS, {
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success && result.teams) {
            if (result.teams.length === 0) {
                container.innerHTML = '<p class="no-data">No teams yet. Create your first team!</p>';
            } else {
                container.innerHTML = result.teams.map(team => `
                    <div class="team-item">
                        <div class="team-info">
                            <h3>${team.team_name}</h3>
                            <p>Created: ${formatDate(team.created_at)}</p>
                            <p>Members: ${team.member_count || 0}</p>
                        </div>
                        <div class="team-actions">
                            <button class="btn btn-primary btn-sm" onclick="viewTeamDetails(${team.id})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${team.owner_id ? `<button class="btn btn-secondary btn-sm" onclick="manageTeam(${team.id})">
                                <i class="fas fa-cog"></i> Manage
                            </button>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        } else {
            container.innerHTML = '<p class="no-data">Error loading teams</p>';
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        container.innerHTML = '<p class="no-data">Error loading teams</p>';
    }
}

async function viewTeamDetails(teamId) {
    showMessage('Team details feature coming soon!', 'info');
}

async function manageTeam(teamId) {
    showMessage('Team management feature coming soon!', 'info');
}

// ==================== EXCEL/CSV UPLOAD ====================

function setupExcelUploadHandlers() {
    // Upload button click
    const uploadBtn = document.getElementById('uploadDataBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            openModal('uploadDataModal');
        });
    }

    // File input change
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleExcelFileSelect);
    }

    // Drag and drop
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleExcelFileUpload(files[0]);
            }
        });
    }
}

async function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        await handleExcelFileUpload(file);
    }
}

async function handleExcelFileUpload(file) {
    // Validate file type
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ];
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['xlsx', 'xls', 'csv'];

    if (!validExtensions.includes(fileExtension)) {
        showMessage('Please select a valid Excel or CSV file', 'error');
        return;
    }

    // Show progress
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const uploadStatus = document.getElementById('uploadStatus');
    
    progressDiv.style.display = 'block';
    progressFill.style.width = '0%';
    uploadStatus.textContent = 'Uploading...';

    try {
        const formData = new FormData();
        formData.append('file', file);

        // Simulate progress (since we can't get real progress from fetch)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                progressFill.style.width = progress + '%';
            }
        }, 200);

        const response = await fetch(`${API_BASE_URL}/business-data/upload`, {
            method: 'POST',
            headers: getAuthHeadersForFormData(),
            body: formData
        });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        const result = await response.json();

        if (result.success) {
            uploadStatus.textContent = `Success! ${result.records_added || 0} records added.`;
            showMessage(`Successfully uploaded ${result.records_added} records!`, 'success');
            
            setTimeout(() => {
                closeModal('uploadDataModal');
                progressDiv.style.display = 'none';
                document.getElementById('excelFileInput').value = '';
                loadDashboardData(); // Reload dashboard
            }, 2000);
        } else {
            uploadStatus.textContent = 'Upload failed';
            showMessage(result.message || 'Failed to upload file', 'error');
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        uploadStatus.textContent = 'Upload error';
        showMessage('Error uploading file', 'error');
        setTimeout(() => {
            progressDiv.style.display = 'none';
        }, 3000);
    }
}

// Helper function for FormData auth headers
function getAuthHeadersForFormData() {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData - browser will set it with boundary
    };
}
