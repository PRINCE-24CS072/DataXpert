// Data Import/Export Module — DataXpert
// Handles CSV/Excel import, file validation, upload error UI, and export

// =====================
// CSV/Excel Import
// =====================

function parseCSV(text) {
    const lines = text.split('\n');
    if (!lines.length) return { headers: [], data: [] };

    function parseLine(line) {
        const result = [];
        let cell = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                result.push(cell.trim());
                cell = '';
            } else {
                cell += ch;
            }
        }
        result.push(cell.trim());
        return result;
    }

    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = (values[index] || '').replace(/^"|"$/g, '').trim();
        });
        data.push(row);
    }

    return { headers, data };
}

async function importCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try { resolve(parseCSV(e.target.result)); }
            catch (error) { reject(new Error('Failed to parse CSV file')); }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

async function importExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (typeof XLSX === 'undefined') { reject(new Error('Excel library not loaded')); return; }
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
                const headers = (jsonData[0] || []).map(h => String(h).trim());
                const rows = jsonData.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, i) => { obj[header] = row[i] !== undefined ? String(row[i]).trim() : ''; });
                    return obj;
                }).filter(row => Object.values(row).some(v => v !== ''));
                resolve({ headers, data: rows });
            } catch (error) { reject(new Error('Failed to parse Excel file')); }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

async function importFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension === 'csv') return await importCSV(file);
    if (['xlsx', 'xls'].includes(extension)) return await importExcel(file);
    throw new Error('Unsupported file format. Please use CSV or Excel files.');
}

// =====================
// Template Download
// =====================

function downloadTemplate() {
    const csv = [
        'date,type,amount,category,description',
        '2024-01-01,sale,10000,Electronics,Sample product sale',
        '2024-01-02,expense,2000,Rent,Monthly office rent',
        '2024-01-03,sale,15000,Clothing,Apparel sale',
        '2024-01-04,expense,500,Utilities,Electricity bill',
        '2024-01-05,revenue,5000,Services,Consulting fee'
    ].join('\n');
    downloadFile(csv, 'dataxpert-template.csv', 'text/csv');
    if (typeof showToast === 'function') showToast('Template downloaded', 'success');
}

// =====================
// Upload Validation
// =====================

const REQUIRED_COLUMNS = ['date', 'type', 'amount', 'category', 'description'];
const VALID_TYPES = ['sale', 'expense', 'revenue', 'profit'];

function buildColumnStatus(required, found) {
    const status = {};
    required.forEach(col => { status[col] = found.includes(col) ? 'found' : 'missing'; });
    found.filter(h => !required.includes(h)).forEach(h => { status[h] = 'extra'; });
    return status;
}

function validateUploadedFile(headers, data) {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const missing = REQUIRED_COLUMNS.filter(r => !normalizedHeaders.includes(r));
    const extra = normalizedHeaders.filter(h => !REQUIRED_COLUMNS.includes(h));
    const columnStatus = buildColumnStatus(REQUIRED_COLUMNS, normalizedHeaders);

    const rowErrors = [];
    data.slice(0, 100).forEach((row, i) => {
        const rowNum = i + 2;
        const normalizedRow = {};
        Object.entries(row).forEach(([k, v]) => { normalizedRow[k.toLowerCase().trim()] = v; });

        if (!normalizedRow['date'] || !normalizedRow['date'].trim()) {
            rowErrors.push(`Row ${rowNum}: Missing date`);
        }
        const typeVal = (normalizedRow['type'] || '').toLowerCase().trim();
        if (typeVal && !VALID_TYPES.includes(typeVal)) {
            rowErrors.push(`Row ${rowNum}: Invalid type "${normalizedRow['type']}" (use: sale/expense/revenue/profit)`);
        }
        const amtVal = parseFloat(normalizedRow['amount']);
        if (normalizedRow['amount'] !== undefined && (isNaN(amtVal) || amtVal < 0)) {
            rowErrors.push(`Row ${rowNum}: Invalid amount "${normalizedRow['amount']}"`);
        }
    });

    return {
        valid: missing.length === 0 && rowErrors.length === 0,
        missing, extra,
        rowErrors: rowErrors.slice(0, 5),
        hasMoreErrors: rowErrors.length > 5,
        columnStatus
    };
}

function showUploadError(validation) {
    const box = document.getElementById('uploadErrorBox');
    if (!box) return;

    let html = '';

    if (validation.missing && validation.missing.length > 0) {
        html += `<div class="upload-error-title"><span class="error-icon">✕</span> Missing Required Columns</div>`;
        html += `<div class="col-pill-row">`;
        Object.entries(validation.columnStatus || {}).forEach(([col, status]) => {
            html += `<span class="col-pill col-pill-${status}">${col}</span>`;
        });
        html += `</div>`;
        if (validation.extra && validation.extra.length > 0) {
            html += `<div class="upload-error-sub">Extra columns (ignored): ${validation.extra.join(', ')}</div>`;
        }
    } else if (validation.extra && validation.extra.length > 0) {
        html += `<div class="col-pill-row">`;
        Object.entries(validation.columnStatus || {}).forEach(([col, status]) => {
            html += `<span class="col-pill col-pill-${status}">${col}</span>`;
        });
        html += `</div>`;
    }

    if (validation.rowErrors && validation.rowErrors.length > 0) {
        html += `<div class="upload-error-title" style="margin-top:10px;"><span class="error-icon">!</span> Data Errors</div>`;
        html += `<ul class="upload-error-list">`;
        validation.rowErrors.forEach(err => { html += `<li>${err}</li>`; });
        if (validation.hasMoreErrors) {
            html += `<li style="opacity:0.7">...and more errors. Fix the above first.</li>`;
        }
        html += `</ul>`;
    }

    box.innerHTML = html;
    box.style.display = html ? 'block' : 'none';
}

function clearUploadError() {
    const box = document.getElementById('uploadErrorBox');
    if (box) { box.innerHTML = ''; box.style.display = 'none'; }
}

// =====================
// Main Upload Function
// =====================

async function uploadFile(file) {
    clearUploadError();

    let parsed;
    try {
        parsed = await importFile(file);
    } catch (err) {
        showUploadError({ missing: [`Could not read file: ${err.message}`], extra: [], rowErrors: [], columnStatus: {} });
        return false;
    }

    if (!parsed.data || parsed.data.length === 0) {
        showUploadError({ missing: ['File appears to be empty. Please add data rows.'], extra: [], rowErrors: [], columnStatus: {} });
        return false;
    }

    const validation = validateUploadedFile(parsed.headers, parsed.data);

    if (!validation.valid) {
        showUploadError(validation);
        return false;
    }

    try {
        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA_UPLOAD, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ data: parsed.data, type: 'business' })
        });
        const result = await response.json();

        if (result.success) {
            if (typeof DataCache !== 'undefined') DataCache.invalidate();
            if (typeof showToast === 'function') showToast(`Imported ${parsed.data.length} records!`, 'success');
            const modal = document.getElementById('uploadDataModal');
            if (modal) modal.classList.remove('open');
            if (typeof loadDashboardData === 'function') loadDashboardData();
            return true;
        } else {
            if (typeof showToast === 'function') showToast(result.message || 'Upload failed', 'error');
            return false;
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast('Network error during upload', 'error');
        return false;
    }
}

// =====================
// Legacy Upload
// =====================

async function uploadImportedData(data, dataType = 'business') {
    const response = await fetch(API_ENDPOINTS.BUSINESS_DATA_UPLOAD, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ data: data, type: dataType })
    });
    return await response.json();
}

// =====================
// Export Functions
// =====================

function exportToCSV(data, filename = 'export.csv') {
    if (!data || !data.length) throw new Error('No data to export');
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] !== undefined ? row[header] : '';
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
        });
        csvRows.push(values.join(','));
    });
    downloadFile(csvRows.join('\n'), filename, 'text/csv');
}

function exportToExcel(data, filename = 'export.xlsx') {
    if (typeof XLSX === 'undefined') throw new Error('Excel library not loaded');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, filename);
}

async function exportToPDF(elementId, filename = 'report.pdf') {
    if (typeof html2pdf === 'undefined') throw new Error('PDF library not loaded');
    const element = document.getElementById(elementId);
    if (!element) throw new Error('Element not found');
    const options = {
        margin: 10, filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(options).from(element).save();
}

function exportChartAsImage(chartId, filename = 'chart.png') {
    const canvas = document.getElementById(chartId);
    if (!canvas) throw new Error('Chart not found');
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

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

async function exportData(format) {
    try {
        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA, { headers: getAuthHeaders() });
        const result = await response.json();

        if (!result.success || !result.data || !result.data.length) {
            if (typeof showToast === 'function') showToast('No data to export', 'error');
            return;
        }

        const timestamp = new Date().toISOString().split('T')[0];

        switch (format) {
            case 'csv':
                exportToCSV(result.data, `dataxpert-export-${timestamp}.csv`);
                if (typeof showToast === 'function') showToast('CSV exported!', 'success');
                break;
            case 'excel':
                exportToExcel(result.data, `dataxpert-export-${timestamp}.xlsx`);
                if (typeof showToast === 'function') showToast('Excel exported!', 'success');
                break;
            case 'pdf':
                await exportToPDF('dashboardContainer', `dataxpert-report-${timestamp}.pdf`);
                if (typeof showToast === 'function') showToast('PDF exported!', 'success');
                break;
        }
        closeExportModal();
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message || 'Export failed', 'error');
    }
}

// =====================
// Export Modal
// =====================

function createExportModal() {
    if (document.getElementById('exportModal')) return;
    const modal = document.createElement('div');
    modal.id = 'exportModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:380px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-file-export"></i> Export Data</h3>
                <button class="modal-close" onclick="closeExportModal()">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="display:grid;gap:12px;margin-top:8px;">
                <button class="btn btn-secondary btn-full" onclick="exportData('csv')">
                    <i class="fas fa-file-csv" style="margin-right:8px;"></i>Export as CSV
                </button>
                <button class="btn btn-secondary btn-full" onclick="exportData('excel')">
                    <i class="fas fa-file-excel" style="margin-right:8px;"></i>Export as Excel
                </button>
                <button class="btn btn-secondary btn-full" onclick="exportData('pdf')">
                    <i class="fas fa-file-pdf" style="margin-right:8px;"></i>Export as PDF Report
                </button>
                <button class="btn btn-ghost btn-full" onclick="downloadTemplate()">
                    <i class="fas fa-download" style="margin-right:8px;"></i>Download Import Template
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeExportModal(); });
}

function openExportModal() {
    createExportModal();
    document.getElementById('exportModal').classList.add('open');
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.classList.remove('open');
}

// =====================
// Import Modal (legacy compat)
// =====================

let pendingImportData = null;

function createImportModal() {
    if (document.getElementById('importModal')) return;
    const modal = document.createElement('div');
    modal.id = 'importModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:520px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-file-import"></i> Import Data</h3>
                <button class="modal-close" onclick="closeImportModal()">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p style="color:var(--text-secondary);margin-bottom:16px;">Required columns: date, type, amount, category, description.</p>
                <div class="upload-zone" id="importDropzone" onclick="document.getElementById('importFileInput').click()">
                    <i class="fas fa-cloud-upload-alt" style="font-size:36px;margin-bottom:12px;display:block;"></i>
                    <p>Drag &amp; drop or click to browse</p>
                    <p style="font-size:12px;opacity:0.6">CSV, XLSX, XLS supported</p>
                    <input type="file" id="importFileInput" accept=".csv,.xlsx,.xls" style="display:none;" onchange="handleFileSelect(event)">
                </div>
                <div id="importUploadError"></div>
                <div id="importPreview" style="display:none;margin-top:16px;">
                    <h4 style="margin-bottom:8px;">Preview</h4>
                    <div id="importPreviewTable" style="max-height:200px;overflow:auto;"></div>
                    <button class="btn btn-primary" onclick="confirmImport()" style="margin-top:12px;width:100%;">
                        <i class="fas fa-check"></i> Import Data
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeImportModal(); });

    const dropzone = document.getElementById('importDropzone');
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processImportFile(file);
    });
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) await processImportFile(file);
}

async function processImportFile(file) {
    try {
        const result = await importFile(file);
        pendingImportData = result.data;

        const preview = document.getElementById('importPreview');
        const previewTable = document.getElementById('importPreviewTable');
        if (!preview || !previewTable) return;

        preview.style.display = 'block';
        const previewData = result.data.slice(0, 5);
        let tableHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
        tableHTML += '<thead><tr>';
        result.headers.forEach(h => {
            tableHTML += `<th style="border:1px solid var(--border-subtle);padding:6px 8px;background:var(--bg-elevated);">${h}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        previewData.forEach(row => {
            tableHTML += '<tr>';
            result.headers.forEach(h => {
                tableHTML += `<td style="border:1px solid var(--border-subtle);padding:6px 8px;">${row[h] || ''}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        if (result.data.length > 5) {
            tableHTML += `<p style="text-align:center;margin-top:8px;opacity:0.6;font-size:12px;">...and ${result.data.length - 5} more rows</p>`;
        }
        previewTable.innerHTML = tableHTML;
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
    }
}

async function confirmImport() {
    if (!pendingImportData) return;
    try {
        const result = await uploadImportedData(pendingImportData);
        if (result.success) {
            if (typeof DataCache !== 'undefined') DataCache.invalidate();
            if (typeof showToast === 'function') showToast(`Imported ${pendingImportData.length} records!`, 'success');
            closeImportModal();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            if (typeof showToast === 'function') showToast(result.message || 'Import failed', 'error');
        }
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
    }
}

function openImportModal() {
    createImportModal();
    document.getElementById('importModal').classList.add('open');
    pendingImportData = null;
    const preview = document.getElementById('importPreview');
    const input = document.getElementById('importFileInput');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.classList.remove('open');
}
