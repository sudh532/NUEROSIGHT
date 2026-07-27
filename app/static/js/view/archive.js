/**
 * Archive & Chart coordinator for Aegis-Eye historical trends
 * Refactored for Drug & Substance Impairment Audit filtering (Phase 1).
 */

import { Api } from '../api.js';
import { Elements } from './elements.js';

let trendsChartInstance = null;
let currentRawLogs = [];
let activeTimeRange = 'ALL';
let activeCategoryFilter = 'ALL';
let hiddenDatasets = { 0: false, 1: false, 2: false };

export const Archive = {
  renderTrends(logs) {
    currentRawLogs = logs || [];
    const canvas = document.getElementById('trends-chart-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (trendsChartInstance) {
      trendsChartInstance.destroy();
    }

    if (!currentRawLogs || currentRawLogs.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'var(--color-text-muted)';
      ctx.font = '10px var(--font-mono)';
      ctx.textAlign = 'center';
      ctx.fillText('NO ARCHIVAL RECORDS PRESENT', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Sort chronologically
    let chronologicalLogs = [...currentRawLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Time-Scale Filter Slicing
    const now = new Date().getTime();
    if (activeTimeRange === '1D') {
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      chronologicalLogs = chronologicalLogs.filter(l => new Date(l.timestamp).getTime() >= oneDayAgo);
    } else if (activeTimeRange === '7D') {
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      chronologicalLogs = chronologicalLogs.filter(l => new Date(l.timestamp).getTime() >= sevenDaysAgo);
    } else if (activeTimeRange === '1M') {
      const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
      chronologicalLogs = chronologicalLogs.filter(l => new Date(l.timestamp).getTime() >= oneMonthAgo);
    }

    const displayLogs = chronologicalLogs.slice(-20);

    const labels = displayLogs.map(log => {
      const d = new Date(log.timestamp);
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    });

    const rednessData = displayLogs.map(log => log.redness_score);
    const dilationData = displayLogs.map(log => log.dilation_score);
    const ptosisData = displayLogs.map(log => log.ptosis_score);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tickColor = isDark ? '#565f89' : '#94a3b8';
    const labelFont = { family: 'Fira Code, JetBrains Mono, monospace', size: 9 };

    trendsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'REDNESS',
            data: rednessData,
            borderColor: '#f7768e',
            backgroundColor: 'rgba(247, 118, 142, 0.05)',
            borderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#f7768e',
            tension: 0.25,
            hidden: hiddenDatasets[0]
          },
          {
            label: 'PUPIL PIR',
            data: dilationData,
            borderColor: '#7aa2f7',
            backgroundColor: 'rgba(122, 162, 247, 0.05)',
            borderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#7aa2f7',
            tension: 0.25,
            hidden: hiddenDatasets[1]
          },
          {
            label: 'EYELID APERTURE',
            data: ptosisData,
            borderColor: '#bb9af7',
            backgroundColor: 'rgba(187, 154, 247, 0.05)',
            borderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#bb9af7',
            tension: 0.25,
            hidden: hiddenDatasets[2]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (context) => this.customTooltipHandler(context, displayLogs)
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: tickColor, font: labelFont }
          },
          y: {
            grid: { color: 'rgba(122, 162, 247, 0.06)', drawBorder: false },
            ticks: { color: tickColor, font: labelFont },
            min: 0,
            max: 1.0
          }
        }
      }
    });
  },

  // Custom Frosted Glass Snapshot Tooltip
  customTooltipHandler(context, displayLogs) {
    const { chart, tooltip } = context;
    let tooltipEl = document.getElementById('chart-tooltip-card');

    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'chart-tooltip-card';
      tooltipEl.className = 'chart-tooltip-card';
      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

    const dataIndex = tooltip.dataPoints[0].dataIndex;
    const log = displayLogs[dataIndex];

    if (log) {
      const dateStr = new Date(log.timestamp).toLocaleString();
      tooltipEl.innerHTML = `
        <div style="font-weight: 700; color: var(--color-accent-cyan); margin-bottom: 4px;">${log.overall_verdict || 'RECORD VERIFICATION'}</div>
        <div style="color: var(--color-text-muted); font-size: 0.65rem;">${dateStr}</div>
        <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 2px;">
          <div>REDNESS: <span style="color:#f7768e; font-weight:600;">${log.redness_score.toFixed(2)}</span></div>
          <div>PIR: <span style="color:#7aa2f7; font-weight:600;">${log.dilation_score.toFixed(2)}</span></div>
          <div>APERTURE: <span style="color:#bb9af7; font-weight:600;">${log.ptosis_score.toFixed(2)}</span></div>
          <div style="margin-top: 4px; color: var(--color-text-muted);">OP: ${log.operator_id} // CASE: ${log.case_id}</div>
        </div>
      `;
    }

    const position = chart.canvas.getBoundingClientRect();
    tooltipEl.style.opacity = 1;
    tooltipEl.style.left = `${tooltip.caretX + 15}px`;
    tooltipEl.style.top = `${tooltip.caretY - 20}px`;
  },

  setTimeRange(rangeKey) {
    activeTimeRange = rangeKey;
    document.querySelectorAll('.range-pill-btn').forEach(btn => {
      if (btn.getAttribute('data-range') === rangeKey) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
    this.renderTrends(currentRawLogs);
  },

  toggleDataset(datasetIndex) {
    hiddenDatasets[datasetIndex] = !hiddenDatasets[datasetIndex];
    const btn = document.querySelector(`.legend-toggle-btn[data-dataset="${datasetIndex}"]`);
    if (btn) {
      if (hiddenDatasets[datasetIndex]) {
        btn.classList.add('is-hidden');
      } else {
        btn.classList.remove('is-hidden');
      }
    }
    this.renderTrends(currentRawLogs);
  },

  // Audit Logs Table & Drug Category Filters
  renderAuditTable(logs) {
    currentRawLogs = logs || [];
    const tbody = document.getElementById('audit-log-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!currentRawLogs || currentRawLogs.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7" style="text-align: center; color: var(--color-text-muted); font-family: var(--font-mono); padding: var(--space-md);">NO RECENT TELEMETRY LOGS FOUND</td></tr>`;
      return;
    }

    let sortedLogs = [...currentRawLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Drug Screening Category Status Filtering
    if (activeCategoryFilter !== 'ALL') {
      sortedLogs = sortedLogs.filter(log => {
        const v = (log.overall_verdict || '').toUpperCase();
        const pir = log.dilation_score || 0.33;
        const ptosis = log.ptosis_score || 0.38;

        if (activeCategoryFilter === 'CLEARED') {
          return v.includes('CLEARED') || v.includes('NO SUBSTANCE') || v.includes('COMPLETE');
        }
        if (activeCategoryFilter === 'IMPAIRMENT') {
          return v.includes('IMPAIRMENT') || v.includes('STIMULANT') || v.includes('DEPRESSANT');
        }
        if (activeCategoryFilter === 'OPIOID_INDICATOR') {
          return pir < 0.18 || v.includes('DEPRESSANT') || v.includes('OPIOID');
        }
        if (activeCategoryFilter === 'STIMULANT_INDICATOR') {
          return pir > 0.45 || v.includes('STIMULANT');
        }
        if (activeCategoryFilter === 'SEDATIVE_INDICATOR') {
          return ptosis < 0.30 || v.includes('SEDATIVE') || v.includes('TRAUMA');
        }
        return true;
      });
    }

    sortedLogs.forEach(log => {
      const row = document.createElement('tr');
      row.setAttribute('data-log-id', log.id);
      
      const date = new Date(log.timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const verdictBadge = formatAuditVerdict(log);

      row.innerHTML = `
        <td>${date}</td>
        <td>${verdictBadge}</td>
        <td><code>${log.operator_id || 'OP-7392'}</code></td>
        <td><code>${log.case_id || 'CASE-8821'}</code></td>
        <td>${(log.redness_score || 0).toFixed(2)}</td>
        <td>${(log.dilation_score || 0).toFixed(2)}</td>
        <td style="text-align: center;">
          <button class="btn-delete-log" data-log-id="${log.id}" title="Purge Record">🗑</button>
        </td>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-log')) return;
        this.openInspectionDrawer(log);
      });

      const deleteBtn = row.querySelector('.btn-delete-log');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.promptDeleteConfirmation(log);
        });
      }

      tbody.appendChild(row);
    });
  },

  setCategoryFilter(categoryKey) {
    activeCategoryFilter = categoryKey;
    document.querySelectorAll('.table-filter-pill').forEach(pill => {
      if (pill.getAttribute('data-category') === categoryKey) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
    this.renderAuditTable(currentRawLogs);
  },

  // Interactive Row Inspection Side-Drawer Modal
  openInspectionDrawer(logRecord) {
    let backdrop = document.getElementById('inspection-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'inspection-drawer-backdrop';
      backdrop.className = 'inspection-drawer-backdrop';
      backdrop.innerHTML = `
        <div class="inspection-drawer-panel" id="inspection-drawer-panel">
          <div class="drawer-header">
            <div class="drawer-title" id="drawer-verdict-title">SUBSTANCE IMPAIRMENT RECORD</div>
            <button class="drawer-close-btn" id="drawer-close-btn">&times;</button>
          </div>
          <div class="drawer-body" id="drawer-body-content"></div>
        </div>
      `;
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeInspectionDrawer();
      });
      document.getElementById('drawer-close-btn').addEventListener('click', () => this.closeInspectionDrawer());
    }

    const bodyContent = document.getElementById('drawer-body-content');
    const titleEl = document.getElementById('drawer-verdict-title');

    if (titleEl) titleEl.textContent = logRecord.overall_verdict || 'SUBSTANCE IMPAIRMENT RECORD';

    const dateStr = new Date(logRecord.timestamp).toLocaleString();

    bodyContent.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-muted);">
        <div>TIMESTAMP: ${dateStr}</div>
        <div>OPERATOR ID: ${logRecord.operator_id}</div>
        <div>CASE INCIDENT HASH: ${logRecord.case_id}</div>
        <div>RECORD HASH: <code>${logRecord.image_hash || 'N/A'}</code></div>
      </div>

      <div style="margin-top: 12px; border-top: 1px solid var(--glass-border); padding-top: 12px;">
        <span class="section-label">Substance Impairment Breakdown</span>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: var(--font-mono); font-size: 0.8rem; margin-top: 8px;">
          <div style="background: rgba(36,40,59,0.5); padding: 10px; border-radius: 6px;">
            <div style="color: var(--color-text-muted); font-size: 0.65rem;">VASCULAR INJECTION</div>
            <div style="font-size: 1.1rem; color: #f7768e; font-weight:700;">${(logRecord.redness_score * 100).toFixed(1)}%</div>
          </div>
          <div style="background: rgba(36,40,59,0.5); padding: 10px; border-radius: 6px;">
            <div style="color: var(--color-text-muted); font-size: 0.65rem;">PUPIL PIR</div>
            <div style="font-size: 1.1rem; color: #7aa2f7; font-weight:700;">${logRecord.dilation_score.toFixed(2)}</div>
          </div>
          <div style="background: rgba(36,40,59,0.5); padding: 10px; border-radius: 6px;">
            <div style="color: var(--color-text-muted); font-size: 0.65rem;">PTOSIS DELTA</div>
            <div style="font-size: 1.1rem; color: #bb9af7; font-weight:700;">${logRecord.ptosis_score.toFixed(2)}</div>
          </div>
          <div style="background: rgba(36,40,59,0.5); padding: 10px; border-radius: 6px;">
            <div style="color: var(--color-text-muted); font-size: 0.65rem;">ANISOCORIA FLAG</div>
            <div style="font-size: 1.1rem; color: ${logRecord.anisocoria_flag ? '#f7768e' : '#7dcfff'}; font-weight:700;">${logRecord.anisocoria_flag ? 'DETECTED' : 'CLEAR'}</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 16px; border-top: 1px solid var(--glass-border); padding-top: 12px;">
        <span class="section-label">Ocular Impairment Compliance Verification</span>
        <p style="font-family: var(--font-sans); font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.5; margin-top: 6px;">
          This ocular substance impairment log record is cryptographically validated and stored in SQLite. All biometric parameters comply with workplace fit-for-duty evaluation protocols.
        </p>
      </div>

      <div style="margin-top: 20px; border-top: 1px solid var(--glass-border); padding-top: 14px;">
        <button id="btn-drawer-delete-log" class="btn-purge-record" style="width: 100%;">
          🗑 PURGE RECORD FROM VAULT
        </button>
      </div>
    `;

    const purgeBtn = document.getElementById('btn-drawer-delete-log');
    if (purgeBtn) {
      purgeBtn.addEventListener('click', () => {
        this.promptDeleteConfirmation(logRecord);
      });
    }

    backdrop.classList.add('is-open');
  },

  promptDeleteConfirmation(logRecord) {
    let modalBackdrop = document.getElementById('delete-modal-backdrop');
    if (!modalBackdrop) {
      modalBackdrop = document.createElement('div');
      modalBackdrop.id = 'delete-modal-backdrop';
      modalBackdrop.className = 'delete-confirm-modal-backdrop';
      modalBackdrop.innerHTML = `
        <div class="delete-confirm-modal-container">
          <div class="delete-modal-header">
            <div class="delete-modal-title">⚠️ CONFIRM AUDIT LOG PURGE</div>
            <button class="delete-modal-close" id="btn-close-delete-modal">&times;</button>
          </div>
          <div class="delete-modal-body" id="delete-modal-body-text">
          </div>
          <div class="delete-modal-footer">
            <button class="btn-modal-cancel" id="btn-cancel-delete">CANCEL</button>
            <button class="btn-modal-confirm" id="btn-confirm-delete">CONFIRM PURGE</button>
          </div>
        </div>
      `;
      document.body.appendChild(modalBackdrop);

      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) modalBackdrop.classList.remove('is-open');
      });
      document.getElementById('btn-close-delete-modal').addEventListener('click', () => {
        modalBackdrop.classList.remove('is-open');
      });
      document.getElementById('btn-cancel-delete').addEventListener('click', () => {
        modalBackdrop.classList.remove('is-open');
      });
    }

    const bodyText = document.getElementById('delete-modal-body-text');
    const dateStr = new Date(logRecord.timestamp).toLocaleString();
    bodyText.innerHTML = `
      <p style="margin-bottom: 10px; color: var(--color-accent-red); font-weight: 600;">PERMANENT DATABASE DELETION WARNING</p>
      <div style="font-family: var(--font-mono); font-size: 0.78rem; background: rgba(247, 118, 142, 0.08); border: 1px solid rgba(247, 118, 142, 0.2); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
        <div>RECORD ID: #${logRecord.id}</div>
        <div>TIMESTAMP: ${dateStr}</div>
        <div>CASE INCIDENT HASH: ${logRecord.case_id}</div>
        <div>OPERATOR: ${logRecord.operator_id}</div>
        <div>VERDICT: ${logRecord.overall_verdict || 'N/A'}</div>
      </div>
      <p style="font-size: 0.78rem; color: var(--color-text-muted);">
        Are you sure you want to permanently purge this biometric audit record from the forensic SQLite database? This action cannot be undone.
      </p>
    `;

    const confirmBtn = document.getElementById('btn-confirm-delete');
    // Replace listener
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
      newConfirmBtn.textContent = 'PURGING...';
      newConfirmBtn.disabled = true;
      try {
        await Api.deleteLog(logRecord.id);
        
        // Remove from current local state
        currentRawLogs = currentRawLogs.filter(l => l.id !== logRecord.id);
        
        modalBackdrop.classList.remove('is-open');
        this.closeInspectionDrawer();
        
        // Re-render table and trends graph
        this.renderAuditTable(currentRawLogs);
        this.renderTrends(currentRawLogs);

      } catch (err) {
        console.error('[Aegis Archive] Delete log failed:', err);
        alert(err.message || 'Log deletion failed.');
      } finally {
        newConfirmBtn.textContent = 'CONFIRM PURGE';
        newConfirmBtn.disabled = false;
      }
    });

    modalBackdrop.classList.add('is-open');
  },

  closeInspectionDrawer() {
    const backdrop = document.getElementById('inspection-drawer-backdrop');
    if (backdrop) backdrop.classList.remove('is-open');
  },

  bindPurgeAllEvents() {
    const purgeAllBtn = document.getElementById('btn-purge-all');
    const modal = document.getElementById('purge-all-modal');
    const confirmBtn = document.getElementById('confirm-purge-btn');
    const cancelBtn = document.getElementById('cancel-purge-btn');
    const closeBtn = document.getElementById('purge-all-modal-close');

    if (purgeAllBtn && modal) {
      purgeAllBtn.addEventListener('click', () => {
        modal.classList.add('is-open');
      });
    }

    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => {
        modal.classList.remove('is-open');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('is-open');
      });
    }

    if (confirmBtn && modal) {
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.textContent = 'PURGING VAULT...';
        confirmBtn.disabled = true;
        try {
          await Api.purgeAllLogs();
          currentRawLogs = [];
          this.renderAuditTable([]);
          this.renderTrends([]);
          Elements.resetTelemetryPanel();
          modal.classList.remove('is-open');
          this.closeInspectionDrawer();
          alert('Vault fully sanitized.');
        } catch (err) {
          console.error('[Aegis Archive] Bulk purge failed:', err);
          alert(err.message || 'Bulk purge failed.');
        } finally {
          confirmBtn.textContent = 'YES, PURGE EVERYTHING';
          confirmBtn.disabled = false;
        }
      });
    }
  },

  async syncArchivesVaultData() {
    try {
      const response = await fetch('/api/trends');
      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data = await response.json();
      const logs = data.fleet || data.logs || data;
      console.log("NEUROSIGHT ARCHIVES: Synced records count ->", logs.length);

      currentRawLogs = logs;
      this.renderAuditTable(logs);
      this.renderTrends(logs);
    } catch (err) {
      console.error("NEUROSIGHT ARCHIVES ERROR:", err);
    }
  },

  bindCsvExportEvent() {
    const exportBtn = document.getElementById('btn-export-csv');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/trends');
        const data = await res.json();
        const logs = data.fleet || data.logs || data || [];

        let csvContent = "data:text/csv;charset=utf-8,Timestamp,Verdict,Operator,CaseHash,Redness,PIR\n";
        logs.forEach(row => {
          const timestamp = row.timestamp || '';
          const verdict = row.overall_verdict || row.verdict || '';
          const op = row.operator_id || row.operator_badge_id || '';
          const cs = row.case_id || row.case_incident_hash || '';
          const red = (row.redness_score || row.redness || 0).toFixed(2);
          const pir = (row.dilation_score || row.pir || 0).toFixed(2);
          csvContent += `"${timestamp}","${verdict}","${op}","${cs}",${red},${pir}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `neurosight_audit_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("CSV Export Error:", err);
      }
    });

    this.bindPdfExportEvent();
  },

  bindPdfExportEvent() {
    const exportPdfBtn = document.getElementById('btn-export-pdf');
    if (!exportPdfBtn) return;

    exportPdfBtn.addEventListener('click', () => {
      const container = document.querySelector('#archives-view') || document.body;
      if (window.html2pdf) {
        const opt = {
          margin: 0.5,
          filename: `neurosight_forensic_report_${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: '#1a1b26' },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        window.html2pdf().set(opt).from(container).save();
      } else {
        window.print();
      }
    });
  }
};

window.Archive = Archive;

window.addEventListener('neuroScanComplete', () => {
  if (window.Archive && typeof window.Archive.syncArchivesVaultData === 'function') {
    window.Archive.syncArchivesVaultData();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  Archive.bindCsvExportEvent();
});

function formatAuditVerdict(logEntry) {
    if (!logEntry) return `<span class="badge-verdict badge-cleared">CLEARED</span>`;
    
    const category = String(logEntry.verdict_category || logEntry.category || logEntry.overall_verdict || logEntry.verdict || '').toUpperCase();
    let isImpaired = false;

    if (typeof logEntry.is_impaired === 'boolean') {
        isImpaired = logEntry.is_impaired;
    } else {
        isImpaired = !category.includes('NONE') && 
                     !category.includes('CLEARED') && 
                     !category.includes('NO SUBSTANCE') && 
                     !category.includes('SAFE') && 
                     category !== '';
    }

    if (isImpaired) {
        return `<span class="badge-verdict badge-impairment">IMPAIRMENT</span>`;
    } else {
        return `<span class="badge-verdict badge-cleared">CLEARED</span>`;
    }
}


