/**
 * Main Application coordinator for Aegis-Eye Tactical Ocular HUD
 */

import { ApiClient } from './api_client.js';
import { TelemetryCharts } from './telemetry_charts.js';

let selectedFile = null;
let currentProfile = "artificial";
let supervisorAuth = null;

document.addEventListener('DOMContentLoaded', () => {
  // Navigation tabs
  const tabDiagnosisBtn = document.getElementById('btn-tab-diagnosis');
  const tabArchivesBtn = document.getElementById('btn-tab-archives');
  const viewDiagnosis = document.getElementById('view-tab-diagnosis');
  const viewArchives = document.getElementById('view-tab-archives');

  // Ingress elements
  const dropzone = document.getElementById('aegis-dropzone');
  const fileInput = document.getElementById('aegis-file-input');
  const previewPanel = document.getElementById('aegis-preview-panel');
  const payloadThum = document.getElementById('aegis-payload-thumbnail');
  const btnDiscard = document.getElementById('btn-aegis-discard');
  const btnExecute = document.getElementById('btn-aegis-run');
  const errorBanner = document.getElementById('ingress-error');
  const errorText = document.getElementById('ingress-error-text');

  // Metadata
  const badgeInput = document.getElementById('input-badge-id');
  const caseInput = document.getElementById('input-case-id');

  // Result displays
  const welcomeHud = document.getElementById('view-welcome-hud');
  const processingPanel = document.getElementById('view-processing');
  const resultsHud = document.getElementById('view-results-hud');
  const cropsCard = document.getElementById('aegis-crops-card');

  const edgeGlow = document.getElementById('aegis-peripheral-glow');
  const bannerBlock = document.getElementById('verdict-banner-block');
  const bannerTitle = document.getElementById('verdict-title-text');
  const bannerDesc = document.getElementById('verdict-description-text');

  // Progress meters values
  const rednessVal = document.getElementById('metric-redness-val');
  const rednessFill = document.getElementById('metric-redness-fill');
  const rednessLabel = document.getElementById('lbl-redness-state');
  const rednessDesc = document.getElementById('metric-redness-desc');

  const dilationVal = document.getElementById('metric-dilation-val');
  const dilationFill = document.getElementById('metric-dilation-fill');
  const dilationLabel = document.getElementById('lbl-dilation-state');
  const dilationDesc = document.getElementById('metric-dilation-desc');

  const ptosisVal = document.getElementById('metric-ptosis-val');
  const ptosisFill = document.getElementById('metric-ptosis-fill');
  const ptosisLabel = document.getElementById('lbl-ptosis-state');
  const ptosisDesc = document.getElementById('metric-ptosis-desc');

  // Telemetry deltas details
  const valRedAsymmetry = document.getElementById('val-redness-asymmetry');
  const valPupilAsymmetry = document.getElementById('val-pupil-asymmetry');
  const valExudateStatus = document.getElementById('val-exudate-status');
  const valAnisocoriaStatus = document.getElementById('val-anisocoria-status');

  // Authentication
  const archiveLogin = document.getElementById('archive-login-box');
  const archiveDashboard = document.getElementById('archive-dashboard');

  // 1. Initial health ping
  async function pingEngine() {
    try {
      await ApiClient.getHealth();
    } catch (e) {
      console.warn("Aegis server check offline.");
    }
  }
  pingEngine();

  // 2. Tabs Switcher coordination
  tabDiagnosisBtn.addEventListener('click', () => {
    tabDiagnosisBtn.className = 'px-4 py-1.5 rounded text-xs font-mono font-bold bg-emerald-500 text-zinc-950';
    tabArchivesBtn.className = 'px-4 py-1.5 rounded text-xs font-mono font-bold text-slate-400 hover:text-slate-200';
    viewDiagnosis.classList.remove('hidden');
    viewArchives.classList.add('hidden');
  });

  tabArchivesBtn.addEventListener('click', () => {
    tabArchivesBtn.className = 'px-4 py-1.5 rounded text-xs font-mono font-bold bg-emerald-500 text-zinc-950';
    tabDiagnosisBtn.className = 'px-4 py-1.5 rounded text-xs font-mono font-bold text-slate-400 hover:text-slate-200';
    viewArchives.classList.remove('hidden');
    viewDiagnosis.classList.add('hidden');
    
    if (supervisorAuth) {
      archiveLogin.classList.add('hidden');
      archiveDashboard.classList.remove('hidden');
      loadArchiveDashboard();
    } else {
      archiveLogin.classList.remove('hidden');
      archiveDashboard.classList.add('hidden');
    }
  });

  // 3. Lighting Profile configuration switches
  document.querySelectorAll('.btn-light-profile').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-light-profile').forEach(b => {
        b.className = 'btn-light-profile py-1.5 rounded text-[10px] font-mono font-bold border border-white/5 bg-zinc-900 text-slate-400';
      });
      btn.className = 'btn-light-profile py-1.5 rounded text-[10px] font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      currentProfile = btn.getAttribute('data-profile');
    });
  });

  // 4. Ingress Bounding Upload controls
  dropzone.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('border-emerald-500/40', 'bg-emerald-500/5');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-emerald-500/40', 'bg-emerald-500/5');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  });

  function processFile(file) {
    errorBanner.classList.add('hidden');
    
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showIngressError("MIME error: only JPEG and PNG payloads are supported.");
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      payloadThum.src = ev.target.result;
      previewPanel.classList.remove('hidden');
      dropzone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  function showIngressError(msg) {
    errorText.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  btnDiscard.addEventListener('click', (e) => {
    e.stopPropagation();
    discardIngress();
  });

  function discardIngress() {
    selectedFile = null;
    fileInput.value = '';
    payloadThum.src = '';
    previewPanel.classList.add('hidden');
    dropzone.classList.remove('hidden');
    errorBanner.classList.add('hidden');
    
    // Clear screen glows
    edgeGlow.className = 'fixed inset-0 pointer-events-none z-[99] transition-all duration-500';
    
    welcomeHud.classList.remove('hidden');
    resultsHud.classList.add('hidden');
    processingPanel.classList.add('hidden');
    cropsCard.classList.add('hidden');
  }

  // 5. Speech Guided Secondary Emergency Override Prompts
  document.getElementById('btn-hud-voice-escalate').addEventListener('click', () => {
    if (!window.speechSynthesis) {
      alert("Voice speech synthesis is not supported on this browser.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance("Guided secondary assessment active. Focus directly on the target crosshairs and maintain optical position.");
    utterance.rate = 0.90;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  });

  // 6. Running Diagnostic classification pipeline
  btnExecute.addEventListener('click', async () => {
    if (!selectedFile) return;

    const opId = badgeInput.value.trim();
    const csId = caseInput.value.trim();

    if (!opId || !csId) {
      alert("OPERATOR BADGE ID & INCIDENT CASE ID coordinates must be registered.");
      return;
    }

    welcomeHud.classList.add('hidden');
    resultsHud.classList.add('hidden');
    cropsCard.classList.add('hidden');
    processingPanel.classList.remove('hidden');

    resetLoadingSteps();

    // Start progress timer
    let timeElapsed = 0;
    const timerLabel = document.getElementById('timer-label');
    const timerInterval = setInterval(() => {
      timeElapsed += 0.1;
      timerLabel.textContent = `EST: ${timeElapsed.toFixed(1)}s`;
    }, 100);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('operator_id', opId);
    formData.append('case_id', csId);
    formData.append('lighting_profile', currentProfile);

    updateStep('step-mesh', 'ACTIVE', 'LOCALIZING LANDMARKS');

    try {
      const responsePromise = ApiClient.runOcularScreening(formData);

      await sleep(400);
      updateStep('step-mesh', 'DONE', 'COMPLETE');
      updateStep('step-infection', 'ACTIVE', 'CALCULATING ASYMMETRY');

      await sleep(400);
      updateStep('step-infection', 'DONE', 'COMPLETE');
      updateStep('step-drug', 'ACTIVE', 'CHECKING PIR MIOSIS');

      await sleep(350);
      updateStep('step-drug', 'DONE', 'COMPLETE');
      updateStep('step-trauma', 'ACTIVE', 'CALCULATING ANISOCORIA');

      const data = await responsePromise;
      clearInterval(timerInterval);

      updateStep('step-trauma', 'DONE', 'COMPLETE');
      await sleep(150);

      // Render Telemetry HUD
      processingPanel.classList.add('hidden');
      resultsHud.classList.remove('hidden');
      
      renderScreeningHUD(data);

    } catch (e) {
      clearInterval(timerInterval);
      processingPanel.classList.add('hidden');
      welcomeHud.classList.remove('hidden');
      alert("Ocular Diagnostics core error: " + e.message);
    }
  });

  function renderScreeningHUD(data) {
    const verdict = data.verdict;
    const metrics = data.metrics;

    // Reset warnings glows classes
    edgeGlow.className = 'fixed inset-0 pointer-events-none z-[99] transition-all duration-500';

    // 1. Verdict alert banner
    bannerBlock.className = 'verdict-banner';
    bannerTitle.textContent = verdict.overall_verdict;
    bannerDesc.textContent = "Reason: " + verdict.reason;

    if (verdict.overall_verdict.includes("CRITICAL ALERT")) {
      bannerBlock.classList.add('banner-trauma');
      edgeGlow.classList.add('peripheral-warning-trauma');
    } else if (verdict.overall_verdict.includes("PATHOLOGICAL")) {
      bannerBlock.classList.add('banner-pathology');
      edgeGlow.classList.add('peripheral-warning-pathology');
    } else if (verdict.overall_verdict.includes("IMPAIRMENT")) {
      bannerBlock.classList.add('banner-impairment');
      edgeGlow.classList.add('peripheral-warning-impair');
    } else {
      bannerBlock.classList.add('banner-safe');
    }

    // 2. Animate numerical progress tickers
    const rednessValAvg = (metrics.infection.left_redness + metrics.infection.right_redness) / 2.0;
    animateNumber(rednessVal, 0.00, rednessValAvg, 1000, 2);
    rednessFill.style.width = `${Math.min(100, (rednessValAvg / 0.20) * 100)}%`;
    if (rednessValAvg > 0.15) {
      rednessFill.className = "metric-progress-fill bg-rose-500";
      rednessLabel.textContent = "SEVERE CONGESTION";
      rednessLabel.className = "text-[8px] font-mono text-rose-400 block mt-2 text-right font-semibold";
      rednessDesc.textContent = "Intense vascular injection isolated in sclera tissue.";
    } else {
      rednessFill.className = "metric-progress-fill bg-emerald-500";
      rednessLabel.textContent = "CLEARED";
      rednessLabel.className = "text-[8px] font-mono text-emerald-400 block mt-2 text-right font-semibold";
      rednessDesc.textContent = "Sclera redness fits baseline configurations.";
    }

    animateNumber(dilationVal, 0.00, metrics.drug.avg_pir, 1000, 2);
    dilationFill.style.width = `${Math.min(100, (metrics.drug.avg_pir / 0.6) * 100)}%`;
    if (metrics.drug.detected_category == "CNS Stimulant") {
      dilationFill.className = "metric-progress-fill bg-rose-500";
      dilationLabel.textContent = "SEVERE MYDRIASIS";
      dilationLabel.className = "text-[8px] font-mono text-rose-400 block mt-2 text-right font-semibold";
      dilationDesc.textContent = "Dilated pupils consistent with stimulant presence.";
    } else if (metrics.drug.detected_category == "CNS Depressant") {
      dilationFill.className = "metric-progress-fill bg-rose-500";
      dilationLabel.textContent = "SEVERE MIOSIS";
      dilationLabel.className = "text-[8px] font-mono text-rose-400 block mt-2 text-right font-semibold";
      dilationDesc.textContent = "Constricted pinpoint pupils consistent with opioids.";
    } else {
      dilationFill.className = "metric-progress-fill bg-emerald-500";
      dilationLabel.textContent = "CLEARED";
      dilationLabel.className = "text-[8px] font-mono text-emerald-400 block mt-2 text-right font-semibold";
      dilationDesc.textContent = "Pupil size reacts normally to ambient light.";
    }

    animateNumber(ptosisVal, 0.00, metrics.trauma.avg_ptosis_ratio, 1000, 2);
    ptosisFill.style.width = `${Math.min(100, (metrics.trauma.avg_ptosis_ratio / 0.5) * 100)}%`;
    if (metrics.trauma.fatigue_flag) {
      ptosisFill.className = "metric-progress-fill bg-amber-500";
      ptosisLabel.textContent = "SLUGGISH APERTURE";
      ptosisLabel.className = "text-[8px] font-mono text-amber-500 block mt-2 text-right font-semibold";
      ptosisDesc.textContent = "Narrowing palpebral fissure indicates drowsiness.";
    } else {
      ptosisFill.className = "metric-progress-fill bg-emerald-500";
      ptosisLabel.textContent = "CLEARED";
      ptosisLabel.className = "text-[8px] font-mono text-emerald-400 block mt-2 text-right font-semibold";
      ptosisDesc.textContent = "Eyelid control displays active neural responsiveness.";
    }

    // 3. Set telemetry details delta values
    valRedAsymmetry.textContent = metrics.infection.asymmetry_index.toFixed(2);
    valPupilAsymmetry.textContent = `${metrics.trauma.delta_pupil_mm.toFixed(1)}mm`;
    valExudateStatus.textContent = metrics.infection.exudate_detected ? "INFECTIOUS DISCHARGE DETECTED" : "NOT DETECTED";
    valExudateStatus.className = metrics.infection.exudate_detected ? "font-bold text-blue-400" : "font-bold text-slate-350";
    valAnisocoriaStatus.textContent = metrics.trauma.anisocoria_flag ? "CRITICAL CONCUSSION ALERT" : "CLEARED";
    valAnisocoriaStatus.className = metrics.trauma.anisocoria_flag ? "font-bold text-amber-400" : "font-bold text-slate-350";

    // 4. Render crops images
    document.getElementById('aegis-left-crop-img').src = data.processed_images.left_eye;
    document.getElementById('aegis-right-crop-img').src = data.processed_images.right_eye;
    cropsCard.classList.remove('hidden');
  }

  function animateNumber(element, start, end, duration, decimals = 2, suffix = '') {
    if (!element) return;
    const startTime = performance.now();
    
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      element.textContent = current.toFixed(decimals) + suffix;
      
      if (progress < 1.0) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  // 7. Forensic database audit logger verification
  document.getElementById('archive-auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('archive-auth-user').value;
    const pass = document.getElementById('archive-auth-pass').value;
    const errorMsg = document.getElementById('archive-auth-error');
    errorMsg.classList.add('hidden');

    try {
      const data = await ApiClient.getForensicTrends(user, pass);
      supervisorAuth = { user, pass };
      
      // Toggle views
      archiveLogin.classList.add('hidden');
      archiveDashboard.classList.remove('hidden');
      
      renderArchiveLogs(data.fleet);
      TelemetryCharts.renderCharts(data.fleet);
    } catch (err) {
      errorMsg.textContent = err.message || "Access Denied.";
      errorMsg.classList.remove('hidden');
    }
  });

  document.getElementById('btn-refresh-logs').addEventListener('click', () => {
    if (supervisorAuth) {
      loadArchiveDashboard();
    }
  });

  async function loadArchiveDashboard() {
    try {
      const data = await ApiClient.getForensicTrends(supervisorAuth.user, supervisorAuth.pass);
      renderArchiveLogs(data.fleet);
      TelemetryCharts.renderCharts(data.fleet);
    } catch (e) {
      alert("Failed to reload data grid.");
    }
  }

  function renderArchiveLogs(fleet) {
    const container = document.getElementById('archive-logs-container');
    const totalEl = document.getElementById('stat-total-scans');
    const clearedEl = document.getElementById('stat-cleared-scans');
    const impairEl = document.getElementById('stat-impair-scans');
    const traumaEl = document.getElementById('stat-trauma-scans');

    container.innerHTML = '';
    
    totalEl.textContent = fleet.length;

    let cleared = 0, impair = 0, trauma = 0;
    
    fleet.forEach(item => {
      const v = item.overall_verdict;
      let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      
      if (v.includes("COMPLETE") || v.includes("NO CRITICAL")) {
        cleared += 1;
      } else if (v.includes("PATHOLOGICAL")) {
        statusColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
      } else if (v.includes("HEAD TRAUMA") || v.includes("CONCUSSION")) {
        trauma += 1;
        statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
      } else {
        impair += 1;
        statusColor = "text-rose-450 bg-rose-500/10 border-rose-500/20";
      }

      const card = document.createElement('div');
      card.className = "tactical-card subpixel-glow";
      
      const scanDate = new Date(item.timestamp).toLocaleString();
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <span class="text-[10px] font-mono font-bold text-slate-350 block">CASE: ${item.case_id}</span>
            <span class="text-[8px] font-mono text-slate-500 block">Operator: ${item.operator_id} | ${scanDate}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[8px] font-mono border ${statusColor} uppercase tracking-widest">${v.replace("IMPAIRMENT INDICATORS DETECTED - CATEGORY: ", "").replace("SCREENING COMPLETE - ", "")}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-3 text-[9px] font-mono text-slate-500">
          <span>Redness: ${item.redness_score.toFixed(2)}</span>
          <span>Dilation: ${item.dilation_score.toFixed(2)}</span>
          <span>Ptosis: ${item.ptosis_score.toFixed(2)}</span>
        </div>
      `;
      container.appendChild(card);
    });

    clearedEl.textContent = cleared;
    impairEl.textContent = impair;
    traumaEl.textContent = trauma;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function resetLoadingSteps() {
    ['step-mesh', 'step-infection', 'step-drug', 'step-trauma'].forEach(id => {
      const step = document.getElementById(id);
      const dot = step.querySelector('.step-dot');
      const status = step.querySelector('.step-status');
      dot.className = 'step-dot w-2 h-2 rounded bg-slate-800';
      status.className = 'step-status text-[10px] font-mono text-slate-600';
      status.textContent = 'QUEUED';
    });
    document.getElementById('timer-label').textContent = 'EST: 0.0s';
  }

  function updateStep(id, state, text) {
    const step = document.getElementById(id);
    const dot = step.querySelector('.step-dot');
    const status = step.querySelector('.step-status');
    
    if (state === 'ACTIVE') {
      dot.className = 'step-dot w-2.5 h-2.5 rounded bg-amber-500 animate-pulse';
      status.className = 'step-status text-[10px] font-mono text-amber-500 font-semibold';
    } else if (state === 'DONE') {
      dot.className = 'step-dot w-2.5 h-2.5 rounded bg-emerald-500';
      status.className = 'step-status text-[10px] font-mono text-emerald-500 font-bold';
    }
    status.textContent = text;
  }
});
