// Data Import/Export Module

// =====================
// CSV/Excel Import
// =====================

// Parse CSV file
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        data.push(row);
    }
    
    return { headers, data };
}

// Import CSV file
async function importCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const result = parseCSV(e.target.result);
                resolve(result);
            } catch (error) {
                reject(new Error('Failed to parse CSV file'));
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Import Excel file (using SheetJS library)
async function importExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                if (typeof XLSX === 'undefined') {
                    reject(new Error('Excel library not loaded. Please add SheetJS to your page.'));
                    return;
                }
                
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                const headers = jsonData[0];
                const rows = jsonData.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header] = row[i] || '';
                    });
                    return obj;
                });
                
                resolve({ headers, data: rows });
            } catch (error) {
                reject(new Error('Failed to parse Excel file'));
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Generic file import handler
async function importFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (extension === 'csv') {
        return await importCSV(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
        return await importExcel(file);
    } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
    }
}

// Upload imported data to server
async function uploadImportedData(data, dataType = 'business') {
    try {
        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA_UPLOAD, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                data: data,
                type: dataType
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw new Error('Failed to upload data to server');
    }
}

// =====================
// Export Functions
// =====================

// Export to CSV
function exportToCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
        throw new Error('No data to export');
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') ? `"${escaped}"` : escaped;
        });
        csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    downloadFile(csvContent, filename, 'text/csv');
}

// Export to Excel
function exportToExcel(data, filename = 'export.xlsx') {
    if (typeof XLSX === 'undefined') {
        throw new Error('Excel library not loaded. Please add SheetJS to your page.');
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, filename);
}

// Export to PDF
async function exportToPDF(elementId, filename = 'report.pdf') {
    if (typeof html2pdf === 'undefined') {
        throw new Error('PDF library not loaded. Please add html2pdf.js to your page.');
    }
    
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error('Element not found');
    }
    
    const options = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(options).from(element).save();
}

// Export chart as image
function exportChartAsImage(chartId, filename = 'chart.png') {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        throw new Error('Chart not found');
    }
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Helper function to download file
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// =====================
// UI Components
// =====================

// Create import modal
function createImportModal() {
    const modal = document.createElement('div');
    modal.id = 'importModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="closeImportModal()">&times;</span>
            <h2><i class="fas fa-file-import"></i> Import Data</h2>
            <p>Upload a CSV or Excel file to import your business data</p>
            
            <div class="import-dropzone" id="importDropzone" onclick="document.getElementById('importFileInput').click()">
                <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--primary-color); margin-bottom: 15px;"></i>
                <p>Drag & drop your file here or click to browse</p>
                <p style="font-size: 12px; color: var(--text-secondary);">Supported formats: CSV, XLSX, XLS</p>
                <input type="file" id="importFileInput" accept=".csv,.xlsx,.xls" style="display: none;" onchange="handleFileSelect(event)">
            </div>
            
            <div id="importPreview" style="display: none; margin-top: 20px;">
                <h4>Preview</h4>
                <div id="importPreviewTable" style="max-height: 200px; overflow: auto;"></div>
                <button class="btn btn-primary btn-full" onclick="confirmImport()" style="margin-top: 15px;">
                    <i class="fas fa-check"></i> Import Data
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add dropzone styles
    const style = document.createElement('style');
    style.textContent = `
        .import-dropzone {
            border: 2px dashed var(--border-color);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            background: var(--bg-secondary);
        }
        .import-dropzone:hover, .import-dropzone.dragover {
            border-color: var(--primary-color);
            background: rgba(59, 130, 246, 0.1);
        }
    `;
    document.head.appendChild(style);
    
    // Setup drag and drop
    const dropzone = document.getElementById('importDropzone');
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processImportFile(file);
    });
}

// Store imported data temporarily
let pendingImportData = null;

// Handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        await processImportFile(file);
    }
}

// Process import file
async function processImportFile(file) {
    try {
        const result = await importFile(file);
        pendingImportData = result.data;
        
        // Show preview
        document.getElementById('importPreview').style.display = 'block';
        const previewTable = document.getElementById('importPreviewTable');
        
        // Create preview table (show first 5 rows)
        const previewData = result.data.slice(0, 5);
        let tableHTML = '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        tableHTML += '<thead><tr>';
        result.headers.forEach(h => {
            tableHTML += `<th style="border: 1px solid var(--border-color); padding: 8px; background: var(--bg-secondary);">${h}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        
        previewData.forEach(row => {
            tableHTML += '<tr>';
            result.headers.forEach(h => {
                tableHTML += `<td style="border: 1px solid var(--border-color); padding: 8px;">${row[h] || ''}</td>`;
            });
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody></table>';
        if (result.data.length > 5) {
            tableHTML += `<p style="text-align: center; margin-top: 10px; color: var(--text-secondary);">...and ${result.data.length - 5} more rows</p>`;
        }
        
        previewTable.innerHTML = tableHTML;
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Confirm import
async function confirmImport() {
    if (!pendingImportData) return;
    
    try {
        const result = await uploadImportedData(pendingImportData);
        
        if (result.success) {
            showMessage(`Successfully imported ${pendingImportData.length} records!`, 'success');
            closeImportModal();
            // Refresh dashboard data
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            showMessage(result.message || 'Import failed', 'error');
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Open import modal
function openImportModal() {
    if (!document.getElementById('importModal')) {
        createImportModal();
    }
    document.getElementById('importModal').style.display = 'block';
    pendingImportData = null;
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importFileInput').value = '';
}

// Close import modal
function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'none';
}

// =====================
// Export Modal
// =====================

function createExportModal() {
    const modal = document.createElement('div');
    modal.id = 'exportModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="closeExportModal()">&times;</span>
            <h2><i class="fas fa-file-export"></i> Export Data</h2>
            <p>Choose your export format</p>
            
            <div style="display: grid; gap: 15px; margin-top: 20px;">
                <button class="btn btn-secondary btn-full" onclick="exportData('csv')">
                    <i class="fas fa-file-csv"></i> Export as CSV
                </button>
                <button class="btn btn-secondary btn-full" onclick="exportData('excel')">
                    <i class="fas fa-file-excel"></i> Export as Excel
                </button>
                <button class="btn btn-secondary btn-full" onclick="exportData('pdf')">
                    <i class="fas fa-file-pdf"></i> Export as PDF
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openExportModal() {
    if (!document.getElementById('exportModal')) {
        createExportModal();
    }
    document.getElementById('exportModal').style.display = 'block';
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.style.display = 'none';
}

// Export data handler
async function exportData(format) {
    try {
        // Fetch current data
        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA, {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (!result.success || !result.data || !result.data.length) {
            showMessage('No data to export', 'error');
            return;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        
        switch (format) {
            case 'csv':
                exportToCSV(result.data, `dataxpert-export-${timestamp}.csv`);
                showMessage('CSV exported successfully!', 'success');
                break;
            case 'excel':
                exportToExcel(result.data, `dataxpert-export-${timestamp}.xlsx`);
                showMessage('Excel exported successfully!', 'success');
                break;
            case 'pdf':
                await exportToPDF('dashboardContainer', `dataxpert-report-${timestamp}.pdf`);
                showMessage('PDF exported successfully!', 'success');
                break;
        }
        
        closeExportModal();
    } catch (error) {
        showMessage(error.message || 'Export failed', 'error');
    }
}
