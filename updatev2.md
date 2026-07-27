Act as a Principal UI/UX Architect, Creative Developer, and Senior Frontend Engineer specializing in military-grade dark-mode control hubs (Marvel JARVIS, Cyberpunk 2077, Datadog, and Raycast aesthetic standards). You possess expert-level mastery of CSS Grid sub-layouts, SVG path overlays, WebRTC camera feed manipulation, drag-and-drop file ingestion API, and dynamic DOM event binding.

Your core mission is to execute a total overhaul of the Ingress Control Matrix (`#01 // INGRESS CONTROL MATRIX` in `app/static/index.html`, `app/static/css/`, and `app/static/js/`). You will transform the static dropzone into an active tactical ingestion node featuring corner HUD reticles, instant sample dataset loader pills, a space-saving 3-column horizontal metadata toolbar, and a real-time WebRTC webcam alignment guide.

Execute this comprehensive implementation protocol across six granular phases:

================================================================================
PHASE 1: CONTAINER RESTRUCTURING & HUD DROPZONE DOM OVERHAUL
================================================================================
Reconstruct the DOM architecture of section `#01` to accommodate absolute HUD reticles, sample preset pills, and a compressed horizontal metadata toolbar.

1. **Section 01 HTML DOM Structure (`app/static/index.html`):**
   - Replace the existing `#01 // INGRESS CONTROL MATRIX` container block with the following HTML layout:
     ```html
     <section id="panel-ingress-container" class="ingress-panel">
         <!-- Panel Top Control Bar -->
         <div class="ingress-panel-header">
             <div class="panel-tag-group">
                 <span class="panel-num">01</span>
                 <h2 class="panel-title">// INGRESS CONTROL MATRIX</h2>
             </div>
             
             <!-- Mode Switcher Segmented Control -->
             <div class="ingress-mode-switcher" id="ingress-mode-selector">
                 <button type="button" class="mode-tab-btn is-active" data-mode="file">[FILE UPLOAD]</button>
                 <button type="button" class="mode-tab-btn" data-mode="webcam">[LIVE WEBCAM SCAN]</button>
             </div>
         </div>

         <!-- Primary Ingestion Viewfinder Container -->
         <div class="viewfinder-viewport" id="ingress-viewfinder">
             <!-- Mode 1: File Dropzone Surface -->
             <div class="dropzone-surface" id="file-dropzone-target">
                 <!-- Tactical Corner Reticle Brackets -->
                 <div class="reticle-bracket corner-tl"></div>
                 <div class="reticle-bracket corner-tr"></div>
                 <div class="reticle-bracket corner-bl"></div>
                 <div class="reticle-bracket corner-br"></div>

                 <!-- Central Scanning Laser Beam Overlay -->
                 <div class="vfx-laser-sweep" id="viewfinder-laser-sweep"></div>

                 <!-- Default Idle Message & Upload Trigger -->
                 <div class="dropzone-prompt-group" id="dropzone-idle-content">
                     <div class="prompt-icon-wrapper">
                         <svg class="icon-cloud-upload" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                             <path d="M16 16l-4-4m0 0l-4 4m4-4v12"></path>
                             <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                         </svg>
                     </div>
                     <h3 class="prompt-primary-title">SELECT OCULAR IMAGE FOR SUBSTANCE TELEMETRY</h3>
                     <p class="prompt-secondary-desc">Drag & drop raw PNG/JPG frames or click to browse filesystem</p>
                     
                     <!-- Quick-Test Sample Loader Pills -->
                     <div class="sample-presets-row" id="sample-presets-container">
                         <span class="preset-label">QUICK TEST SAMPLES:</span>
                         <button type="button" class="btn-sample-pill" data-sample="sober_baseline.png">SOBER BASELINE</button>
                         <button type="button" class="btn-sample-pill" data-sample="cns_depressant.png">CNS DEPRESSANT</button>
                         <button type="button" class="btn-sample-pill" data-sample="stimulant_miosis.png">STIMULANT / MIOSIS</button>
                     </div>
                 </div>

                 <!-- Hidden File Input Trigger -->
                 <input type="file" id="input-file-hidden" accept="image/png, image/jpeg, image/webp" class="file-input-hidden">

                 <!-- Active Image Frame Display (Hidden by Default) -->
                 <div class="preview-frame-container is-hidden" id="image-preview-wrapper">
                     <img id="preview-image-element" src="" alt="Ocular Ingress Preview">
                     <button type="button" id="btn-clear-frame" class="btn-frame-reset" title="Clear Frame">✕ CANCEL SCAN</button>
                 </div>
             </div>

             <!-- Mode 2: Live Webcam Surface (Hidden by Default) -->
             <div class="webcam-surface is-hidden" id="webcam-surface-target">
                 <video id="webcam-video-feed" autoplay playsinline muted></video>
                 <canvas id="webcam-frame-canvas" class="is-hidden"></canvas>
                 
                 <!-- Alignment SVG Overlay -->
                 <svg class="webcam-hud-overlay" viewBox="0 0 640 360">
                     <!-- Centered Pupil Tracking Oval -->
                     <ellipse cx="320" cy="180" rx="140" ry="85" class="hud-alignment-oval" />
                     <line x1="320" y1="20" x2="320" y2="340" class="hud-axis-line" />
                     <line x1="40" y1="180" x2="600" y2="180" class="hud-axis-line" />
                     <text x="320" y="295" class="hud-instruction-text" text-anchor="middle">ALIGN OCULAR CENTROID WITHIN TARGET</text>
                 </svg>

                 <div class="webcam-controls-bar">
                     <button type="button" id="btn-capture-webcam" class="btn-hud-action">CAPFRAME & ANALYZE</button>
                 </div>
             </div>
         </div>

         <!-- Horizontal 3-Column Metadata Toolbar -->
         <div class="ingress-metadata-toolbar">
             <!-- Column 1: Operator Badge -->
             <div class="meta-col">
                 <label for="meta-operator-badge" class="meta-label">OPERATOR BADGE ID</label>
                 <div class="meta-input-wrapper">
                     <span class="input-prefix-icon">👤</span>
                     <input type="text" id="meta-operator-badge" class="input-hud-text" value="OP-7392" maxlength="12" spellcheck="false">
                 </div>
             </div>

             <!-- Column 2: Incident Case Hash -->
             <div class="meta-col">
                 <label for="meta-case-hash" class="meta-label">INCIDENT CASE HASH</label>
                 <div class="meta-input-wrapper">
                     <input type="text" id="meta-case-hash" class="input-hud-text" value="CASE-8821" readonly>
                     <button type="button" id="btn-regen-case-hash" class="btn-input-icon" title="Generate New Case Hash">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                         </svg>
                     </button>
                 </div>
             </div>

             <!-- Column 3: Calibration Light Profile Switcher -->
             <div class="meta-col">
                 <label class="meta-label">CALIBRATION LIGHT PROFILE</label>
                 <div class="segmented-control-meta" id="light-profile-selector">
                     <button type="button" class="segment-btn-sm" data-profile="low_light">Low Light</button>
                     <button type="button" class="segment-btn-sm is-active" data-profile="artificial">Artificial</button>
                     <button type="button" class="segment-btn-sm" data-profile="sunlight">Sunlight</button>
                 </div>
             </div>
         </div>
     </section>
     ```

================================================================================
PHASE 2: CSS STYLING & CORNER RETICLE ANIMATIONS
================================================================================
Implement high-density CSS rules, corner reticle positioning, hover transitions, and laser sweep animations in `app/static/css/ingress.css`.

1. **Viewfinder & Corner Bracket Styling:**
   - Define exact position, dimensions, and transition constraints:
     ```css
     .ingress-panel {
         background: #24283b;
         border: 1px solid rgba(122, 162, 247, 0.18);
         border-radius: 12px;
         padding: 1.25rem;
         box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
     }

     .viewfinder-viewport {
         position: relative;
         width: 100%;
         height: 340px;
         background: #16161e;
         border: 1px dashed rgba(122, 162, 247, 0.25);
         border-radius: 8px;
         overflow: hidden;
         margin-top: 1rem;
         transition: border-color 0.3s ease, box-shadow 0.3s ease;
     }

     .viewfinder-viewport.drag-active {
         border-color: #7dcfff;
         background: rgba(125, 207, 255, 0.03);
         box-shadow: inset 0 0 20px rgba(125, 207, 255, 0.15);
     }

     /* Corner Bracket HUD Reticles */
     .reticle-bracket {
         position: absolute;
         width: 18px;
         height: 18px;
         border-color: #7dcfff;
         border-style: solid;
         pointer-events: none;
         z-index: 10;
         transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
     }

     .corner-tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
     .corner-tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
     .corner-bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
     .corner-br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }

     /* Contracting Bracket Effect on Drag Over */
     .viewfinder-viewport.drag-active .corner-tl { top: 6px; left: 6px; filter: drop-shadow(0 0 8px #7dcfff); }
     .viewfinder-viewport.drag-active .corner-tr { top: 6px; right: 6px; filter: drop-shadow(0 0 8px #7dcfff); }
     .viewfinder-viewport.drag-active .corner-bl { bottom: 6px; left: 6px; filter: drop-shadow(0 0 8px #7dcfff); }
     .viewfinder-viewport.drag-active .corner-br { bottom: 6px; right: 6px; filter: drop-shadow(0 0 8px #7dcfff); }
     ```

2. **Sample Loader Pill Styling:**
   - Style sample pills to sit neatly inside the dropzone prompt:
     ```css
     .sample-presets-row {
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 0.5rem;
         margin-top: 1.25rem;
         z-index: 15;
     }

     .preset-label {
         font-family: var(--font-mono, monospace);
         font-size: 0.65rem;
         color: #565f89;
         letter-spacing: 1px;
     }

     .btn-sample-pill {
         background: rgba(36, 40, 59, 0.8);
         border: 1px solid rgba(122, 162, 247, 0.25);
         border-radius: 14px;
         color: #7dcfff;
         font-family: var(--font-mono, monospace);
         font-size: 0.68rem;
         font-weight: 600;
         padding: 0.3rem 0.75rem;
         cursor: pointer;
         transition: all 0.2s ease;
     }

     .btn-sample-pill:hover {
         background: #2f354e;
         border-color: #bb9af7;
         color: #ffffff;
         box-shadow: 0 0 10px rgba(187, 154, 247, 0.3);
         transform: translateY(-1px);
     }
     ```

================================================================================
PHASE 3: HORIZONTAL METADATA TOOLBAR SUB-GRID
================================================================================
Compress the vertical metadata stack into a 3-column horizontal sub-grid to maximize screen space.

1. **Horizontal Metadata CSS Rules:**
   - Apply CSS Grid with fixed item heights and aligned baselines:
     ```css
     .ingress-metadata-toolbar {
         display: grid;
         grid-template-columns: 1fr 1fr 1.2fr;
         gap: 1.25rem;
         align-items: center;
         margin-top: 1rem;
         padding-top: 1rem;
         border-top: 1px solid rgba(122, 162, 247, 0.15);
     }

     .meta-col {
         display: flex;
         flex-direction: column;
         gap: 0.4rem;
     }

     .meta-label {
         font-family: var(--font-mono, monospace);
         font-size: 0.65rem;
         font-weight: 600;
         color: #565f89;
         letter-spacing: 1px;
     }

     .meta-input-wrapper {
         position: relative;
         display: flex;
         align-items: center;
         background: #16161e;
         border: 1px solid rgba(122, 162, 247, 0.2);
         border-radius: 6px;
         height: 36px;
         padding: 0 0.5rem;
     }

     .input-hud-text {
         background: transparent;
         border: none;
         color: #c0caf5;
         font-family: var(--font-mono, monospace);
         font-size: 0.8rem;
         width: 100%;
         outline: none;
     }

     .segmented-control-meta {
         display: flex;
         background: #16161e;
         border: 1px solid rgba(122, 162, 247, 0.2);
         border-radius: 6px;
         height: 36px;
         padding: 2px;
         gap: 2px;
     }

     .segment-btn-sm {
         flex: 1;
         background: transparent;
         border: none;
         color: #565f89;
         font-family: var(--font-mono, monospace);
         font-size: 0.72rem;
         font-weight: 600;
         border-radius: 4px;
         cursor: pointer;
         transition: all 0.2s ease;
     }

     .segment-btn-sm.is-active {
         background: #2f354e;
         color: #7dcfff;
     }
     ```

================================================================================
PHASE 4: WEBCAM OVERLAY & ALIGNMENT GUIDE
================================================================================
Implement the webcam video surface styling and HUD alignment guide overlay.

1. **Webcam Surface & HUD Overlay Styling:**
   - Overlay SVG over WebRTC video feed:
     ```css
     .webcam-surface {
         position: relative;
         width: 100%;
         height: 100%;
         display: flex;
         align-items: center;
         justify-content: center;
     }

     #webcam-video-feed {
         width: 100%;
         height: 100%;
         object-fit: cover;
     }

     .webcam-hud-overlay {
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 100%;
         pointer-events: none;
         z-index: 12;
     }

     .hud-alignment-oval {
         fill: none;
         stroke: #7dcfff;
         stroke-width: 2;
         stroke-dasharray: 8 6;
         filter: drop-shadow(0 0 6px #7dcfff);
         animation: rotateHudPulse 4s linear infinite;
     }

     .hud-axis-line {
         stroke: rgba(125, 207, 255, 0.25);
         stroke-width: 1;
         stroke-dasharray: 4 4;
     }

     .hud-instruction-text {
         fill: #7dcfff;
         font-family: var(--font-mono, monospace);
         font-size: 0.75rem;
         font-weight: 700;
         letter-spacing: 1.5px;
     }

     .webcam-controls-bar {
         position: absolute;
         bottom: 1rem;
         z-index: 20;
     }
     ```

================================================================================
PHASE 5: JAVASCRIPT INGESTION & EVENT BINDING ENGINE
================================================================================
Construct `app/static/js/ingress.js` to handle drag-and-drop ingestion, sample loader clicks, case hash generation, light profile switching, and webcam capture.

1. **Core Ingress Controller Script (`ingress.js`):**
   - Implement event handling logic:
     ```javascript
     class IngressController {
         constructor() {
             this.initDOM();
             this.bindDropzoneEvents();
             this.bindSamplePills();
             this.bindMetadataEvents();
             this.bindModeSwitcher();
             this.webcamStream = null;
         }

         initDOM() {
             this.viewport = document.getElementById('ingress-viewfinder');
             this.dropzone = document.getElementById('file-dropzone-target');
             this.fileInput = document.getElementById('input-file-hidden');
             this.idleContent = document.getElementById('dropzone-idle-content');
             this.previewWrapper = document.getElementById('image-preview-wrapper');
             this.previewImage = document.getElementById('preview-image-element');
             this.btnClearFrame = document.getElementById('btn-clear-frame');
             
             this.webcamSurface = document.getElementById('webcam-surface-target');
             this.webcamVideo = document.getElementById('webcam-video-feed');
             this.btnCaptureWebcam = document.getElementById('btn-capture-webcam');

             this.caseHashInput = document.getElementById('meta-case-hash');
             this.btnRegenHash = document.getElementById('btn-regen-case-hash');
             this.operatorInput = document.getElementById('meta-operator-badge');
         }

         bindDropzoneEvents() {
             // Click to trigger browse
             this.dropzone.addEventListener('click', (e) => {
                 if (e.target.closest('.btn-sample-pill') || e.target.closest('#btn-clear-frame')) return;
                 this.fileInput.click();
             });

             this.fileInput.addEventListener('change', (e) => {
                 if (e.target.files && e.target.files[0]) {
                     this.processFileIngestion(e.target.files[0]);
                 }
             });

             // Drag & Drop event handlers
             ['dragenter', 'dragover'].forEach(eventName => {
                 this.viewport.addEventListener(eventName, (e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     this.viewport.classList.add('drag-active');
                 });
             });

             ['dragleave', 'drop'].forEach(eventName => {
                 this.viewport.addEventListener(eventName, (e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     this.viewport.classList.remove('drag-active');
                 });
             });

             this.viewport.addEventListener('drop', (e) => {
                 const dt = e.dataTransfer;
                 if (dt.files && dt.files[0]) {
                     this.processFileIngestion(dt.files[0]);
                 }
             });

             this.btnClearFrame?.addEventListener('click', () => this.resetIngestionView());
         }

         bindSamplePills() {
             document.querySelectorAll('.btn-sample-pill').forEach(btn => {
                 btn.addEventListener('click', (e) => {
                     e.stopPropagation();
                     const sampleFileName = btn.dataset.sample;
                     this.loadSampleImage(`/static/samples/${sampleFileName}`);
                 });
             });
         }

         async loadSampleImage(sampleUrl) {
             try {
                 const response = await fetch(sampleUrl);
                 const blob = await response.blob();
                 const file = new File([blob], "sample_eye.png", { type: "image/png" });
                 this.processFileIngestion(file);
             } catch (err) {
                 console.error("Failed to load sample dataset frame:", err);
             }
         }

         processFileIngestion(file) {
             const reader = new FileReader();
             reader.onload = (e) => {
                 this.previewImage.src = e.target.result;
                 this.idleContent.classList.add('is-hidden');
                 this.previewWrapper.classList.remove('is-hidden');
                 
                 // Trigger global detection pipeline
                 if (window.triggerDetectionPipeline) {
                     window.triggerDetectionPipeline(file, this.getMetadataPayload());
                 }
             };
             reader.readAsDataURL(file);
         }

         resetIngestionView() {
             this.previewImage.src = '';
             this.previewWrapper.classList.add('is-hidden');
             this.idleContent.classList.remove('is-hidden');
             this.fileInput.value = '';
         }

         bindMetadataEvents() {
             this.btnRegenHash?.addEventListener('click', () => {
                 const randomHash = 'CASE-' + Math.floor(1000 + Math.random() * 9000);
                 this.caseHashInput.value = randomHash;
             });

             document.querySelectorAll('#light-profile-selector .segment-btn-sm').forEach(btn => {
                 btn.addEventListener('click', () => {
                     document.querySelectorAll('#light-profile-selector .segment-btn-sm').forEach(b => b.classList.remove('is-active'));
                     btn.classList.add('is-active');
                     window.currentLightProfile = btn.dataset.profile;
                 });
             });
         }

         bindModeSwitcher() {
             document.querySelectorAll('#ingress-mode-selector .mode-tab-btn').forEach(btn => {
                 btn.addEventListener('click', () => {
                     const mode = btn.dataset.mode;
                     document.querySelectorAll('#ingress-mode-selector .mode-tab-btn').forEach(b => b.classList.remove('is-active'));
                     btn.classList.add('is-active');

                     if (mode === 'webcam') {
                         this.dropzone.classList.add('is-hidden');
                         this.webcamSurface.classList.remove('is-hidden');
                         this.startWebcamStream();
                     } else {
                         this.webcamSurface.classList.add('is-hidden');
                         this.dropzone.classList.remove('is-hidden');
                         this.stopWebcamStream();
                     }
                 });
             });
         }

         async startWebcamStream() {
             try {
                 this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
                 this.webcamVideo.srcObject = this.webcamStream;
             } catch (err) {
                 alert("Unable to access local webcam device.");
             }
         }

         stopWebcamStream() {
             if (this.webcamStream) {
                 this.webcamStream.getTracks().forEach(track => track.stop());
                 this.webcamStream = null;
             }
         }

         getMetadataPayload() {
             return {
                 operator_id: this.operatorInput.value,
                 case_hash: this.caseHashInput.value,
                 light_profile: window.currentLightProfile || 'artificial'
             };
         }
     }

     document.addEventListener('DOMContentLoaded', () => {
         window.ingressModule = new IngressController();
     });
     ```

================================================================================
PHASE 6: VERIFICATION & TESTING
================================================================================
1. Verify dragging a file over the dropzone triggers corner brackets contracting inward with a cyan glow (`#7dcfff`).
2. Test clicking any `QUICK TEST SAMPLES` pill to ensure the sample image loads into the preview frame instantly without opening the OS file browser.
3. Confirm the metadata toolbar fits neatly across 3 horizontal columns without wrapping or breaking layout.
4. Toggle `[LIVE WEBCAM SCAN]` to verify the SVG alignment oval overlays the active video feed.