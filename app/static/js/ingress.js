/**
 * Ingress Control Matrix Engine (updatev2.md)
 * Bulletproof file handling, explicit manual scan button & automatic inference trigger.
 */
window.currentSelectedFile = null;

export class IngressController {
  constructor() {
    this.initDOM();
    this.bindDropzoneEvents();
    this.bindSamplePills();
    this.bindMetadataEvents();
    this.bindModeSwitcher();
    this.bindWebcamEvents();
    this.webcamStream = null;
  }

  initDOM() {
    this.viewport = document.getElementById('ingress-viewfinder') || document.getElementById('dropzone-matrix');
    this.dropzone = document.getElementById('file-dropzone-target') || document.getElementById('dropzone-matrix');
    this.fileInput = document.getElementById('input-file-hidden') || document.getElementById('file-ingress');
    this.idleContent = document.getElementById('dropzone-idle-content') || document.getElementById('dropzone-text-label');
    this.previewWrapper = document.getElementById('image-preview-wrapper') || this.dropzone;
    this.previewImage = document.getElementById('preview-image-element') || document.getElementById('diagnostic-image-view');
    this.btnRunScan = document.getElementById('btn-run-scan');
    this.btnClearFrame = document.getElementById('btn-clear-frame') || document.getElementById('btn-remove-photo');
    
    this.webcamSurface = document.getElementById('webcam-surface-target') || document.getElementById('webcam-matrix');
    this.webcamVideo = document.getElementById('webcam-video-feed') || document.getElementById('webcam-preview');
    this.webcamCanvas = document.getElementById('webcam-frame-canvas');
    this.btnCaptureWebcam = document.getElementById('btn-capture-webcam') || document.getElementById('btn-capture-frame');

    this.caseHashInput = document.getElementById('meta-case-hash') || document.getElementById('input-case-id');
    this.btnRegenHash = document.getElementById('btn-regen-case-hash');
    this.operatorInput = document.getElementById('meta-operator-badge') || document.getElementById('input-badge-id');
  }

  bindDropzoneEvents() {
    // 1. File Selection Handler
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelection(e.target.files[0]);
        }
      });
    }

    // Click on dropzone to trigger file input
    if (this.dropzone) {
      this.dropzone.addEventListener('click', (e) => {
        if (e.target.closest('.btn-sample-pill') || e.target.closest('#btn-run-scan') || e.target.closest('#btn-clear-frame') || e.target.closest('#btn-remove-photo')) return;
        if (this.fileInput) this.fileInput.click();
      });
    }

    // 2. Drag and Drop Handlers
    const targetViewport = this.viewport || this.dropzone;
    if (targetViewport) {
      ['dragenter', 'dragover'].forEach(eventName => {
        targetViewport.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          targetViewport.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        targetViewport.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          targetViewport.classList.remove('drag-active');
        });
      });

      targetViewport.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files && dt.files[0]) {
          this.handleFileSelection(dt.files[0]);
        }
      });
    }

    // 3. Manual Scan Button Click
    if (this.btnRunScan) {
      this.btnRunScan.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.currentSelectedFile) {
          this.executeBackendInference(window.currentSelectedFile);
        } else {
          alert("Please select or drop an ocular image first.");
        }
      });
    }

    // 4. Cancel/Reset Button
    if (this.btnClearFrame) {
      this.btnClearFrame.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetIngestionView();
      });
    }
  }

  handleFileSelection(file) {
    console.log("NEUROSIGHT DEBUG: File selected ->", file.name, file.size, file.type);
    window.currentSelectedFile = file;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (this.previewImage) {
        this.previewImage.src = e.target.result;
        this.previewImage.style.display = 'block';
      }
      if (this.idleContent) {
        this.idleContent.classList.add('is-hidden');
      }
      if (this.previewWrapper && this.previewWrapper !== this.dropzone) {
        this.previewWrapper.classList.remove('is-hidden');
      }

      // Automatically trigger backend inference
      this.executeBackendInference(file);
    };
    reader.readAsDataURL(file);
  }

  async executeBackendInference(file) {
    console.log("NEUROSIGHT DEBUG: Executing fetch('/api/detect')...");
    if (!file) return;

    const laserSweep = document.getElementById('viewfinder-laser-sweep') || document.getElementById('vfx-laser-sweep');
    if (laserSweep) laserSweep.classList.add('is-scanning');

    const formData = new FormData();
    // Support both 'file' and 'image' keys in backend route
    formData.append('file', file);
    formData.append('image', file);
    formData.append('operator_id', this.operatorInput?.value || document.getElementById('meta-operator-badge')?.value || 'OP-7392');
    formData.append('case_hash', this.caseHashInput?.value || document.getElementById('meta-case-hash')?.value || 'CASE-8821');

    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        body: formData
      });

      console.log("NEUROSIGHT DEBUG: HTTP Response Status:", response.status);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      console.log("NEUROSIGHT DEBUG: API Response Data Received:", data);

      // Populate Real-Time Ocular Split Crops (webcam.md Phase 3)
      updateOcularCrops(data);

      // Dispatch global scan completion event for Section 03 Archives auto-sync
      window.dispatchEvent(new CustomEvent('neuroScanComplete', { detail: data }));

      // Update Section 02 Telemetry Panel
      if (typeof window.updateTelemetryPanel === 'function') {
        window.updateTelemetryPanel(data);
      } else if (typeof window.updateVerdictUI === 'function') {
        window.updateVerdictUI(data);
      } else if (window.mainApp && typeof window.mainApp.renderScreeningResult === 'function') {
        window.mainApp.renderScreeningResult(data);
      } else {
        console.error("NEUROSIGHT ERROR: Neither updateTelemetryPanel nor updateVerdictUI function exists!");
      }

    } catch (err) {
      console.error("NEUROSIGHT PIPELINE FAILURE:", err);
      alert(`Detection Error: ${err.message}`);
    } finally {
      if (laserSweep) laserSweep.classList.remove('is-scanning');
    }
  }

  resetIngestionView() {
    window.currentSelectedFile = null;
    if (this.previewImage) {
      this.previewImage.src = '';
      this.previewImage.style.display = 'none';
    }
    if (this.previewWrapper && this.previewWrapper !== this.dropzone) {
      this.previewWrapper.classList.add('is-hidden');
    }
    if (this.idleContent) {
      this.idleContent.classList.remove('is-hidden');
    }
    if (this.fileInput) {
      this.fileInput.value = '';
    }

    if (window.mainApp && typeof window.mainApp.clearPhoto === 'function') {
      window.mainApp.clearPhoto();
    }
  }

  bindSamplePills() {
    document.querySelectorAll('.btn-sample-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sampleType = btn.dataset.sample || btn.textContent.trim();
        this.generateSyntheticSampleFrame(sampleType);
      });
    });
  }

  generateSyntheticSampleFrame(sampleType) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#16161e';
    ctx.fillRect(0, 0, 640, 480);

    const drawEye = (cx, cy, pupilRadius, irisColor, rednessIntensity) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 100, 60, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#f0f2f5';
      ctx.fill();

      if (rednessIntensity > 0) {
        ctx.strokeStyle = `rgba(247, 118, 142, ${rednessIntensity})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * 35, cy + Math.sin(angle) * 20);
          ctx.lineTo(cx + Math.cos(angle) * 90, cy + Math.sin(angle) * 50);
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, 2 * Math.PI);
      ctx.fillStyle = irisColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#7dcfff';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, pupilRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f0f16';
      ctx.fill();
    };

    if (sampleType.includes('depressant') || sampleType.includes('CNS DEPRESSANT')) {
      drawEye(220, 240, 10, '#3b4261', 0.65);
      drawEye(420, 240, 10, '#3b4261', 0.65);
    } else if (sampleType.includes('stimulant') || sampleType.includes('STIMULANT')) {
      drawEye(220, 240, 28, '#24283b', 0.2);
      drawEye(420, 240, 28, '#24283b', 0.2);
    } else {
      drawEye(220, 240, 18, '#414868', 0.05);
      drawEye(420, 240, 18, '#414868', 0.05);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${sampleType.replace(/[^a-z0-9]/gi, '_')}.png`, { type: 'image/png' });
        this.handleFileSelection(file);
      }
    }, 'image/png');
  }

  bindMetadataEvents() {
    if (this.btnRegenHash && this.caseHashInput) {
      this.btnRegenHash.addEventListener('click', (e) => {
        e.stopPropagation();
        const randomHash = 'CASE-' + Math.floor(1000 + Math.random() * 9000);
        this.caseHashInput.value = randomHash;
      });
    }

    document.querySelectorAll('#light-profile-selector .segment-btn-sm, #calibration-light-profile .btn-light-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.parentElement;
        parent.querySelectorAll('button').forEach(b => b.classList.remove('is-active', 'active'));
        btn.classList.add('is-active', 'active');
        window.currentLightProfile = btn.dataset.profile;
        if (window.mainApp) window.mainApp.state.lightingProfile = btn.dataset.profile;
      });
    });
  }

  bindModeSwitcher() {
    document.querySelectorAll('#ingress-mode-selector button, #input-mode-toggle-bar button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.dataset.mode;
        const parent = btn.parentElement;
        parent.querySelectorAll('button').forEach(b => b.classList.remove('is-active', 'active'));
        btn.classList.add('is-active', 'active');

        if (mode === 'webcam') {
          if (this.dropzone) this.dropzone.classList.add('is-hidden');
          if (this.webcamSurface) {
            this.webcamSurface.classList.remove('is-hidden');
            this.webcamSurface.style.display = 'flex';
          }
          this.startWebcamStream();
        } else {
          if (this.webcamSurface) {
            this.webcamSurface.classList.add('is-hidden');
            this.webcamSurface.style.display = 'none';
          }
          if (this.dropzone) this.dropzone.classList.remove('is-hidden');
          this.stopWebcamStream();
        }
      });
    });
  }

  bindWebcamEvents() {
    if (this.btnCaptureWebcam) {
      this.btnCaptureWebcam.addEventListener('click', (e) => {
        e.stopPropagation();
        this.captureWebcamFrame();
      });
    }
  }

  async startWebcamStream() {
    try {
      const videoElement = this.webcamVideo || document.getElementById('webcam-video-feed') || document.getElementById('webcam-preview');
      let canvasElement = document.getElementById('webcam-canvas');

      if (!canvasElement && this.webcamSurface) {
        canvasElement = document.createElement('canvas');
        canvasElement.id = 'webcam-canvas';
        canvasElement.className = 'webcam-tracking-canvas';
        this.webcamSurface.appendChild(canvasElement);
      }

      if (typeof Camera !== 'undefined' && typeof FaceMesh !== 'undefined' && videoElement && canvasElement) {
        initDynamicEyeTracking(videoElement, canvasElement);
      } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        if (videoElement) {
          videoElement.srcObject = this.webcamStream;
        }
      }
    } catch (err) {
      console.warn("Unable to access local webcam device:", err);
    }
  }

  stopWebcamStream() {
    if (camera) {
      try { camera.stop(); } catch (e) {}
      camera = null;
    }
    if (faceMesh) {
      try { faceMesh.close(); } catch (e) {}
      faceMesh = null;
    }
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
  }

  captureWebcamFrame() {
    const videoElement = this.webcamVideo || document.getElementById('webcam-video-feed') || document.getElementById('webcam-preview');
    if (!videoElement) return;
    const canvas = this.webcamCanvas || document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Stop webcam hardware tracks cleanly
    this.stopWebcamStream();

    // Hide webcam surface and switch to single snapshot preview card
    if (this.webcamSurface) {
      this.webcamSurface.classList.add('is-hidden');
      this.webcamSurface.style.display = 'none';
    }
    if (this.dropzone) {
      this.dropzone.classList.remove('is-hidden');
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `webcam_scan_${Date.now()}.png`, { type: 'image/png' });
        this.handleFileSelection(file);
      }
    }, 'image/png');
  }

  getMetadataPayload() {
    return {
      operator_id: this.operatorInput ? this.operatorInput.value : 'OP-7392',
      case_hash: this.caseHashInput ? this.caseHashInput.value : 'CASE-8821',
      light_profile: window.currentLightProfile || 'artificial'
    };
  }
}

let faceMesh = null;
let camera = null;

export function initDynamicEyeTracking(videoElement, canvasElement) {
    if (!videoElement || !canvasElement) return;
    const ctx = canvasElement.getContext('2d');

    if (typeof FaceMesh === 'undefined') {
        console.warn("MediaPipe FaceMesh script not loaded.");
        return;
    }

    if (faceMesh) {
        try { faceMesh.close(); } catch (e) {}
    }
    if (camera) {
        try { camera.stop(); } catch (e) {}
    }

    faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

    faceMesh.onResults((results) => {
        // Sync canvas size with video
        canvasElement.width = videoElement.videoWidth || 640;
        canvasElement.height = videoElement.videoHeight || 360;
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // Left Eye landmarks (e.g. 33, 133) & Right Eye landmarks (e.g. 362, 263)
            const leftEyeX = landmarks[33].x * canvasElement.width;
            const leftEyeY = landmarks[33].y * canvasElement.height;
            const rightEyeX = landmarks[263].x * canvasElement.width;
            const rightEyeY = landmarks[263].y * canvasElement.height;

            // Calculate dynamic ocular bounding box bounds with padding
            const minX = Math.min(leftEyeX, rightEyeX) - 50;
            const maxX = Math.max(leftEyeX, rightEyeX) + 50;
            const minY = Math.min(leftEyeY, rightEyeY) - 40;
            const maxY = Math.max(leftEyeY, rightEyeY) + 40;

            const boxWidth = maxX - minX;
            const boxHeight = maxY - minY;

            // Draw Dynamic Cyberspace Bounding Box following eyes
            ctx.strokeStyle = '#7dcfff';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.strokeRect(minX, minY, boxWidth, boxHeight);

            // Draw Center Target Crosshairs
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            ctx.strokeStyle = 'rgba(125, 207, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(centerX - 15, centerY); ctx.lineTo(centerX + 15, centerY);
            ctx.moveTo(centerX, centerY - 15); ctx.lineTo(centerX, centerY + 15);
            ctx.stroke();

            // Draw HUD Status Text follow
            ctx.fillStyle = '#7dcfff';
            ctx.font = '700 12px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('OCULAR TRACKING ACTIVE // LOCK ENGAGED', centerX, minY - 12);

        } else {
            // Draw static placeholder fallback if face lost
            ctx.fillStyle = '#f7768e';
            ctx.font = '700 14px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SEARCHING FOR OCULAR TARGET...', canvasElement.width / 2, canvasElement.height / 2);
        }
    });

    if (typeof Camera !== 'undefined') {
        camera = new Camera(videoElement, {
            onFrame: async () => {
                await faceMesh.send({ image: videoElement });
            },
            width: 640,
            height: 360
        });
        camera.start();
    }
}

document.addEventListener('DOMContentLoaded', () => {
  window.ingressModule = new IngressController();

  // Attach global functions requested by pipeline
  window.handleFileSelection = (file) => window.ingressModule?.handleFileSelection(file);
  window.executeBackendInference = (file) => window.ingressModule?.executeBackendInference(file);
  window.updateOcularCrops = updateOcularCrops;
  window.initDynamicEyeTracking = initDynamicEyeTracking;
});

export function updateOcularCrops(responseData, capturedCanvas) {
  const leftCropImg = document.getElementById('crop-left-eye') || document.querySelector('[data-crop="left"]');
  const rightCropImg = document.getElementById('crop-right-eye') || document.querySelector('[data-crop="right"]');
  const ocularWrapper = document.getElementById('eye-split-wrapper') || document.querySelector('.ocular-split-segmentation');

  if (responseData) {
    // If API returns cropped base64 eye images, assign directly
    if (responseData.crop_left_base64 && leftCropImg) {
      leftCropImg.src = `data:image/jpeg;base64,${responseData.crop_left_base64}`;
    } else if (responseData.processed_images && responseData.processed_images.left_eye && leftCropImg) {
      leftCropImg.src = responseData.processed_images.left_eye;
    }

    if (responseData.crop_right_base64 && rightCropImg) {
      rightCropImg.src = `data:image/jpeg;base64,${responseData.crop_right_base64}`;
    } else if (responseData.processed_images && responseData.processed_images.right_eye && rightCropImg) {
      rightCropImg.src = responseData.processed_images.right_eye;
    }
  }

  if (ocularWrapper) {
    ocularWrapper.style.display = 'block';
  }

  // Update crop status labels
  document.querySelectorAll('.crop-status').forEach(el => el.textContent = 'SEGMENTED');
}
