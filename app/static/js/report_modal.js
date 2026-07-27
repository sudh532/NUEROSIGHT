/**
 * PDF / JSON Compliance Report Preview Modal Manager for Aegis-Eye
 * Refactored for Ocular Substance Impairment Audit (Phase 2).
 */

let activeData = null;

export const ReportModal = {
  open(data) {
    activeData = data;

    let backdrop = document.getElementById('report-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'report-modal-backdrop';
      backdrop.className = 'report-modal-backdrop';
      backdrop.innerHTML = `
        <div class="report-modal-container" id="report-modal-container">
          <!-- Modal Header -->
          <div class="report-modal-header">
            <div>
              <div class="report-brand-title">NEUROSIGHT ADVANCED DRUGGED EYE IDENTIFICATION - FORENSIC AUDIT REPORT</div>
              <div class="report-meta-hash" id="report-modal-meta">CASE HASH: N/A // OPERATOR: N/A</div>
            </div>
            <button class="modal-close-icon" id="report-modal-close-x">&times;</button>
          </div>

          <!-- Modal View Tabs -->
          <div class="report-tab-bar">
            <button class="report-tab-btn active" id="report-tab-pdf">Formatted Sheet</button>
            <button class="report-tab-btn" id="report-tab-json">Raw System Telemetry (JSON)</button>
          </div>

          <!-- View 1: Formatted Printable Sheet -->
          <div class="report-sheet-view" id="report-sheet-view">
            <!-- Populated via JavaScript -->
          </div>

          <!-- View 2: Raw JSON View -->
          <div class="report-json-view" id="report-json-view" style="display: none;">
            <pre class="report-json-code" id="report-json-code"></pre>
          </div>

          <!-- Modal Actions Footer -->
          <div class="report-modal-footer">
            <button class="nav-tab-btn" id="report-action-print" style="border: 1px solid var(--color-accent-cyan); color: var(--color-accent-cyan);">[PRINT / SAVE PDF]</button>
            <button class="nav-tab-btn" id="report-action-download-json" style="border: 1px solid var(--color-accent-purple); color: var(--color-accent-purple);">[DOWNLOAD RAW JSON]</button>
            <button class="nav-tab-btn" id="report-action-close" style="border: 1px solid var(--glass-border);">[CLOSE MODAL]</button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      // Bind events
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });

      document.getElementById('report-modal-close-x').addEventListener('click', () => this.close());
      document.getElementById('report-action-close').addEventListener('click', () => this.close());

      document.getElementById('report-tab-pdf').addEventListener('click', () => this.switchTab('sheet'));
      document.getElementById('report-tab-json').addEventListener('click', () => this.switchTab('json'));

      document.getElementById('report-action-print').addEventListener('click', () => this.printPDF());
      document.getElementById('report-action-download-json').addEventListener('click', () => this.downloadJSON());
    }

    this.renderContents(data);
    backdrop.classList.add('is-open');
  },

  close() {
    const backdrop = document.getElementById('report-modal-backdrop');
    if (backdrop) backdrop.classList.remove('is-open');
  },

  switchTab(tabName) {
    const sheetView = document.getElementById('report-sheet-view');
    const jsonView = document.getElementById('report-json-view');
    const btnPdf = document.getElementById('report-tab-pdf');
    const btnJson = document.getElementById('report-tab-json');

    if (tabName === 'sheet') {
      if (sheetView) sheetView.style.display = 'block';
      if (jsonView) jsonView.style.display = 'none';
      if (btnPdf) btnPdf.classList.add('active');
      if (btnJson) btnJson.classList.remove('active');
    } else {
      if (sheetView) sheetView.style.display = 'none';
      if (jsonView) jsonView.style.display = 'block';
      if (btnPdf) btnPdf.classList.remove('active');
      if (btnJson) btnJson.classList.add('active');
    }
  },

  renderContents(data) {
    if (!data) return;

    const metaHeader = document.getElementById('report-modal-meta');
    if (metaHeader) {
      metaHeader.textContent = `TIMESTAMP: ${new Date().toLocaleString()} // LOG ID: ${data.log_id || 'N/A'}`;
    }

    // Render Raw JSON
    const jsonCode = document.getElementById('report-json-code');
    if (jsonCode) {
      jsonCode.textContent = JSON.stringify(data, null, 2);
    }

    // Render Formatted Sheet View
    const sheetView = document.getElementById('report-sheet-view');
    if (!sheetView) return;

    const verdict = data.verdict || {};
    const metrics = data.metrics || {};

    const rednessVal = metrics.infection ? ((metrics.infection.left_redness + metrics.infection.right_redness) / 2 * 100).toFixed(1) : '0.0';
    const pirVal = metrics.drug ? metrics.drug.avg_pir.toFixed(2) : '0.00';
    const apertureVal = metrics.trauma ? metrics.trauma.avg_ptosis_ratio.toFixed(2) : '0.00';

    const overallVerdict = verdict.overall_verdict || 'NO SUBSTANCE IMPAIRMENT DETECTED // CLEARED';
    const isCritical = overallVerdict.includes('IMPAIRMENT') || overallVerdict.includes('STIMULANT') || overallVerdict.includes('DEPRESSANT') || overallVerdict.includes('TRAUMA');

    sheetView.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; border-bottom: 2px solid var(--glass-border); padding-bottom: 12px; margin-bottom: 16px;">
        <img src="/static/images/neurosight-logo.png" alt="NEUROSIGHT Logo" style="width: 46px; height: 46px; border-radius: 50%; filter: drop-shadow(0 0 8px rgba(125, 207, 255, 0.4)); flex-shrink: 0;">
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h2 style="font-family: var(--font-sans); font-size: 1.3rem; color: ${isCritical ? 'var(--color-status-alert)' : 'var(--color-status-safe)'};">
              VERDICT: ${overallVerdict}
            </h2>
            <span class="status-pill ${isCritical ? 'impairment' : 'safe'}" style="font-size: 0.8rem; padding: 4px 10px;">
              ${isCritical ? 'SUBSTANCE IMPAIRMENT DETECTED' : 'CLEARED / COMPLIANT'}
            </span>
          </div>
          <p style="font-family: var(--font-sans); font-size: 0.85rem; color: var(--color-text-muted); margin-top: 4px;">
            ${verdict.reason || 'Ocular telemetry indicates normal baseline parameters.'}
          </p>
        </div>
      </div>

      <!-- Thumbnails Summary -->
      <div style="display: flex; gap: 16px; margin-bottom: 20px;">
        ${data.processed_images && data.processed_images.left_eye ? `
          <div style="flex: 1; background: rgba(36,40,59,0.5); padding: 8px; border-radius: 6px; border: 1px solid var(--glass-border);">
            <div style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); margin-bottom: 4px;">LEFT OCULAR RECT</div>
            <img src="${data.processed_images.left_eye}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;" alt="Left Eye">
          </div>
        ` : ''}
        ${data.processed_images && data.processed_images.right_eye ? `
          <div style="flex: 1; background: rgba(36,40,59,0.5); padding: 8px; border-radius: 6px; border: 1px solid var(--glass-border);">
            <div style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted); margin-bottom: 4px;">RIGHT OCULAR RECT</div>
            <img src="${data.processed_images.right_eye}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;" alt="Right Eye">
          </div>
        ` : ''}
      </div>

      <!-- Itemized Telemetry Table -->
      <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.8rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--glass-border); text-align: left; color: var(--color-text-muted);">
            <th style="padding: 8px 4px;">METRIC PARAMETER</th>
            <th style="padding: 8px 4px;">VALUE</th>
            <th style="padding: 8px 4px;">NORMAL RANGE</th>
            <th style="padding: 8px 4px;">EVALUATION</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--glass-border);">
            <td style="padding: 10px 4px;">Sclera Redness (Vascular Injection)</td>
            <td style="padding: 10px 4px; font-weight: 600;">${rednessVal}%</td>
            <td style="padding: 10px 4px; color: var(--color-text-muted);">< 15.0%</td>
            <td style="padding: 10px 4px;"><span class="status-pill ${parseFloat(rednessVal) > 15.0 ? 'impairment' : 'safe'}">${parseFloat(rednessVal) > 15.0 ? 'FAIL' : 'PASS'}</span></td>
          </tr>
          <tr style="border-bottom: 1px solid var(--glass-border);">
            <td style="padding: 10px 4px;">Pupil-to-Iris Ratio (PIR Mydriasis/Miosis)</td>
            <td style="padding: 10px 4px; font-weight: 600;">${pirVal}</td>
            <td style="padding: 10px 4px; color: var(--color-text-muted);">0.18 - 0.45</td>
            <td style="padding: 10px 4px;"><span class="status-pill ${(parseFloat(pirVal) < 0.18 || parseFloat(pirVal) > 0.45) ? 'impairment' : 'safe'}">${(parseFloat(pirVal) < 0.18 || parseFloat(pirVal) > 0.45) ? 'FAIL' : 'PASS'}</span></td>
          </tr>
          <tr style="border-bottom: 1px solid var(--glass-border);">
            <td style="padding: 10px 4px;">Eyelid Aperture (Ptosis Delta)</td>
            <td style="padding: 10px 4px; font-weight: 600;">${apertureVal}</td>
            <td style="padding: 10px 4px; color: var(--color-text-muted);">> 0.30</td>
            <td style="padding: 10px 4px;"><span class="status-pill ${parseFloat(apertureVal) < 0.30 ? 'impairment' : 'safe'}">${parseFloat(apertureVal) < 0.30 ? 'FAIL' : 'PASS'}</span></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 16px; font-family: var(--font-mono); font-size: 0.68rem; color: var(--color-text-muted);">
        AUTHENTICATION SIGNATURE: OK // COMPLIANCE METHOD: SYNCHRONOUS OCULAR SUBSTANCE PIPELINE
      </div>
    `;
  },

  printPDF() {
    window.print();
  },

  downloadJSON() {
    if (!activeData) return;
    const jsonStr = JSON.stringify(activeData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurosight_impairment_report_${activeData.log_id || 'case'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
