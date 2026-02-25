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
    checkProfileCompletion();  // Check if profile needs completion
    loadDashboardData();
    setupEventListeners();
    setupExcelUploadHandlers();
    setupHistoryLink();
});

// Load user information
function loadUserInfo() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('userName').textContent = user.name || 'User';
        
        // Update user avatar
        const avatarImg = document.getElementById('userAvatar');
        const avatarFallback = document.getElementById('avatarFallback');
        if (avatarImg) {
            const profileUrl = user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=6366f1&color=fff&size=200`;
            avatarImg.src = profileUrl;
            avatarImg.style.display = 'block';
            if (avatarFallback) avatarFallback.style.display = 'none';
        }
    }
}

// Check if profile needs completion and show banner
function checkProfileCompletion() {
    const needsCompletion = localStorage.getItem('dataxpert_needs_profile_completion');
    const bannerDismissed = localStorage.getItem('dataxpert_profile_banner_dismissed');
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    
    if (userStr) {
        const user = JSON.parse(userStr);
        const banner = document.getElementById('profileCompletionBanner');
        
        // Show banner if:
        // 1. Flag is set OR user doesn't have business name
        // 2. Banner hasn't been dismissed
        if (banner && !bannerDismissed && (needsCompletion || !user.business_name)) {
            banner.style.display = 'block';
        }
    }
}

// Dismiss profile completion banner
function dismissProfileBanner() {
    const banner = document.getElementById('profileCompletionBanner');
    if (banner) {
        banner.style.display = 'none';
        // Remember dismissal for this session
        localStorage.setItem('dataxpert_profile_banner_dismissed', 'true');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Check for cached stats from login
        const cachedStats = localStorage.getItem('dataxpert_cached_stats');
        if (cachedStats) {
            const stats = JSON.parse(cachedStats);
            updateStats(stats);
            updateRecentData(stats.recent_data);
            localStorage.removeItem('dataxpert_cached_stats'); // Clear cache after use
        }

        // Load stats (will update with fresh data)
        const statsResponse = await fetch(API_ENDPOINTS.DASHBOARD_STATS, {
            headers: getAuthHeaders()
        });
        const statsData = await statsResponse.json();

        if (statsData.success) {
            updateStats(statsData.stats);
            updateRecentData(statsData.stats.recent_data);
        }

        // Load charts in parallel
        const chartsResponse = await fetch(API_ENDPOINTS.DASHBOARD_CHARTS, {
            headers: getAuthHeaders()
        });
        const chartsData = await chartsResponse.json();

        if (chartsData.success) {
            renderCharts(chartsData.charts);
        }

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

// Setup event listeners
function setupEventListeners() {
    // Add data button
    const addDataBtn = document.getElementById('addDataBtn');
    if (addDataBtn) {
        addDataBtn.addEventListener('click', () => openModal('addDataModal'));
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

// ==================== HISTORY LINK ====================

function setupHistoryLink() {
    const historyBtn = document.getElementById('historySidebarBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'history.html';
        });
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

// ==================== EXCEL/CSV UPLOAD ====================

// Upload state management
let uploadState = {
    currentStep: 1,
    selectedFile: null,
    fileData: null,  // Store file content in memory
    fileName: null,
    fileType: null,
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
            openClearDataModal();
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
        fileData: null,
        fileName: null,
        fileType: null,
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
    uploadState.fileName = file.name;
    uploadState.fileType = fileExtension;
    
    // Store file content in memory to avoid stream consumption issue
    try {
        const arrayBuffer = await file.arrayBuffer();
        uploadState.fileData = arrayBuffer;
    } catch (error) {
        console.error('Error reading file:', error);
        showMessage('Error reading file', 'error');
        return;
    }
    
    // Show file preview
    document.getElementById('filePreview').style.display = 'block';
    document.getElementById('selectedFileName').textContent = file.name;
    document.getElementById('nextStepBtn').style.display = 'inline-flex';
    
    // Analyze file using stored data
    await analyzeUploadedFile();
}

function clearSelectedFile() {
    uploadState.selectedFile = null;
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('nextStepBtn').style.display = 'none';
    document.getElementById('excelFileInput').value = '';
}

async function analyzeUploadedFile() {
    if (!uploadState.fileData) {
        console.error('No file data available');
        return;
    }
    
    try {
        // Create a new Blob from stored array buffer
        const blob = new Blob([uploadState.fileData]);
        const file = new File([blob], uploadState.fileName, { type: uploadState.selectedFile.type });
        
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
        } else {
            showMessage(result.message || 'Error analyzing file', 'error');
        }
    } catch (error) {
        console.error('Error analyzing file:', error);
        showMessage('Error analyzing file. Please try again.', 'error');
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
    if (!container) return;
    
    let html = '';
    
    if (!suggestions || suggestions.length === 0) {
        html = `
            <div class="no-suggestions">
                <i class="fas fa-chart-bar"></i>
                <p>Default charts will be generated based on your data.</p>
                <span class="hint">Charts will be created automatically after upload.</span>
            </div>
        `;
        container.innerHTML = html;
        return;
    }
    
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
    if (!uploadState.fileData) {
        showMessage('No file data available', 'error');
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
    
    // Create fresh file from stored data
    const blob = new Blob([uploadState.fileData]);
    const file = new File([blob], uploadState.fileName, { type: uploadState.selectedFile.type });
    
    // Build form data
    const formData = new FormData();
    formData.append('file', file);
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

// Show clear data modal with record count
async function openClearDataModal() {
    openModal('clearDataModal');
    
    // Load current data count
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success && data.stats) {
            const count = data.stats.data_count || 0;
            const summaryDiv = document.getElementById('clearSummary');
            if (summaryDiv) {
                summaryDiv.innerHTML = `
                    <div class="summary-info">
                        <i class="fas fa-database"></i>
                        <span>You have <strong>${count}</strong> data records that will be affected.</span>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading data count:', error);
    }
}

async function confirmClearData() {
    const clearType = document.querySelector('input[name="clearType"]:checked')?.value || 'backup';
    const createBackup = clearType === 'backup';
    
    try {
        const response = await fetch(`${API_BASE_URL}/business-data/clear`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                create_backup: createBackup,
                backup_days: 30
            })
        });

        const result = await response.json();

        if (result.success) {
            let message = `Successfully cleared ${result.deleted_count} records.`;
            if (result.backup) {
                message += ` Backup created (expires in 30 days).`;
            }
            showMessage(message, 'success');
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

// ==================== HISTORY MANAGEMENT ====================

let currentHistoryTab = 'all';

function setupHistoryHandlers() {
    const historyBtn = document.getElementById('historySidebarBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openHistoryModal();
        });
    }
}

async function openHistoryModal() {
    openModal('historyModal');
    await loadHistoryData('all');
}

async function showHistoryTab(tab) {
    currentHistoryTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.history-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    await loadHistoryData(tab);
}

async function loadHistoryData(tab) {
    const container = document.getElementById('historyContent');
    container.innerHTML = '<p class="loading-text">Loading history...</p>';
    
    try {
        let endpoint = '';
        switch (tab) {
            case 'uploads':
                endpoint = `${API_BASE_URL}/history/uploads`;
                break;
            case 'analysis':
                endpoint = `${API_BASE_URL}/history/analysis`;
                break;
            case 'backups':
                endpoint = `${API_BASE_URL}/history/backups`;
                break;
            default:
                endpoint = `${API_BASE_URL}/history/activity`;
        }
        
        const response = await fetch(endpoint, {
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderHistoryContent(tab, result);
        } else {
            container.innerHTML = '<p class="no-data">Error loading history</p>';
        }
    } catch (error) {
        console.error('Error loading history:', error);
        container.innerHTML = '<p class="no-data">Error loading history</p>';
    }
}

function renderHistoryContent(tab, result) {
    const container = document.getElementById('historyContent');
    
    switch (tab) {
        case 'uploads':
            renderUploadHistory(container, result.uploads || []);
            break;
        case 'analysis':
            renderAnalysisHistory(container, result.analyses || []);
            break;
        case 'backups':
            renderBackupsHistory(container, result.backups || []);
            break;
        default:
            renderActivityHistory(container, result.activities || []);
    }
}

function renderActivityHistory(container, activities) {
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="no-data">No activity recorded yet</p>';
        return;
    }
    
    const iconMap = {
        'upload': 'fa-upload',
        'clear': 'fa-trash',
        'delete': 'fa-trash-alt',
        'analysis': 'fa-chart-line',
        'restore': 'fa-undo',
        'login': 'fa-sign-in-alt',
        'export': 'fa-download'
    };
    
    container.innerHTML = `
        <div class="history-list">
            ${activities.map(activity => `
                <div class="history-item">
                    <div class="history-icon ${activity.action_type}">
                        <i class="fas ${iconMap[activity.action_type] || 'fa-circle'}"></i>
                    </div>
                    <div class="history-details">
                        <span class="history-action">${activity.action_description || activity.action_type}</span>
                        <span class="history-meta">
                            <i class="fas fa-clock"></i> ${formatDateTime(activity.created_at)}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderUploadHistory(container, uploads) {
    if (!uploads || uploads.length === 0) {
        container.innerHTML = '<p class="no-data">No uploads yet</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="history-list">
            ${uploads.map(upload => `
                <div class="history-item upload-item">
                    <div class="history-icon upload">
                        <i class="fas fa-file-excel"></i>
                    </div>
                    <div class="history-details">
                        <span class="history-filename">${upload.filename}</span>
                        <div class="history-stats">
                            <span><i class="fas fa-plus-circle"></i> ${upload.records_added} added</span>
                            ${upload.outliers_removed > 0 ? `<span><i class="fas fa-filter"></i> ${upload.outliers_removed} outliers</span>` : ''}
                            ${upload.missing_filled > 0 ? `<span><i class="fas fa-magic"></i> ${upload.missing_filled} filled</span>` : ''}
                        </div>
                        <span class="history-meta">
                            <i class="fas fa-clock"></i> ${formatDateTime(upload.created_at)}
                            <span class="status-badge ${upload.status}">${upload.status}</span>
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAnalysisHistory(container, analyses) {
    if (!analyses || analyses.length === 0) {
        container.innerHTML = '<p class="no-data">No analysis history yet</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="history-list">
            ${analyses.map(analysis => `
                <div class="history-item analysis-item">
                    <div class="history-icon analysis">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="history-details">
                        <span class="history-query">"${truncateText(analysis.query_text, 60)}"</span>
                        <span class="history-type">${analysis.analysis_type || 'General Analysis'}</span>
                        <span class="history-summary">${truncateText(analysis.result_summary, 100)}</span>
                        <span class="history-meta">
                            <i class="fas fa-clock"></i> ${formatDateTime(analysis.created_at)}
                        </span>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="viewAnalysisDetail(${analysis.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function renderBackupsHistory(container, backups) {
    if (!backups || backups.length === 0) {
        container.innerHTML = '<p class="no-data">No backups available</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="history-list">
            ${backups.map(backup => {
                const expiresDate = new Date(backup.expires_at);
                const isExpired = expiresDate < new Date();
                const daysLeft = Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60 * 24));
                
                return `
                    <div class="history-item backup-item ${isExpired ? 'expired' : ''} ${backup.restored ? 'restored' : ''}">
                        <div class="history-icon backup">
                            <i class="fas fa-archive"></i>
                        </div>
                        <div class="history-details">
                            <span class="backup-type">${backup.backup_type === 'pre_clear' ? 'Pre-Clear Backup' : 'Manual Backup'}</span>
                            <span class="backup-count"><strong>${backup.record_count}</strong> records</span>
                            <span class="history-meta">
                                <i class="fas fa-clock"></i> ${formatDateTime(backup.created_at)}
                                ${!isExpired && !backup.restored ? `<span class="expires-badge">Expires in ${daysLeft} days</span>` : ''}
                                ${backup.restored ? '<span class="restored-badge">Restored</span>' : ''}
                                ${isExpired ? '<span class="expired-badge">Expired</span>' : ''}
                            </span>
                        </div>
                        ${!isExpired && !backup.restored ? `
                            <button class="btn btn-sm btn-primary" onclick="restoreBackup(${backup.id})">
                                <i class="fas fa-undo"></i> Restore
                            </button>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function restoreBackup(backupId) {
    if (!confirm('Are you sure you want to restore this backup? This will add the backed up data to your current data.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/history/backups/${backupId}/restore`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            showMessage(`Successfully restored ${result.restored_count} records!`, 'success');
            loadHistoryData('backups');
            loadDashboardData();
        } else {
            showMessage(result.message || 'Failed to restore backup', 'error');
        }
    } catch (error) {
        console.error('Error restoring backup:', error);
        showMessage('Error restoring backup', 'error');
    }
}

function viewAnalysisDetail(analysisId) {
    showMessage('Analysis detail view coming soon!', 'info');
}

// Helper functions
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
