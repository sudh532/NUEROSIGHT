/**
 * Core Application Coordinator and State Manager for Aegis-Eye
 * Refactored for Drug and Substance Impairment Detection.
 */
import { Api } from './api.js';
import { Canvas3D } from './view/canvas3d.js';
import { Elements } from './view/elements.js';
import { Archive } from './view/archive.js';
import { IndexedDB } from './database/indexed_db.js';
import { SoundEngine } from './audio.js';
import { Webcam } from './webcam.js';
import { ReportModal } from './report_modal.js';
import { SettingsManager } from './settings.js';
import { VFXBackground } from './vfx-background.js';
import { textScrambler } from './vfx-text-scramble.js';

// UI State Enum
const UIState = {
  IDLE: 'IDLE',
  FILE_SELECTED: 'FILE_SELECTED',
  UPLOADING: 'UPLOADING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
};

const App = {
  currentState: UIState.IDLE,
  vfxBg: null,
  state: {
    activeTab: 'diagnosis', // 'diagnosis' | 'archive'
    activeMode: 'file', // 'file' | 'webcam'
    theme: 'dark',
    selectedFile: null,
    operatorId: 'OP-7392',
    caseId: 'CASE-8821',
    lightingProfile: 'artificial',
    isProcessing: false,
    lastScanId: null,
    lastScreeningData: null
  },

  init() {
    this.vfxBg = new VFXBackground();
    SettingsManager.init();
    this.cacheElements();
    this.bindEvents();
    Archive.bindPurgeAllEvents();
    this.checkSystemHealth();
    this.loadArchives();
    this.registerServiceWorker();
    this.setState(UIState.IDLE);
  },

  cacheElements() {
    this.dom = {
      html: document.documentElement,
      themeToggle: document.getElementById('theme-toggle'),
      audioToggleBtn: document.getElementById('audio-toggle-btn'),
      audioStatusLabel: document.getElementById('audio-status-label'),
      tabDiagnosisBtn: document.getElementById('btn-tab-diagnosis'),
      tabArchivesBtn: document.getElementById('btn-tab-archives'),
      viewDiagnosis: document.getElementById('view-tab-diagnosis'),
      viewArchives: document.getElementById('view-tab-archives'),
      
      // Ingress Form & Mode Toggles
      inputModeBtns: document.querySelectorAll('.mode-toggle-btn'),
      dropzone: document.getElementById('dropzone-matrix'),
      webcamMatrix: document.getElementById('webcam-matrix'),
      webcamVideo: document.getElementById('webcam-preview'),
      btnCaptureFrame: document.getElementById('btn-capture-frame'),
      shutterFlash: document.getElementById('shutter-flash'),

      operatorInput: document.getElementById('input-badge-id'),
      caseInput: document.getElementById('input-case-id'),
      lightSwitches: document.querySelectorAll('.btn-light-profile'),
      
      fileInput: document.getElementById('file-ingress') || document.getElementById('ocular-input'),
      btnRemovePhoto: document.getElementById('btn-remove-photo'),
      dropzoneText: document.getElementById('dropzone-text-label'),
      dropzoneSubtext: document.getElementById('dropzone-subtext-label'),
      loadingOverlay: document.getElementById('loading-overlay'),
      loadingStatusText: document.getElementById('loading-status-text'),
      loadingSubtext: document.getElementById('loading-subtext'),
      
      // Eye split panel
      eyeSplitWrapper: document.getElementById('eye-split-wrapper') || document.querySelector('.ocular-split-segmentation'),
      leftEyePanel: document.getElementById('left-eye-container'),
      rightEyePanel: document.getElementById('right-eye-container'),
      leftEyeImg: document.getElementById('crop-left-eye') || document.getElementById('left-eye-img'),
      rightEyeImg: document.getElementById('crop-right-eye') || document.getElementById('right-eye-img'),
      scannerContainers: document.querySelectorAll('.hud-scanner-container'),
      
      // Telemetry Output
      telemetryPanel: document.getElementById('telemetry-panel'),
      verdictBlock: document.getElementById('verdict-block'),
      verdictHeader: document.getElementById('verdict-header'),
      verdictReason: document.getElementById('verdict-reason'),
      verdictRiskVal: document.getElementById('verdict-risk-value'),
      verdictConfVal: document.getElementById('verdict-conf-value'),
      
      // Audit Auth configuration
      authOperatorInput: document.getElementById('auth-username'),
      authPassInput: document.getElementById('auth-password'),
      authSaveBtn: document.getElementById('auth-save-btn'),
      authIndicator: document.getElementById('auth-indicator-dot'),
      authText: document.getElementById('auth-text-label'),
      exportReportBtn: document.getElementById('btn-export-report')
    };
  },

  setState(newState, payload = {}) {
    this.currentState = newState;
    console.log(`[Aegis State Machine] State transition: -> ${newState}`);

    switch (newState) {
      case UIState.IDLE:
        this.resetUIState();
        break;

      case UIState.FILE_SELECTED:
        if (this.dom.dropzoneText) {
          this.dom.dropzoneText.textContent = payload.fileName || 'FILE SELECTED';
          this.dom.dropzoneSubtext.textContent = `${(payload.fileSize / 1024).toFixed(1)} KB - Ready for Substance Telemetry`;
        }
        break;

      case UIState.UPLOADING:
        this.setLoadingUI(true, "Establishing Secure Connection...", "Verifying payload encryption...");
        break;

      case UIState.PROCESSING:
        this.setLoadingUI(true, "Extracting Biometric Mesh...", "Analyzing sclera polygons & pupil dynamics...");
        break;

      case UIState.SUCCESS:
        this.setLoadingUI(false);
        if (this.dom.dropzone) {
          this.dom.dropzone.classList.remove('panel-error-flash');
          this.dom.dropzone.classList.remove('is-scanning');
        }
        break;

      case UIState.ERROR:
        this.setLoadingUI(false);
        if (this.dom.dropzone) this.dom.dropzone.classList.remove('is-scanning');
        this.triggerErrorUI(payload.message || 'Substance impairment screening execution failed.');
        break;
    }
  },

  bindEvents() {
    // Theme toggle
    if (this.dom.themeToggle) {
      this.dom.themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Tab Navigation
    if (this.dom.tabDiagnosisBtn) {
      this.dom.tabDiagnosisBtn.addEventListener('click', () => {
        this.switchTab('diagnosis');
      });
    }
    if (this.dom.tabArchivesBtn) {
      this.dom.tabArchivesBtn.addEventListener('click', () => {
        this.switchTab('archive');
      });
    }

    // Input Mode Segmented Toggle Switch
    this.dom.inputModeBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetMode = btn.getAttribute('data-mode');
        this.switchInputMode(targetMode);
      });
    });

    // Webcam Frame Capture Trigger
    if (this.dom.btnCaptureFrame) {
      this.dom.btnCaptureFrame.addEventListener('click', () => this.handleWebcamCapture());
    }

    // Floating Remove Image Action Button Trigger
    if (this.dom.btnRemovePhoto) {
      this.dom.btnRemovePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePhoto();
      });
    }

    // Dropzone Click & Drag Events
    if (this.dom.dropzone && this.dom.fileInput) {
      this.dom.dropzone.addEventListener('click', () => this.dom.fileInput.click());
      
      const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) this.handleFileSelection(file);
      };

      this.dom.fileInput.addEventListener('change', handleFileChange);
      
      const ocularInput = document.getElementById('ocular-input');
      if (ocularInput && ocularInput !== this.dom.fileInput) {
        ocularInput.addEventListener('change', handleFileChange);
      }

      ['dragenter', 'dragover'].forEach(eventName => {
        this.dom.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dom.dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dom.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dom.dropzone.classList.remove('dragover');
        });
      });

      this.dom.dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileSelection(e.dataTransfer.files[0]);
        }
      });
    }

    // Export Compliance Report
    if (this.dom.exportReportBtn) {
      this.dom.exportReportBtn.addEventListener('click', () => {
        if (this.state.lastScreeningData) {
          ReportModal.open(this.state.lastScreeningData);
        } else {
          this.exportCurrentReport();
        }
      });
    }

    // Ingress Forms inputs synchronization
    if (this.dom.operatorInput) {
      this.dom.operatorInput.addEventListener('input', (e) => {
        this.state.operatorId = e.target.value;
      });
    }

    if (this.dom.caseInput) {
      this.dom.caseInput.addEventListener('input', (e) => {
        this.state.caseId = e.target.value;
      });
    }

    // Light switch configurations & profile filters
    this.dom.lightSwitches.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.lightSwitches.forEach(b => {
          b.classList.remove('active');
          b.removeAttribute('data-active');
          b.style.borderColor = 'var(--glass-border)';
          b.style.color = 'var(--color-text-muted)';
        });
        
        btn.classList.add('active');
        btn.setAttribute('data-active', 'true');
        btn.style.borderColor = 'var(--color-accent-purple)';
        btn.style.color = 'var(--color-accent-purple)';
        
        const profile = btn.getAttribute('data-profile');
        this.state.lightingProfile = profile;

        // Apply real-time visual CSS filter to preview image
        this.applyProfileFilter(profile);

        // Auto re-analyze image if already loaded
        if (this.state.selectedFile && !this.state.isProcessing) {
          this.runIngressScreening();
        }
      });
    });

    // Quick Time Range Selector Pills
    document.querySelectorAll('.range-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const range = btn.getAttribute('data-range');
        Archive.setTimeRange(range);
      });
    });

    // Dataset Curve Toggle Legend Pills
    document.querySelectorAll('.legend-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dsIndex = parseInt(btn.getAttribute('data-dataset'), 10);
        Archive.toggleDataset(dsIndex);
      });
    });

    // Audit Table Category Status Pills
    document.querySelectorAll('.table-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const cat = pill.getAttribute('data-category');
        Archive.setCategoryFilter(cat);
      });
    });

    // Archive authentication updates
    if (this.dom.authSaveBtn) {
      this.dom.authSaveBtn.addEventListener('click', () => {
        const u = this.dom.authOperatorInput.value;
        const p = this.dom.authPassInput.value;
        Api.setCredentials(u, p);
        this.loadArchives();
      });
    }
  },

  async switchInputMode(mode) {
    if (this.state.activeMode === mode) return;
    this.state.activeMode = mode;

    this.dom.inputModeBtns.forEach(b => {
      if (b.getAttribute('data-mode') === mode) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    if (mode === 'webcam') {
      if (this.dom.dropzone) this.dom.dropzone.style.display = 'none';
      if (this.dom.webcamMatrix) this.dom.webcamMatrix.style.display = 'flex';
      if (this.dom.btnCaptureFrame) this.dom.btnCaptureFrame.style.display = 'block';

      try {
        await Webcam.startStream(this.dom.webcamVideo);
      } catch (err) {
        alert(err.message || 'Webcam access failed.');
        this.switchInputMode('file');
      }
    } else {
      Webcam.stopStream();
      if (this.dom.dropzone) this.dom.dropzone.style.display = 'flex';
      if (this.dom.webcamMatrix) this.dom.webcamMatrix.style.display = 'none';
      if (this.dom.btnCaptureFrame) this.dom.btnCaptureFrame.style.display = 'none';
    }
  },

  async handleWebcamCapture() {
    try {
      if (this.dom.shutterFlash) {
        this.dom.shutterFlash.classList.add('trigger-flash');
        setTimeout(() => this.dom.shutterFlash.classList.remove('trigger-flash'), 350);
      }

      const blob = await Webcam.captureFrame(this.dom.webcamVideo);
      const file = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' });
      
      this.handleFileSelection(file);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Frame capture failed.');
    }
  },

  toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    this.dom.html.setAttribute('data-theme', this.state.theme);
    
    if (this.state.activeTab === 'archive') {
      this.loadArchives();
    }
  },

  switchTab(tabName) {
    if (this.state.activeTab === tabName) return;
    this.state.activeTab = tabName;

    const diagnosisView = this.dom.viewDiagnosis || document.getElementById('view-tab-diagnosis') || document.getElementById('diagnosis-view');
    const archivesView = this.dom.viewArchives || document.getElementById('view-tab-archives') || document.getElementById('archives-view');

    if (tabName === 'diagnosis') {
      if (this.dom.tabDiagnosisBtn) {
        this.dom.tabDiagnosisBtn.classList.add('active', 'is-active');
        this.dom.tabDiagnosisBtn.setAttribute('aria-selected', 'true');
      }
      if (this.dom.tabArchivesBtn) {
        this.dom.tabArchivesBtn.classList.remove('active', 'is-active');
        this.dom.tabArchivesBtn.setAttribute('aria-selected', 'false');
      }
      if (archivesView) archivesView.style.display = 'none';
      if (diagnosisView) diagnosisView.style.display = 'grid';
    } else {
      if (typeof Webcam !== 'undefined' && Webcam.stopStream) Webcam.stopStream();
      this.switchInputMode('file');
      if (this.dom.tabDiagnosisBtn) {
        this.dom.tabDiagnosisBtn.classList.remove('active', 'is-active');
        this.dom.tabDiagnosisBtn.setAttribute('aria-selected', 'false');
      }
      if (this.dom.tabArchivesBtn) {
        this.dom.tabArchivesBtn.classList.add('active', 'is-active');
        this.dom.tabArchivesBtn.setAttribute('aria-selected', 'true');
      }
      if (diagnosisView) diagnosisView.style.display = 'none';
      if (archivesView) archivesView.style.display = 'grid';
      this.loadArchives();
    }
  },

  async checkSystemHealth() {
    try {
      const info = await Api.getHealth();
      const statusElement = document.getElementById('runtime-status-label');
      if (statusElement) {
        statusElement.textContent = `SYSTEM OPERATIONAL // V${info.version || '2.0.0'} // TARGET: CONNECTED`;
      }
    } catch (e) {
      const statusElement = document.getElementById('runtime-status-label');
      if (statusElement) {
        statusElement.textContent = `SYSTEM DIAGNOSTICS OFFLINE`;
      }
    }
  },

  removePhoto() {
    // 1. Input Container Reset
    const previewImg = document.getElementById('diagnostic-image-view');
    if (previewImg) {
      previewImg.style.display = 'none';
      previewImg.src = '';
      previewImg.style.filter = 'none';
    }

    if (this.dom.btnRemovePhoto) {
      this.dom.btnRemovePhoto.style.display = 'none';
    }

    const fileInput1 = document.getElementById('file-ingress');
    const fileInput2 = document.getElementById('ocular-input');
    if (fileInput1) fileInput1.value = '';
    if (fileInput2) fileInput2.value = '';

    if (this.dom.dropzoneText) {
      this.dom.dropzoneText.textContent = 'SELECT OCULAR IMAGE FOR SUBSTANCE TELEMETRY';
    }
    if (this.dom.dropzoneSubtext) {
      this.dom.dropzoneSubtext.textContent = 'Drag & drop raw PNG/JPG frames or click to browse';
    }

    // Clear state files & data
    this.state.selectedFile = null;
    this.state.lastScanId = null;
    this.state.lastScreeningData = null;

    // 2. Ocular Segmentation Reset
    if (this.dom.eyeSplitWrapper) {
      this.dom.eyeSplitWrapper.style.display = 'none';
    }
    if (this.dom.leftEyeImg) this.dom.leftEyeImg.src = '';
    if (this.dom.rightEyeImg) this.dom.rightEyeImg.src = '';

    Canvas3D.clearAllTrackers();

    // 3. Telemetry Panel Reversion (Right Column)
    Elements.resetTelemetryPanel();

    if (this.dom.telemetryPanel) {
      this.dom.telemetryPanel.classList.remove('is-active', 'is-processing', 'state-critical', 'state-verified');
      this.dom.telemetryPanel.classList.add('is-idle');
    }

    this.setState(UIState.IDLE);

    // 4. Resource Cleanup & Acoustic Click Chime
    if (this.state.objectUrl) {
      URL.revokeObjectURL(this.state.objectUrl);
      this.state.objectUrl = null;
    }

    if (this.state.activeMode === 'webcam') {
      Webcam.stopStream();
      this.switchInputMode('file');
    }

    SoundEngine.playClick();
  },

  handleFileSelection(file) {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.setState(UIState.ERROR, { message: 'Invalid payload format. Aegis ingress accepts only JPEG, PNG, or WEBP image frames.' });
      return;
    }

    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      this.setState(UIState.ERROR, { message: 'File size exceeds maximum 10MB limit.' });
      return;
    }

    this.state.selectedFile = file;

    // Trigger Camera Shutter Flash Burst & Chromatic Glitch (cinematic.md Phase 2)
    const flash = document.getElementById('vfx-shutter-flash');
    const container = document.getElementById('dropzone-matrix');
    if (flash) {
      flash.classList.add('is-trigger-flash');
      setTimeout(() => flash.classList.remove('is-trigger-flash'), 350);
    }
    if (container) {
      container.classList.add('chromatic-glitch');
      setTimeout(() => container.classList.remove('chromatic-glitch'), 200);
    }

    const previewImg = document.getElementById('diagnostic-image-view');
    if (previewImg) {
      if (this.state.objectUrl) URL.revokeObjectURL(this.state.objectUrl);
      this.state.objectUrl = URL.createObjectURL(file);
      previewImg.src = this.state.objectUrl;
      previewImg.style.display = 'block';
      this.applyProfileFilter(this.state.lightingProfile);
    }
    if (this.dom.btnRemovePhoto) {
      this.dom.btnRemovePhoto.style.display = 'block';
    }

    this.setState(UIState.FILE_SELECTED, { fileName: file.name, fileSize: file.size });
    
    this.runIngressScreening();
  },

  applyProfileFilter(profile) {
    const previewImg = document.getElementById('diagnostic-image-view');
    if (!previewImg) return;

    if (profile === 'low_light') {
      previewImg.style.filter = 'brightness(130%) contrast(125%) saturate(110%)';
    } else if (profile === 'sunlight') {
      previewImg.style.filter = 'brightness(85%) contrast(140%) saturate(90%)';
    } else if (profile === 'artificial') {
      previewImg.style.filter = 'brightness(100%) contrast(105%) hue-rotate(-5deg)';
    } else {
      previewImg.style.filter = 'none';
    }
  },

  async runIngressScreening() {
    if (!this.state.selectedFile || this.state.isProcessing) return;

    this.state.isProcessing = true;
    this.setState(UIState.UPLOADING);

    const formData = new FormData();
    formData.append('image', this.state.selectedFile);
    formData.append('operator_id', this.state.operatorId);
    formData.append('case_id', this.state.caseId);
    formData.append('lighting_profile', this.state.lightingProfile);
    formData.append('calibration_profile', this.state.lightingProfile);

    try {
      this.setState(UIState.PROCESSING);
      const response = await Api.runScreening(formData);
      if (response.task_id) {
        this.pollTaskStatus(response.task_id);
      } else {
        this.renderScreeningResult(response);
        this.setState(UIState.SUCCESS);
        this.state.isProcessing = false;
      }
    } catch (error) {
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || !navigator.onLine)) {
        console.warn('[Aegis App] Ingress failed on live API route, falling back to local IndexedDB caching:', error);
        this.handleOfflineUpload();
      } else {
        this.setState(UIState.ERROR, { message: error.message || 'An error occurred during ocular tracking.' });
        this.state.isProcessing = false;
      }
    }
  },

  async handleOfflineUpload() {
    try {
      const file = this.state.selectedFile;
      const reader = new FileReader();
      
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const scanData = {
          operator_id: this.state.operatorId,
          case_id: this.state.caseId,
          lighting_profile: this.state.lightingProfile,
          image_base64: reader.result,
          filename: file.name
        };
        
        await IndexedDB.savePendingScan(scanData);
        
        if (this.dom.dropzoneText) this.dom.dropzoneText.textContent = "OFFLINE CACHE SECURED";
        if (this.dom.dropzoneSubtext) this.dom.dropzoneSubtext.textContent = "Scan staged locally. Auto-sync will flush queue on reconnection.";
        this.setLoadingUI(false);
        this.state.isProcessing = false;
        
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-scans');
            console.log('[Aegis App] Registered background sync tag: sync-scans');
          } catch (syncErr) {
            console.warn('[Aegis App] Sync registration failed:', syncErr);
          }
        }
      };
    } catch (e) {
      console.error('[Aegis App] Offline cache transaction failure:', e);
      this.setState(UIState.ERROR, { message: 'Local staging error: IndexedDB database is unavailable.' });
      this.state.isProcessing = false;
    }
  },

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[Aegis App] ServiceWorker registered with scope:', registration.scope);
      } catch (err) {
        console.warn('[Aegis App] ServiceWorker registration failed:', err);
      }
    }
  },

  async pollTaskStatus(taskId) {
    const pollInterval = 1000;
    const maxRetries = 40;
    let retries = 0;
    
    const interval = setInterval(async () => {
      try {
        const response = await Api.getTaskStatus(taskId);
        
        if (response.status === 'SUCCESS') {
          clearInterval(interval);
          this.renderScreeningResult(response.result);
          this.setState(UIState.SUCCESS);
          this.state.isProcessing = false;
        } else if (response.status === 'FAILURE') {
          clearInterval(interval);
          this.setState(UIState.ERROR, { message: `Asynchronous processing failed: ${response.error}` });
          this.state.isProcessing = false;
        } else if (response.status === 'PROCESSING') {
          this.setLoadingUI(true, "Extracting Biometric Mesh...", response.progress || "Analyzing frames on worker thread...");
        }
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          clearInterval(interval);
          this.setState(UIState.ERROR, { message: 'Verification timed out. Background queue error.' });
          this.state.isProcessing = false;
        }
      }
    }, pollInterval);
  },

  setLoadingUI(show, title = "Establishing Secure Connection...", subtext = "Extracting Biometric Mesh...") {
    const overlay = this.dom.loadingOverlay || document.getElementById('loading-overlay');
    const previewImg = document.getElementById('diagnostic-image-view');
    const statusText = document.getElementById('loading-status-text');
    const statusSubtext = document.getElementById('loading-subtext');
    const scanners = document.querySelectorAll('.hud-scanner-container');

    if (show) {
      if (overlay) overlay.style.display = 'flex';
      if (previewImg) previewImg.style.display = 'none';
      if (statusText) statusText.textContent = title;
      if (statusSubtext) statusSubtext.textContent = subtext;
      if (this.dom.dropzone) this.dom.dropzone.classList.add('is-scanning');
      if (this.dom.telemetryPanel) {
        this.dom.telemetryPanel.classList.add('is-processing');
        this.dom.telemetryPanel.classList.remove('is-idle');
      }
      scanners.forEach(s => s.classList.add('is-scanning'));
      SoundEngine.playScanSound();
    } else {
      if (overlay) overlay.style.display = 'none';
      if (this.dom.dropzone) this.dom.dropzone.classList.remove('is-scanning');
      if (this.dom.telemetryPanel) {
        this.dom.telemetryPanel.classList.remove('is-processing');
      }
      scanners.forEach(s => s.classList.remove('is-scanning'));
    }
  },

  triggerErrorUI(errorMessage) {
    if (this.dom.dropzone) {
      this.dom.dropzone.classList.add('panel-error-flash');
      this.dom.dropzone.classList.remove('is-scanning');
    }
    const scanners = document.querySelectorAll('.hud-scanner-container');
    scanners.forEach(s => s.classList.remove('is-scanning'));

    if (this.dom.telemetryPanel) {
      this.dom.telemetryPanel.classList.add('state-critical');
      this.dom.telemetryPanel.classList.remove('state-verified');
      this.dom.telemetryPanel.classList.remove('is-idle');
      this.dom.telemetryPanel.classList.remove('is-processing');
    }
    if (this.dom.verdictHeader) {
      this.dom.verdictHeader.style.color = 'var(--color-accent-red)';
      this.dom.verdictHeader.textContent = 'SYSTEM INGRESS ERROR';
    }
    if (this.dom.verdictReason) {
      this.dom.verdictReason.textContent = errorMessage;
    }
    if (this.dom.dropzoneText) {
      this.dom.dropzoneText.textContent = 'INGRESS FAILURE';
    }
    if (this.dom.dropzoneSubtext) {
      this.dom.dropzoneSubtext.textContent = errorMessage;
    }
  },

  resetUIState() {
    this.setLoadingUI(false);
    document.body.className = '';
    if (this.dom.dropzone) {
      this.dom.dropzone.classList.remove('panel-error-flash');
      this.dom.dropzone.classList.remove('is-scanning');
    }
    const scanners = document.querySelectorAll('.hud-scanner-container');
    scanners.forEach(s => s.classList.remove('is-scanning'));

    Elements.resetTelemetryPanel();
  },

  renderScreeningResult(data) {
    console.log("NEUROSIGHT API Response Payload:", data);
    console.log("Is Impaired:", data.is_impaired, "Category:", data.category);

    this.state.lastScanId = data.log_id || null;
    this.state.lastScreeningData = data;
    
    if (this.dom.exportReportBtn) {
      this.dom.exportReportBtn.style.display = 'block';
    }

    const previewImg = document.getElementById('diagnostic-image-view');
    if (previewImg && data.processed_image) {
      previewImg.src = `data:image/jpeg;base64,${data.processed_image}`;
      previewImg.style.display = 'block';
      this.applyProfileFilter(this.state.lightingProfile);
    }
    if (this.dom.btnRemovePhoto) {
      this.dom.btnRemovePhoto.style.display = 'block';
    }

    if (this.dom.eyeSplitWrapper && data.processed_images) {
      this.dom.eyeSplitWrapper.style.display = 'block';
      if (this.dom.leftEyeImg) this.dom.leftEyeImg.src = data.processed_images.left_eye;
      if (this.dom.rightEyeImg) this.dom.rightEyeImg.src = data.processed_images.right_eye;
    }

    Canvas3D.clearAllTrackers();
    Canvas3D.initReticle('left-eye-container', true);
    Canvas3D.initReticle('right-eye-container', false);
    SoundEngine.playLockSound();

    const verdict = data.verdict || {};
    const category = (data.category || verdict.category || 'NONE').toUpperCase();
    const isImpaired = (data.is_impaired !== undefined ? data.is_impaired : (verdict.is_impaired !== undefined ? verdict.is_impaired : false)) || (category !== 'NONE' && category !== 'NORMAL');
    const rawConfidence = data.confidence !== undefined ? data.confidence : (verdict.confidence !== undefined ? verdict.confidence : 1.0);
    const confidencePct = (rawConfidence * 100).toFixed(2);
    const rawRisk = data.risk_score !== undefined ? data.risk_score : (verdict.risk_score !== undefined ? verdict.risk_score : 0.0);
    const riskScore = isImpaired ? rawRisk.toFixed(2) : '0.00';

    // Find outer telemetry card element
    const outerCard = document.getElementById('panel-telemetry-container')
                   || document.getElementById('telemetry-panel')
                   || document.querySelector('.telemetry-outer-card')
                   || document.querySelector('.telemetry-panel')
                   || document.querySelectorAll('section')[1];

    if (outerCard) {
      outerCard.classList.remove('is-idle', 'is-processing', 'state-standby', 'state-safe', 'state-critical', 'state-impaired');
      outerCard.classList.add('is-active');

      if (isImpaired) {
        // RED BORDER & GLOW (SUBSTANCE DETECTED)
        outerCard.classList.add('state-impaired', 'state-critical');
        outerCard.style.setProperty('border', '1.5px solid #f7768e', 'important');
        outerCard.style.setProperty('box-shadow', '0 0 25px rgba(247, 118, 142, 0.35), inset 0 0 10px rgba(247, 118, 142, 0.15)', 'important');
      } else {
        // GREEN BORDER & GLOW (NO SUBSTANCE DETECTED)
        outerCard.classList.add('state-safe');
        outerCard.style.setProperty('border', '1.5px solid #9ece6a', 'important');
        outerCard.style.setProperty('box-shadow', '0 0 25px rgba(158, 206, 106, 0.35), inset 0 0 10px rgba(158, 206, 106, 0.15)', 'important');
      }
    } else {
      console.error("NEUROSIGHT DEBUG: Could not locate telemetry card element in DOM!");
    }

    // Apply Perimeter Alert Beacon (cinematic.md Phase 4)
    if (isImpaired) {
      document.body.className = 'vfx-alert-beacon';
      SoundEngine.playAlertSound();
    } else {
      document.body.className = 'vfx-safe-beacon';
      SoundEngine.playVerified();
    }

    const userSettings = SettingsManager.getSettings();
    if (isImpaired && userSettings.autoExportCritical) {
      ReportModal.open(data);
    }

    if (this.dom.verdictHeader) {
      if (!isImpaired || category === 'NONE' || category === 'NORMAL') {
        this.dom.verdictHeader.style.setProperty('color', '#9ece6a', 'important');
        Elements.animateTicker(this.dom.verdictHeader, 'NO SUBSTANCE IMPAIRMENT DETECTED');
      } else {
        this.dom.verdictHeader.style.setProperty('color', '#f7768e', 'important');
        Elements.animateTicker(this.dom.verdictHeader, `SUBSTANCE IMPAIRMENT DETECTED - CATEGORY: ${category}`);
      }
    }
    
    if (this.dom.verdictReason) {
      if (!isImpaired || category === 'NONE' || category === 'NORMAL') {
        Elements.animateTicker(this.dom.verdictReason, `Ocular telemetry falls within standard baseline physiological parameters (confidence: ${confidencePct}%).`);
      } else {
        Elements.animateTicker(this.dom.verdictReason, `Tabular LightGBM predicted high probability of chemical narcotic impairment (confidence: ${confidencePct}%).`);
      }
    }
    
    const riskVal = parseFloat(data.risk_score !== undefined ? data.risk_score : (data.risk !== undefined ? data.risk : riskScore));
    const riskBadge = document.getElementById('telemetry-risk-badge') || document.querySelector('.risk-badge');

    if (this.dom.verdictRiskVal) {
      this.dom.verdictRiskVal.textContent = riskVal.toFixed(2);
    }

    if (riskBadge) {
      riskBadge.textContent = `RISK: ${riskVal.toFixed(2)}`;
      if (riskVal <= 0.30) {
        riskBadge.style.setProperty('color', '#9ece6a', 'important');
        riskBadge.style.setProperty('border-color', '#9ece6a', 'important');
        riskBadge.style.setProperty('background', 'rgba(158, 206, 106, 0.15)', 'important');
      } else {
        riskBadge.style.setProperty('color', '#f7768e', 'important');
        riskBadge.style.setProperty('border-color', '#f7768e', 'important');
        riskBadge.style.setProperty('background', 'rgba(247, 118, 142, 0.15)', 'important');
      }
    }

    if (this.dom.verdictConfVal) {
      this.dom.verdictConfVal.textContent = rawConfidence.toFixed(2);
    }

    const metrics = data.metrics;
    if (metrics) {
      Elements.updateRedness(metrics.infection.left_redness, metrics.infection.right_redness);
      Elements.updatePupil(
        metrics.drug.avg_pir,
        metrics.drug.left_pir !== undefined ? metrics.drug.left_pir : metrics.drug.avg_pir,
        metrics.drug.right_pir !== undefined ? metrics.drug.right_pir : metrics.drug.avg_pir
      );
      Elements.updateEyelids(
        metrics.trauma.avg_ptosis_ratio,
        metrics.trauma.left_ptosis_ratio !== undefined ? metrics.trauma.left_ptosis_ratio : metrics.trauma.avg_ptosis_ratio,
        metrics.trauma.right_ptosis_ratio !== undefined ? metrics.trauma.right_ptosis_ratio : metrics.trauma.avg_ptosis_ratio
      );

      // Trigger Text Scrambling Telemetry Readout Engine (cinematic.md Phase 3)
      const rednessVal = document.getElementById('redness-value');
      const pupilVal = document.getElementById('pupil-value');
      const eyelidVal = document.getElementById('eyelid-value');
      const avgRedness = (metrics.infection.left_redness + metrics.infection.right_redness) / 2.0;

      if (rednessVal) textScrambler.scramble(rednessVal, `${(avgRedness * 100).toFixed(1)}%`);
      if (pupilVal) textScrambler.scramble(pupilVal, metrics.drug.avg_pir.toFixed(2));
      if (eyelidVal) textScrambler.scramble(eyelidVal, metrics.trauma.avg_ptosis_ratio.toFixed(2));
    }

    this.loadArchives();
  },

  async loadArchives() {
    try {
      const response = await Api.getTrends();
      if (this.dom.authIndicator) this.dom.authIndicator.className = 'auth-status-dot';
      if (this.dom.authText) this.dom.authText.textContent = 'TELEMETRY VAULT CONNECTED';
      
      Archive.renderTrends(response.fleet);
      Archive.renderAuditTable(response.fleet);
    } catch (e) {
      console.error('[Aegis App] Failed to load trends:', e);
      if (this.dom.authIndicator) this.dom.authIndicator.className = 'auth-status-dot error';
      if (this.dom.authText) this.dom.authText.textContent = 'ACCESS LOCKED / UNAUTHORIZED';
      
      Archive.renderTrends([]);
      Archive.renderAuditTable([]);
    }
  },

  async exportCurrentReport() {
    if (!this.state.lastScanId) return;
    try {
      this.dom.exportReportBtn.textContent = "GENERATING REPORT...";
      const response = await fetch(`/api/documents/export-report/${this.state.lastScanId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to generate compliance report.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neurosight_impairment_report_${this.state.lastScanId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Report generation failed.');
    } finally {
      this.dom.exportReportBtn.textContent = "EXPORT COMPLIANCE REPORT (PDF)";
    }
  }
};

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  window.mainApp = App;
  window.triggerDetectionPipeline = (file, meta) => App.submitFrame(file);
  window.updateTelemetryPanel = (data) => App.renderScreeningResult(data);
  window.updateVerdictUI = (data) => App.renderScreeningResult(data);
  App.init();
});
