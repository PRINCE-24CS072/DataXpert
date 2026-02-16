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

// Upload state management
let uploadState = {
    currentStep: 1,
    selectedFile: null,
    fileAnalysis: null,
    graphSuggestions: []
};

function setupExcelUploadHandlers() {
    // Upload button click
    const uploadBtn = document.getElementById('uploadDataBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            resetUploadState();
            openModal('uploadDataModal');
        });
    }

    // Clear data button click
    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            openModal('clearDataModal');
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
                handleFileSelection(files[0]);
            }
        });
    }

    // Toggle option checkbox listeners
    const removeOutliersCheckbox = document.getElementById('removeOutliers');
    if (removeOutliersCheckbox) {
        removeOutliersCheckbox.addEventListener('change', (e) => {
            document.getElementById('outlierOptions').style.display = e.target.checked ? 'flex' : 'none';
        });
    }

    const fillMissingCheckbox = document.getElementById('fillMissing');
    if (fillMissingCheckbox) {
        fillMissingCheckbox.addEventListener('change', (e) => {
            document.getElementById('fillOptions').style.display = e.target.checked ? 'flex' : 'none';
        });
    }
}

function resetUploadState() {
    uploadState = {
        currentStep: 1,
        selectedFile: null,
        fileAnalysis: null,
        graphSuggestions: []
    };
    
    // Reset UI
    document.getElementById('uploadStep1').style.display = 'block';
    document.getElementById('uploadStep2').style.display = 'none';
    document.getElementById('uploadStep3').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('backStepBtn').style.display = 'none';
    document.getElementById('nextStepBtn').style.display = 'none';
    document.getElementById('processUploadBtn').style.display = 'none';
    
    // Clear file input
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) fileInput.value = '';
}

async function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        await handleFileSelection(file);
    }
}

async function handleFileSelection(file) {
    // Validate file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['xlsx', 'xls', 'csv'];

    if (!validExtensions.includes(fileExtension)) {
        showMessage('Please select a valid Excel or CSV file', 'error');
        return;
    }

    uploadState.selectedFile = file;
    
    // Show file preview
    document.getElementById('filePreview').style.display = 'block';
    document.getElementById('selectedFileName').textContent = file.name;
    document.getElementById('nextStepBtn').style.display = 'inline-flex';
    
    // Analyze file
    await analyzeUploadedFile(file);
}

function clearSelectedFile() {
    uploadState.selectedFile = null;
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('nextStepBtn').style.display = 'none';
    document.getElementById('excelFileInput').value = '';
}

async function analyzeUploadedFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/business-data/analyze-file`, {
            method: 'POST',
            headers: getAuthHeadersForFormData(),
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            uploadState.fileAnalysis = result.analysis;
            uploadState.graphSuggestions = result.graph_suggestions;
            
            // Update analysis preview
            updateAnalysisPreview(result.analysis, result.preview);
            
            // Update graph options
            updateGraphOptions(result.graph_suggestions);
        }
    } catch (error) {
        console.error('Error analyzing file:', error);
    }
}

function updateAnalysisPreview(analysis, preview) {
    const container = document.getElementById('dataAnalysisPreview');
    if (!container) return;
    
    let html = `
        <div class="analysis-summary">
            <div class="summary-item">
                <i class="fas fa-table"></i>
                <span><strong>${analysis.total_rows}</strong> rows</span>
            </div>
            <div class="summary-item">
                <i class="fas fa-columns"></i>
                <span><strong>${analysis.total_columns}</strong> columns</span>
            </div>
    `;
    
    // Show missing values if any
    const missingCount = Object.keys(analysis.missing_values).length;
    if (missingCount > 0) {
        html += `
            <div class="summary-item warning">
                <i class="fas fa-exclamation-circle"></i>
                <span><strong>${missingCount}</strong> columns with missing data</span>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // Show recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
        html += `
            <div class="recommendations">
                <h4><i class="fas fa-lightbulb"></i> AI Recommendations</h4>
                <ul>
                    ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Show data preview
    if (preview && preview.length > 0) {
        html += `
            <div class="data-preview">
                <h4><i class="fas fa-eye"></i> Data Preview (first 5 rows)</h4>
                <div class="preview-table-wrapper">
                    <table class="preview-table">
                        <thead>
                            <tr>${Object.keys(preview[0]).map(key => `<th>${key}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${preview.map(row => `<tr>${Object.values(row).map(val => `<td>${val !== null ? val : '-'}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function updateGraphOptions(suggestions) {
    const container = document.getElementById('graphOptions');
    if (!container || !suggestions) return;
    
    let html = '';
    
    suggestions.forEach((suggestion, index) => {
        const iconMap = {
            'line': 'fa-chart-line',
            'bar': 'fa-chart-bar',
            'pie': 'fa-chart-pie',
            'doughnut': 'fa-chart-pie',
            'area': 'fa-chart-area',
            'scatter': 'fa-braille',
            'radar': 'fa-spider'
        };
        
        html += `
            <label class="graph-option ${suggestion.recommended ? 'recommended' : ''}">
                <input type="checkbox" name="selectedGraphs" value="${index}" ${suggestion.recommended ? 'checked' : ''}>
                <div class="graph-option-content">
                    <i class="fas ${iconMap[suggestion.type] || 'fa-chart-bar'}"></i>
                    <div class="graph-details">
                        <span class="graph-title">${suggestion.title}</span>
                        <span class="graph-description">${suggestion.description}</span>
                    </div>
                    ${suggestion.recommended ? '<span class="recommended-badge">Recommended</span>' : ''}
                </div>
            </label>
        `;
    });
    
    container.innerHTML = html;
}

function nextUploadStep() {
    if (uploadState.currentStep === 1 && !uploadState.selectedFile) {
        showMessage('Please select a file first', 'error');
        return;
    }
    
    uploadState.currentStep++;
    updateUploadStepUI();
}

function previousUploadStep() {
    if (uploadState.currentStep > 1) {
        uploadState.currentStep--;
        updateUploadStepUI();
    }
}

function updateUploadStepUI() {
    // Hide all steps
    document.getElementById('uploadStep1').style.display = 'none';
    document.getElementById('uploadStep2').style.display = 'none';
    document.getElementById('uploadStep3').style.display = 'none';
    
    // Show current step
    document.getElementById(`uploadStep${uploadState.currentStep}`).style.display = 'block';
    
    // Update buttons
    document.getElementById('backStepBtn').style.display = uploadState.currentStep > 1 ? 'inline-flex' : 'none';
    document.getElementById('nextStepBtn').style.display = uploadState.currentStep < 3 ? 'inline-flex' : 'none';
    document.getElementById('processUploadBtn').style.display = uploadState.currentStep === 3 ? 'inline-flex' : 'none';
}

async function processAndUploadData() {
    if (!uploadState.selectedFile) {
        showMessage('No file selected', 'error');
        return;
    }
    
    // Show progress
    document.getElementById('uploadStep3').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('backStepBtn').style.display = 'none';
    document.getElementById('processUploadBtn').style.display = 'none';
    
    const progressFill = document.getElementById('progressFill');
    const uploadStatus = document.getElementById('uploadStatus');
    const processingSteps = document.getElementById('processingSteps');
    
    // Get processing options
    const removeOutliers = document.getElementById('removeOutliers').checked;
    const fillMissing = document.getElementById('fillMissing').checked;
    const outlierMethod = document.getElementById('outlierMethod').value;
    const fillMethod = document.getElementById('fillMethod').value;
    
    // Build form data
    const formData = new FormData();
    formData.append('file', uploadState.selectedFile);
    formData.append('remove_outliers', removeOutliers);
    formData.append('fill_missing', fillMissing);
    formData.append('outlier_method', outlierMethod);
    formData.append('fill_method', fillMethod);
    
    // Simulate progress steps
    const steps = [
        'Scanning file...',
        'Auto-detecting column types...',
        'Cleaning data...',
        fillMissing ? 'Filling missing values...' : null,
        removeOutliers ? 'Removing outliers...' : null,
        'Calculating derived values...',
        'Uploading to database...'
    ].filter(Boolean);
    
    let currentStepIndex = 0;
    
    const updateProgress = () => {
        if (currentStepIndex < steps.length) {
            const progress = ((currentStepIndex + 1) / steps.length) * 80;
            progressFill.style.width = progress + '%';
            uploadStatus.textContent = steps[currentStepIndex];
            processingSteps.innerHTML = steps.slice(0, currentStepIndex + 1)
                .map((step, i) => `<div class="step-item ${i < currentStepIndex ? 'completed' : i === currentStepIndex ? 'active' : ''}">
                    <i class="fas ${i < currentStepIndex ? 'fa-check-circle' : i === currentStepIndex ? 'fa-spinner fa-spin' : 'fa-circle'}"></i>
                    ${step}
                </div>`).join('');
            currentStepIndex++;
        }
    };
    
    // Start progress animation
    updateProgress();
    const progressInterval = setInterval(updateProgress, 800);
    
    try {
        const response = await fetch(`${API_BASE_URL}/business-data/upload-smart`, {
            method: 'POST',
            headers: getAuthHeadersForFormData(),
            body: formData
        });
        
        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        
        const result = await response.json();
        
        if (result.success) {
            uploadStatus.textContent = 'Upload complete!';
            processingSteps.innerHTML = `
                <div class="success-summary">
                    <i class="fas fa-check-circle"></i>
                    <div class="summary-details">
                        <p><strong>${result.records_added}</strong> records added successfully</p>
                        ${result.outliers_removed > 0 ? `<p><i class="fas fa-filter"></i> ${result.outliers_removed} outliers removed</p>` : ''}
                        ${result.missing_filled > 0 ? `<p><i class="fas fa-magic"></i> ${result.missing_filled} missing values filled</p>` : ''}
                    </div>
                </div>
            `;
            
            showMessage(`Successfully processed and uploaded ${result.records_added} records!`, 'success');
            
            setTimeout(() => {
                closeModal('uploadDataModal');
                resetUploadState();
                loadDashboardData();
            }, 2500);
        } else {
            uploadStatus.textContent = 'Upload failed';
            processingSteps.innerHTML = `
                <div class="error-summary">
                    <i class="fas fa-times-circle"></i>
                    <p>${result.message || 'An error occurred during processing'}</p>
                </div>
            `;
            showMessage(result.message || 'Failed to upload file', 'error');
        }
    } catch (error) {
        clearInterval(progressInterval);
        console.error('Error uploading file:', error);
        uploadStatus.textContent = 'Upload error';
        processingSteps.innerHTML = `
            <div class="error-summary">
                <i class="fas fa-times-circle"></i>
                <p>Network error. Please try again.</p>
            </div>
        `;
        showMessage('Error uploading file', 'error');
    }
}

// Legacy upload function for backwards compatibility
async function handleExcelFileUpload(file) {
    await handleFileSelection(file);
}

// ==================== CLEAR DATA ====================

async function confirmClearData() {
    try {
        const response = await fetch(`${API_BASE_URL}/business-data/clear`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            showMessage(`Successfully cleared ${result.deleted_count} records`, 'success');
            closeModal('clearDataModal');
            loadDashboardData();
        } else {
            showMessage(result.message || 'Failed to clear data', 'error');
        }
    } catch (error) {
        console.error('Error clearing data:', error);
        showMessage('Error clearing data', 'error');
    }
}

// ==================== CUSTOM CHART GENERATION ====================

let customChartInstance = null;

async function previewCustomChart() {
    const chartType = document.getElementById('chartTypeSelect').value;
    const yFieldCheckboxes = document.querySelectorAll('input[name="yFields"]:checked');
    const yFields = Array.from(yFieldCheckboxes).map(cb => cb.value);
    const groupBy = document.getElementById('groupBySelect').value || null;
    
    if (yFields.length === 0) {
        showMessage('Please select at least one metric to display', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/business-data/generate-chart`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                chart_type: chartType,
                x_field: 'record_date',
                y_fields: yFields,
                group_by: groupBy
            })
        });

        const result = await response.json();

        if (result.success) {
            renderCustomChartPreview(result.chart_data, chartType);
        } else {
            showMessage(result.message || 'Failed to generate chart', 'error');
        }
    } catch (error) {
        console.error('Error generating chart:', error);
        showMessage('Error generating chart', 'error');
    }
}

function renderCustomChartPreview(chartData, chartType) {
    const canvas = document.getElementById('customChartPreview');
    const ctx = canvas.getContext('2d');
    
    if (customChartInstance) {
        customChartInstance.destroy();
    }
    
    customChartInstance = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: chartType === 'pie' || chartType === 'doughnut' ? 'bottom' : 'top'
                }
            },
            scales: chartType !== 'pie' && chartType !== 'doughnut' && chartType !== 'radar' ? {
                y: { beginAtZero: true }
            } : undefined
        }
    });
}

function saveCustomChart() {
    showMessage('Custom chart saved to dashboard!', 'success');
    closeModal('customChartModal');
}

// Helper function for FormData auth headers
function getAuthHeadersForFormData() {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData - browser will set it with boundary
    };
}
