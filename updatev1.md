Act as a Principal UI/UX Architect, Data Visualization Engineer, and Senior Frontend Developer specializing in high-density enterprise dark-mode diagnostic systems (Linear, Vercel, Datadog, and Raycast aesthetic standards). You possess deep expertise in dynamic CSS Grid layouts, SVG-based range spectrum meters, dynamic state logic handling, and real-time DOM manipulation.

Your core mission is to completely refactor the telemetry diagnostic panel (`#02 // BIOMETRIC TELEMETRY & IMPAIRMENT ANALYSIS` in `app/static/index.html`, `app/static/css/`, and `app/static/js/`). You will resolve the logic contradiction where un-impaired scans display red warning headers, eliminate vast empty space inside the metric cards by introducing threshold spectrum bars and raw biomarker sub-data, and clean up the header action controls.

Execute this comprehensive refactoring protocol across six granular phases:

================================================================================
PHASE 1: CONDITIONAL STATE LOGIC & VERDICT CONTAINER OVERHAUL
================================================================================
Eliminate contradictory UI states by creating strict conditional rendering routines based on backend classification payloads (`is_impaired`, `category`, and `confidence`).

1. **Diagnostic Container DOM Restructuring (`index.html`):**
   - Refactor `#panel-telemetry-container` to isolate the header action row, verdict banner, and metric stack:
     ```html
     <section id="panel-telemetry-container" class="telemetry-panel state-standby">
         <!-- Panel Top Header Bar -->
         <div class="panel-header-row">
             <span class="panel-id-tag">02 // BIOMETRIC TELEMETRY & IMPAIRMENT ANALYSIS</span>
             <button id="btn-export-pdf" class="btn-icon-action" title="Export Forensic Audit PDF">
                 <svg class="icon-pdf" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                     <polyline points="14 2 14 8 20 8"></polyline>
                     <line x1="16" y1="13" x2="8" y2="13"></line>
                     <line x1="16" y1="17" x2="8" y2="17"></line>
                     <polyline points="10 9 9 9 8 9"></polyline>
                 </svg>
                 <span>EXPORT PDF</span>
             </button>
         </div>

         <!-- Verdict Banner Block -->
         <div class="verdict-banner-container" id="verdict-banner">
             <h2 class="verdict-title" id="verdict-title">SYSTEM STANDBY</h2>
             <p class="verdict-summary" id="verdict-summary">
                 Ingest an eye or facial image in the ingress dropzone to trigger the forensic impairment pipeline.
             </p>
             <div class="verdict-badges-row">
                 <div class="status-badge" id="badge-risk">RISK: <span class="badge-val">--</span></div>
                 <div class="status-badge" id="badge-confidence">CONFIDENCE: <span class="badge-val">--</span></div>
             </div>
         </div>

         <!-- Metric Cards Stack -->
         <div class="metrics-stack" id="metrics-stack">
             <!-- Metric Item 1: Sclera Redness -->
             <!-- Metric Item 2: Pupil-to-Iris Ratio -->
             <!-- Metric Item 3: Eyelid Aperture -->
         </div>

         <footer class="panel-notice-footer">
             NOTICE: NEUROSIGHT provides physical Fit-For-Duty screening and ocular stress/substance estimation based on pupil dynamics and scleral vascularity.
         </footer>
     </section>
     ```

2. **Conditional State CSS Tokens (`app/static/css/telemetry.css`):**
   - Define explicit visual states for `.state-standby`, `.state-safe`, and `.state-critical`:
     ```css
     .telemetry-panel {
         background: #24283b;
         border: 1px solid rgba(122, 162, 247, 0.18);
         border-radius: 12px;
         padding: 1.5rem;
         box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
         transition: border-color 0.4s ease, box-shadow 0.4s ease;
     }

     /* SAFE / CLEAR STATE */
     .telemetry-panel.state-safe {
         border-color: rgba(158, 206, 106, 0.5);
         box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 20px rgba(158, 206, 106, 0.15);
     }
     .telemetry-panel.state-safe .verdict-title {
         color: #9ece6a;
         text-shadow: 0 0 12px rgba(158, 206, 106, 0.3);
     }

     /* CRITICAL / IMPAIRED STATE */
     .telemetry-panel.state-critical {
         border-color: rgba(247, 118, 142, 0.6);
         box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 25px rgba(247, 118, 142, 0.22);
     }
     .telemetry-panel.state-critical .verdict-title {
         color: #f7768e;
         text-shadow: 0 0 12px rgba(247, 118, 142, 0.3);
     }

     /* STANDBY STATE */
     .telemetry-panel.state-standby .verdict-title {
         color: #7dcfff;
     }
     ```

3. **JavaScript Response Handler Refactor (`telemetry-render.js`):**
   - Bind the backend `/api/detect` response payload to update colors and text conditionally:
     ```javascript
     function updateTelemetryPanel(apiPayload) {
         const panel = document.getElementById('panel-telemetry-container');
         const titleEl = document.getElementById('verdict-title');
         const summaryEl = document.getElementById('verdict-summary');
         const riskValEl = document.querySelector('#badge-risk .badge-val');
         const confValEl = document.querySelector('#badge-confidence .badge-val');

         const isImpaired = apiPayload.is_impaired || (apiPayload.category && apiPayload.category !== 'NONE');
         const category = apiPayload.category || 'NONE';
         const confidencePct = (apiPayload.confidence * 100).toFixed(1);

         // Reset panel classes
         panel.classList.remove('state-standby', 'state-safe', 'state-critical');

         if (!isImpaired || category === 'NONE') {
             // NO IMPAIRMENT STATE
             panel.classList.add('state-safe');
             titleEl.textContent = 'NO SUBSTANCE IMPAIRMENT DETECTED';
             summaryEl.textContent = `Ocular telemetry falls within standard baseline parameters (LightGBM confidence: ${confidencePct}%).`;
         } else {
             // IMPAIRMENT DETECTED STATE
             panel.classList.add('state-critical');
             titleEl.textContent = `SUBSTANCE IMPAIRMENT DETECTED - CATEGORY: ${category.toUpperCase()}`;
             summaryEl.textContent = `Tabular LightGBM predicted high probability of chemical narcotic impairment (confidence: ${confidencePct}%).`;
         }

         // Update Badges
         riskValEl.textContent = apiPayload.risk_score ? apiPayload.risk_score.toFixed(2) : (isImpaired ? '1.00' : '0.00');
         confValEl.textContent = apiPayload.confidence ? apiPayload.confidence.toFixed(2) : '1.00';

         // Render Enriched Metric Cards
         renderMetricCards(apiPayload.metrics);
     }
     ```

================================================================================
PHASE 2: ENRICHED MULTI-COLUMN METRIC CARD ARCHITECTURE
================================================================================
Reconstruct each metric item card into a 3-column container to eliminate dead space and display threshold spectrum bars and raw biomarker calculations.

1. **3-Column Grid CSS Layout:**
   - Define metric item wrapper styling:
     ```css
     .metrics-stack {
         display: flex;
         flex-direction: column;
         gap: 1.25rem;
         margin: 1.5rem 0;
     }

     .metric-card {
         background: #1f2335;
         border: 1px solid rgba(122, 162, 247, 0.15);
         border-radius: 10px;
         padding: 1.25rem;
         display: grid;
         grid-template-columns: 110px minmax(220px, 1fr) 220px;
         gap: 1.25rem;
         align-items: center;
         transition: border-color 0.2s ease, background 0.2s ease;
     }

     .metric-card:hover {
         border-color: rgba(122, 162, 247, 0.35);
         background: rgba(31, 35, 53, 0.85);
     }
     ```

2. **Column 1: Radial Gauge Dial Container (`.metric-col-gauge`):**
   - Render a centered 90px x 90px circular gauge dial wrapper:
     ```html
     <div class="metric-col-gauge">
         <div class="radial-gauge-wrapper">
             <canvas id="gauge-sclera" width="90" height="90"></canvas>
             <span class="gauge-center-val" id="val-sclera">6.7%</span>
         </div>
     </div>
     ```

3. **Column 2: Label & Spectrum Bar (`.metric-col-spectrum`):**
   - Display title, status tag, and a horizontal spectrum threshold track:
     ```html
     <div class="metric-col-spectrum">
         <div class="metric-label-row">
             <span class="metric-title">SCLERA REDNESS RATIO</span>
             <span class="metric-status-tag tag-safe" id="status-sclera">NORMAL VASCULAR PATTERN</span>
         </div>
         
         <!-- Spectrum Bar Track -->
         <div class="spectrum-bar-container">
             <div class="spectrum-track">
                 <div class="spectrum-zone zone-normal" title="Normal: 0-12%"></div>
                 <div class="spectrum-zone zone-elevated" title="Elevated: 12-25%"></div>
                 <div class="spectrum-zone zone-critical" title="Critical: 25%+"></div>
                 
                 <!-- Dynamic Pointer Indicator -->
                 <div class="spectrum-pointer" id="pointer-sclera" style="left: 22.3%;">
                     <div class="pointer-head"></div>
                     <div class="pointer-line"></div>
                 </div>
             </div>
             <div class="spectrum-labels-row">
                 <span>0%</span>
                 <span>12%</span>
                 <span>25%</span>
                 <span>50%+</span>
             </div>
         </div>
     </div>
     ```

4. **Spectrum Bar CSS Tokens:**
   - Style multi-zone threshold indicators:
     ```css
     .spectrum-track {
         position: relative;
         height: 8px;
         border-radius: 4px;
         background: #16161e;
         display: flex;
         overflow: hidden;
         margin-top: 0.6rem;
     }

     .spectrum-zone.zone-normal { flex: 0.24; background: rgba(158, 206, 106, 0.35); }
     .spectrum-zone.zone-elevated { flex: 0.26; background: rgba(224, 175, 104, 0.35); }
     .spectrum-zone.zone-critical { flex: 0.50; background: rgba(247, 118, 142, 0.35); }

     .spectrum-pointer {
         position: absolute;
         top: -3px;
         width: 2px;
         height: 14px;
         background: #ffffff;
         box-shadow: 0 0 8px #7dcfff;
         transition: left 0.8s cubic-bezier(0.16, 1, 0.3, 1);
         z-index: 5;
     }

     .pointer-head {
         position: absolute;
         top: -4px;
         left: -3px;
         width: 8px;
         height: 8px;
         background: #7dcfff;
         border-radius: 50%;
     }

     .spectrum-labels-row {
         display: flex;
         justify-content: space-between;
         font-family: var(--font-mono, monospace);
         font-size: 0.65rem;
         color: #565f89;
         margin-top: 0.35rem;
     }
     ```

5. **Column 3: Biomarker Sub-Data Panel (`.metric-col-details`):**
   - Render raw computer vision calculated parameters:
     ```html
     <div class="metric-col-details">
         <div class="detail-box">
             <div class="detail-row">
                 <span class="detail-key">Vascular Density:</span>
                 <span class="detail-val" id="raw-sclera-density">0.067</span>
             </div>
             <div class="detail-row">
                 <span class="detail-key">Injected Area:</span>
                 <span class="detail-val" id="raw-sclera-area">12.4%</span>
             </div>
             <div class="detail-row">
                 <span class="detail-key">Chroma Variance:</span>
                 <span class="detail-val" id="raw-sclera-chroma">±0.03</span>
             </div>
         </div>
     </div>
     ```

================================================================================
PHASE 3: HEADER ACTION BAR & BADGE PILLS CLEANUP
================================================================================
Replace stretched PDF buttons with a compact action bar and transform risk/confidence parameters into inline badge pills.

1. **Compact Icon Button Styling:**
   - Style `#btn-export-pdf`:
     ```css
     .panel-header-row {
         display: flex;
         align-items: center;
         justify-content: space-between;
         margin-bottom: 1rem;
         padding-bottom: 0.75rem;
         border-bottom: 1px solid rgba(122, 162, 247, 0.12);
     }

     .btn-icon-action {
         display: inline-flex;
         align-items: center;
         gap: 0.5rem;
         background: rgba(122, 162, 247, 0.12);
         border: 1px solid rgba(122, 162, 247, 0.3);
         color: #7dcfff;
         font-family: var(--font-mono, monospace);
         font-size: 0.75rem;
         font-weight: 600;
         padding: 0.45rem 0.85rem;
         border-radius: 6px;
         cursor: pointer;
         transition: all 0.2s ease;
     }

     .btn-icon-action:hover {
         background: rgba(125, 207, 255, 0.22);
         border-color: #7dcfff;
         color: #ffffff;
         box-shadow: 0 0 10px rgba(125, 207, 255, 0.25);
     }
     ```

2. **Pill Badges Layout:**
   - Style inline status badges:
     ```css
     .verdict-badges-row {
         display: flex;
         gap: 0.75rem;
         margin-top: 1rem;
     }

     .status-badge {
         background: rgba(22, 22, 30, 0.7);
         border: 1px solid rgba(122, 162, 247, 0.2);
         border-radius: 20px;
         padding: 0.3rem 0.85rem;
         font-family: var(--font-mono, monospace);
         font-size: 0.75rem;
         color: #a9b1d6;
         display: flex;
         align-items: center;
         gap: 0.4rem;
     }

     .status-badge .badge-val {
         color: #ffffff;
         font-weight: 700;
     }
     ```

================================================================================
PHASE 4: METRIC SPECTRUM POINTER CALCULATION LOGIC
================================================================================
Implement dynamic math handlers in JS to map numeric telemetry values to spectrum pointer percentages (`0%` to `100%`).

1. **Spectrum Mapping Logic (`telemetry-render.js`):**
   - Write helper function `mapValueToSpectrumPercent(val, minVal, maxVal)`:
     ```javascript
     function calculatePointerPosition(metricKey, rawValue) {
         let min = 0, max = 100;
         
         if (metricKey === 'sclera') {
             // Range 0% to 50%
             min = 0; max = 0.50;
         } else if (metricKey === 'pir') {
             // Range 0.10 to 0.50 (PIR)
             min = 0.10; max = 0.50;
         } else if (metricKey === 'aperture') {
             // Range 0.10 to 0.60
             min = 0.10; max = 0.60;
         }

         let normalized = (rawValue - min) / (max - min);
         // Clamp between 2% and 98% so pointer stays within track
         let clampedPercent = Math.min(Math.max(normalized * 100, 2), 98);
         return `${clampedPercent.toFixed(1)}%`;
     }

     function renderMetricCards(metrics) {
         if (!metrics) return;

         // Sclera Pointer
         const scleraPtr = document.getElementById('pointer-sclera');
         if (scleraPtr && metrics.sclera_redness !== undefined) {
             scleraPtr.style.left = calculatePointerPosition('sclera', metrics.sclera_redness);
         }

         // PIR Pointer
         const pirPtr = document.getElementById('pointer-pir');
         if (pirPtr && metrics.pir !== undefined) {
             pirPtr.style.left = calculatePointerPosition('pir', metrics.pir);
         }

         // Aperture Pointer
         const aperturePtr = document.getElementById('pointer-aperture');
         if (aperturePtr && metrics.aperture !== undefined) {
             aperturePtr.style.left = calculatePointerPosition('aperture', metrics.aperture);
         }
     }
     ```

================================================================================
PHASE 5: VERIFICATION & AUDIT
================================================================================
1. Confirm that scanning clean eyes (`category: NONE` or `is_impaired: false`) triggers green borders (`.state-safe`) and cyan title text, resolving the false alert bug.
2. Confirm that all metric cards utilize 100% of their container width across 3 distinct columns (Gauge Dial, Spectrum Bar, Raw Biomarkers).
3. Verify that spectrum pointers animate smoothly across threshold boundaries (`0% - 100%`) upon API response arrival.
4. Ensure `[EXPORT PDF]` sits neatly in the upper-right corner without stretching across the card body.