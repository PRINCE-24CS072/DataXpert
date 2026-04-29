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
        'date,category,sales,expenses,profit,description',
        '2024-01-01,Electronics,10000,0,0,Product sale revenue',
        '2024-01-02,Rent,0,2000,0,Monthly office rent',
        '2024-01-03,Clothing,15000,0,0,Apparel sale',
        '2024-01-04,Utilities,0,500,0,Electricity bill',
        '2024-01-05,Services,5000,0,0,Consulting fee'
    ].join('\n');
    downloadFile(csv, 'dataxpert-template.csv', 'text/csv');
    if (typeof showToast === 'function') showToast('Template downloaded', 'success');
}

// =====================
// Upload Validation
// =====================

// Required columns — updated to match backend data_processor expected format
// The data_processor also accepts: date/record_date, type/category, amount/sales
const REQUIRED_COLUMNS = ['date', 'category', 'sales'];
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

    // REQ 5: Row-level error details with field, expected, received
    const rowErrors = [];
    data.slice(0, 100).forEach((row, i) => {
        const rowNum = i + 2;
        const normalizedRow = {};
        Object.entries(row).forEach(([k, v]) => { normalizedRow[k.toLowerCase().trim()] = v; });

        if (!normalizedRow['date'] || !normalizedRow['date'].trim()) {
            rowErrors.push({
                row: rowNum,
                field: 'date',
                expected: 'YYYY-MM-DD (e.g. 2024-01-15)',
                received: normalizedRow['date'] !== undefined ? `"${normalizedRow['date']}"` : '(missing)'
            });
        } else {
            // Validate date format
            const d = new Date(normalizedRow['date']);
            if (isNaN(d.getTime())) {
                rowErrors.push({
                    row: rowNum,
                    field: 'date',
                    expected: 'Valid date (YYYY-MM-DD)',
                    received: `"${normalizedRow['date']}"`
                });
            }
        }

        const typeVal = (normalizedRow['type'] || '').toLowerCase().trim();
        if (typeVal && !VALID_TYPES.includes(typeVal)) {
            rowErrors.push({
                row: rowNum,
                field: 'type',
                expected: VALID_TYPES.join(' | '),
                received: `"${normalizedRow['type']}"`
            });
        }

        // Validate numeric fields
        ['sales', 'expenses', 'profit'].forEach(field => {
            const val = normalizedRow[field];
            if (val !== undefined && val !== '') {
                const num = parseFloat(val);
                if (isNaN(num) || num < 0) {
                    rowErrors.push({
                        row: rowNum,
                        field,
                        expected: 'Non-negative number',
                        received: `"${val}"`
                    });
                }
            }
        });
    });

    return {
        valid: missing.length === 0 && rowErrors.length === 0,
        missing, extra,
        rowErrors: rowErrors.slice(0, 10),
        hasMoreErrors: rowErrors.length > 10,
        columnStatus
    };
}

function showUploadError(validation) {
    // REQ 5: Show structured mismatch panel with row-level detail
    const box = document.getElementById('uploadErrorBox');
    if (!box) return;

    let html = '<div class="upload-error-panel" id="uploadMismatchPanel">';

    // Header
    html += `<div class="upload-error-header">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.193 2.5 1.732 2.5z"/></svg>
        Upload failed — data validation errors
    </div>`;

    // Column mismatch table
    const colStatus = validation.columnStatus || {};
    const hasColIssues = validation.missing && validation.missing.length > 0;
    if (hasColIssues || Object.keys(colStatus).length > 0) {
        const required = Object.keys(colStatus).filter(c => colStatus[c] !== 'extra');
        const extra = Object.keys(colStatus).filter(c => colStatus[c] === 'extra');
        let colRows = '';
        required.forEach(col => {
            const status = colStatus[col];
            const rowClass = status === 'missing' ? 'row-missing' : '';
            const badge = status === 'missing'
                ? '<span class="mismatch-badge missing">Missing</span>'
                : '<span class="mismatch-badge ok">Found</span>';
            colRows += `<tr class="${rowClass}"><td>${col}</td><td>${status === 'missing' ? '—' : col}</td><td>${badge}</td></tr>`;
        });
        extra.forEach(col => {
            colRows += `<tr class="row-extra"><td>—</td><td>${col}</td><td><span class="mismatch-badge unexpected">Unexpected</span></td></tr>`;
        });
        if (colRows) {
            html += `<div style="margin-bottom:12px;">
                <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Column Check</div>
                <table class="mismatch-table">
                    <thead><tr><th>Expected Column</th><th>Found in File</th><th>Status</th></tr></thead>
                    <tbody>${colRows}</tbody>
                </table>
            </div>`;
        }
    }

    // REQ 5: Row-level error table — Row Number, Field Name, Expected Value, Received Value
    const rowErrors = validation.rowErrors || [];
    if (rowErrors.length > 0) {
        // Determine if errors are objects (new format) or strings (legacy)
        const isStructured = rowErrors.length > 0 && typeof rowErrors[0] === 'object';

        if (isStructured) {
            let rowTbody = '';
            rowErrors.forEach(err => {
                rowTbody += `<tr>
                    <td style="font-family:'DM Mono',monospace;color:var(--accent-amber)">${err.row}</td>
                    <td><code style="background:rgba(148,163,184,0.1);padding:1px 6px;border-radius:4px;font-size:11px;">${err.field}</code></td>
                    <td style="color:var(--accent-green,#22c55e);font-size:12px;">${err.expected}</td>
                    <td style="color:var(--accent-red,#ef4444);font-size:12px;">${err.received}</td>
                </tr>`;
            });
            html += `<div>
                <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Row Errors</div>
                <table class="mismatch-table">
                    <thead><tr><th>Row #</th><th>Field</th><th>Expected</th><th>Received</th></tr></thead>
                    <tbody>${rowTbody}</tbody>
                </table>
                ${validation.hasMoreErrors ? '<p style="font-size:12px;color:var(--text-muted);margin-top:6px;">Fix above errors first — more errors may exist.</p>' : ''}
            </div>`;
        } else {
            // Legacy string format
            html += `<ul class="upload-error-list">${rowErrors.map(e => `<li>${e}</li>`).join('')}</ul>`;
        }
    }

    // Plain message errors
    if (validation.missing && validation.missing.length > 0 && !hasColIssues) {
        html += `<div class="upload-error-title"><span class="error-icon">✕</span> ${validation.missing.join('; ')}</div>`;
    }

    html += `<button class="btn-ghost" id="downloadErrorReport" style="height:30px;font-size:12px;padding:0 12px;margin-top:8px;" onclick="downloadMismatchReport()">Download error report (CSV)</button>`;
    html += '</div>';

    box.innerHTML = html;
    box.style.display = 'block';
    // Store for download
    window._lastMismatchData = { required: Object.keys(colStatus), extra: [], colStatus, rowErrors: validation.rowErrors };
}

// REQ 8: Download mismatch report as CSV
function downloadMismatchReport() {
    try {
        const data = window._lastMismatchData;
        if (!data) { if (typeof showToast === 'function') showToast('No mismatch data to export', 'warning'); return; }
        const rows = [
            ['Expected Column', 'Found in File', 'Status'],
            ...Object.entries(data.colStatus).map(([col, status]) => {
                const s = status === 'missing' ? 'Missing' : status === 'extra' ? 'Unexpected' : 'OK';
                return [col, status === 'extra' ? col : (status === 'missing' ? '' : col), s];
            })
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'dataxpert-upload-errors.csv';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('Error report downloaded', 'success');
    } catch(e) { if (typeof showToast === 'function') showToast('Download failed', 'error'); }
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

    // Local file type check — give immediate feedback before any network call
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        showUploadError({ missing: [`Unsupported file type ".${ext}". Please use CSV, XLSX, or XLS.`], extra: [], rowErrors: [], columnStatus: {} });
        return false;
    }

    // Show uploading state in zone
    const zone = document.getElementById('uploadZone');
    const zoneOrigHTML = zone ? zone.innerHTML : '';
    if (zone) zone.innerHTML = `<p style="color:var(--text-muted)">Uploading <strong>${file.name}</strong>…</p>`;

    const restore = () => { if (zone && zoneOrigHTML) zone.innerHTML = zoneOrigHTML; };

    try {
        // Send actual file as multipart — backend (upload-smart) requires request.files['file']
        const formData = new FormData();
        formData.append('file', file);
        const token = getToken();

        const response = await fetch(API_ENDPOINTS.BUSINESS_DATA_UPLOAD, {
            method: 'POST',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            // NO Content-Type header — browser sets multipart/form-data with boundary
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            restore();
            if (typeof DataCache !== 'undefined') DataCache.invalidate();
            const count = result.records_added || result.total_rows || '?';
            const warnings = result.warnings && result.warnings.length
                ? ` (${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''})` : '';
            if (typeof showToast === 'function') {
                showToast(`Successfully imported ${count} records!${warnings}`, 'success');
            }
            const modal = document.getElementById('uploadDataModal');
            if (modal) modal.classList.remove('open');
            if (typeof loadDashboardData === 'function') loadDashboardData();
            return true;
        } else {
            restore();
            // Build a rich error from the backend response
            const msg = result.message || 'Upload failed';
            const expectedCols = result.expected_columns;
            const reportSteps = result.processing_steps || [];

            if (expectedCols && expectedCols.length) {
                // Column mismatch error from backend
                const colStatus = {};
                expectedCols.forEach(c => { colStatus[c] = 'missing'; });
                showUploadError({
                    missing: [`File rejected by server: ${msg}`],
                    extra: [],
                    rowErrors: [`Required columns: ${expectedCols.join(', ')}`],
                    columnStatus: colStatus
                });
            } else {
                showUploadError({ missing: [msg], extra: [], rowErrors: reportSteps.slice(0, 3), columnStatus: {} });
            }
            if (typeof showToast === 'function') showToast(msg, 'error');
            return false;
        }
    } catch (err) {
        restore();
        const msg = navigator.onLine ? 'Upload failed. Please try again.' : 'No internet connection.';
        if (typeof showToast === 'function') showToast(msg, 'error');
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
        // REQ 10: Build URL respecting active date filter
        let exportUrl = API_ENDPOINTS.BUSINESS_DATA;
        const af = window.activeFilter || {};
        const params = new URLSearchParams();

        if (af.mode && af.mode !== 'all' && af.mode !== null) {
            if (af.mode === 'custom' && af.from && af.to) {
                params.set('from', af.from);
                params.set('to', af.to);
            } else if (af.mode === 'today') {
                const today = new Date().toISOString().split('T')[0];
                params.set('from', today);
                params.set('to', today);
            } else if (af.mode === 'week') {
                const to = new Date();
                const from = new Date(Date.now() - 7 * 86400000);
                params.set('from', from.toISOString().split('T')[0]);
                params.set('to', to.toISOString().split('T')[0]);
            } else if (af.mode === 'month') {
                const to = new Date();
                const from = new Date(Date.now() - 30 * 86400000);
                params.set('from', from.toISOString().split('T')[0]);
                params.set('to', to.toISOString().split('T')[0]);
            } else if (af.mode === 'year') {
                const to = new Date();
                const from = new Date(Date.now() - 365 * 86400000);
                params.set('from', from.toISOString().split('T')[0]);
                params.set('to', to.toISOString().split('T')[0]);
            }
            if (params.toString()) exportUrl += '?' + params.toString();
        }

        const response = await fetch(exportUrl, { headers: getAuthHeaders() });
        const result = await response.json();

        if (!result.success || !result.data || !result.data.length) {
            // Fallback: filter in-memory from dashboard data
            let rows = (typeof dashboardData !== 'undefined' && dashboardData)
                ? (dashboardData.recent_data || dashboardData.recentData || [])
                : [];

            if (rows.length === 0) {
                if (typeof showToast === 'function') showToast('No data to export', 'error');
                return;
            }

            // Apply filter client-side
            if (af.mode && af.mode !== 'all') {
                rows = _clientFilterRows(rows, af);
            }

            result.data = rows;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const filterSuffix = af.mode && af.mode !== 'all' ? `-${af.mode}` : '';

        switch (format) {
            case 'csv':
                exportToCSV(result.data, `dataxpert-export${filterSuffix}-${timestamp}.csv`);
                if (typeof showToast === 'function') showToast('CSV exported!', 'success');
                break;
            case 'excel':
                exportToExcel(result.data, `dataxpert-export${filterSuffix}-${timestamp}.xlsx`);
                if (typeof showToast === 'function') showToast('Excel exported!', 'success');
                break;
            case 'pdf':
                await exportToPDF('dashboardContainer', `dataxpert-report${filterSuffix}-${timestamp}.pdf`);
                if (typeof showToast === 'function') showToast('PDF exported!', 'success');
                break;
        }
        closeExportModal();
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message || 'Export failed', 'error');
    }
}

// Client-side filter helper for export
function _clientFilterRows(rows, af) {
    const now = new Date();
    if (af.mode === 'custom' && af.from && af.to) {
        const from = new Date(af.from);
        const to = new Date(af.to + 'T23:59:59');
        return rows.filter(r => {
            const d = new Date(r.record_date || r.date || '');
            return !isNaN(d) && d >= from && d <= to;
        });
    }
    let cutoff;
    if (af.mode === 'today') {
        const today = now.toISOString().split('T')[0];
        return rows.filter(r => (r.record_date || r.date || '').startsWith(today));
    } else if (af.mode === 'week')  cutoff = new Date(now - 7 * 86400000);
    else if (af.mode === 'month')  cutoff = new Date(now - 30 * 86400000);
    else if (af.mode === 'year')   cutoff = new Date(now - 365 * 86400000);
    if (cutoff) {
        return rows.filter(r => {
            const d = new Date(r.record_date || r.date || '');
            return !isNaN(d) && d >= cutoff;
        });
    }
    return rows;
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
            <div class="modal-head">
                <h3 class="modal-title"><i class="fas fa-file-export"></i> Export Data</h3>
                <button class="modal-close" onclick="closeExportModal()">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="display:grid;gap:12px;margin-top:8px;">
                <div class="export-filter-description" id="exportFilterDesc">Exporting data for: All data</div>
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
    // REQ 10: Update filter description in export modal
    const descEl = document.getElementById('exportFilterDesc');
    if (descEl) {
        const af = window.activeFilter || {};
        let desc = 'All data';
        if (af.mode && af.mode !== 'all' && af.mode !== null) {
            const now = new Date();
            const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            if (af.mode === 'today') desc = `Today — ${fmt(now)}`;
            else if (af.mode === 'week') desc = `This Week (last 7 days)`;
            else if (af.mode === 'month') desc = `This Month (last 30 days)`;
            else if (af.mode === 'year') desc = `This Year (last 365 days)`;
            else if (af.mode === 'custom' && af.from && af.to) desc = `Custom Range: ${af.from} – ${af.to}`;
        }
        descEl.textContent = `Exporting data for: ${desc}`;
    }
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
                <p style="color:var(--text-secondary);margin-bottom:16px;">Required columns: <code>date, category, sales, expenses, profit</code>. AI auto-maps similar column names.</p>
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
