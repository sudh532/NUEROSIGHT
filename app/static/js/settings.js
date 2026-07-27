/**
 * Aegis-Eye & NEUROSIGHT Settings Manager Module (settings1.md)
 * Advanced Computer Vision Guardrails, Security Controls, HUD VFX, and LocalStorage Persistence.
 */

import { SoundEngine } from './audio.js';

const DEFAULT_NEUROSIGHT_CONFIG = {
  riskAlertThreshold: 70,
  pupilSensitivity: 'standard', // 'conservative' | 'standard' | 'strict'
  ambientLightingProfile: 'artificial', // 'low_light' | 'artificial' | 'sunlight'
  autoRejectBlurry: true,
  masterSoundEnabled: true,
  telemetryVolume: 80,
  autoExportPdf: false,
  operatorBadgeId: 'OP-7392',
  dataRetentionPolicy: '30d', // '24h' | '7d' | '30d' | 'indefinite'
  inactivityBlurEnabled: true,
  minEyeResolutionPx: 200,
  vfxIntensity: 'full', // 'off' | 'low' | 'full'
  gazeToleranceDeg: 15 // 5 | 15 | 30
};

class SettingsManager {
  constructor() {
    this.STORAGE_KEY = 'neurosight_config';
    this.config = this.loadConfig();
    this.initDOMReferences();
    this.bindEvents();
    this.applyConfigToUI();
    this.applyConfigToSystem();
  }

  loadConfig() {
    const saved = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem('aegis_settings');
    if (!saved) return { ...DEFAULT_NEUROSIGHT_CONFIG };
    try {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_NEUROSIGHT_CONFIG,
        riskAlertThreshold: parsed.riskAlertThreshold ?? parsed.riskThreshold ?? DEFAULT_NEUROSIGHT_CONFIG.riskAlertThreshold,
        pupilSensitivity: parsed.pupilSensitivity ?? DEFAULT_NEUROSIGHT_CONFIG.pupilSensitivity,
        ambientLightingProfile: parsed.ambientLightingProfile ?? parsed.lightingProfile ?? DEFAULT_NEUROSIGHT_CONFIG.ambientLightingProfile,
        autoRejectBlurry: parsed.autoRejectBlurry ?? DEFAULT_NEUROSIGHT_CONFIG.autoRejectBlurry,
        masterSoundEnabled: parsed.masterSoundEnabled ?? parsed.masterSound ?? DEFAULT_NEUROSIGHT_CONFIG.masterSoundEnabled,
        telemetryVolume: parsed.telemetryVolume ?? parsed.soundVolume ?? DEFAULT_NEUROSIGHT_CONFIG.telemetryVolume,
        autoExportPdf: parsed.autoExportPdf ?? parsed.autoExportCritical ?? DEFAULT_NEUROSIGHT_CONFIG.autoExportPdf,
        operatorBadgeId: parsed.operatorBadgeId ?? DEFAULT_NEUROSIGHT_CONFIG.operatorBadgeId,
        dataRetentionPolicy: parsed.dataRetentionPolicy ?? DEFAULT_NEUROSIGHT_CONFIG.dataRetentionPolicy,
        inactivityBlurEnabled: parsed.inactivityBlurEnabled ?? DEFAULT_NEUROSIGHT_CONFIG.inactivityBlurEnabled,
        minEyeResolutionPx: parsed.minEyeResolutionPx ?? DEFAULT_NEUROSIGHT_CONFIG.minEyeResolutionPx,
        vfxIntensity: parsed.vfxIntensity ?? DEFAULT_NEUROSIGHT_CONFIG.vfxIntensity,
        gazeToleranceDeg: parsed.gazeToleranceDeg ?? DEFAULT_NEUROSIGHT_CONFIG.gazeToleranceDeg
      };
    } catch (e) {
      console.error('[NEUROSIGHT Settings] Failed to parse settings JSON from storage, reverting to defaults.', e);
      return { ...DEFAULT_NEUROSIGHT_CONFIG };
    }
  }

  saveConfig() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      localStorage.setItem('aegis_settings', JSON.stringify({
        riskThreshold: this.config.riskAlertThreshold,
        pupilSensitivity: this.config.pupilSensitivity,
        lightingProfile: this.config.ambientLightingProfile,
        autoRejectBlurry: this.config.autoRejectBlurry,
        masterSound: this.config.masterSoundEnabled,
        soundVolume: this.config.telemetryVolume,
        autoExportCritical: this.config.autoExportPdf
      }));
      this.applyConfigToSystem();
    } catch (e) {
      console.error('[NEUROSIGHT Settings] Failed to save settings to localStorage:', e);
    }
  }

  getSettings() {
    return { ...this.config };
  }

  initDOMReferences() {
    this.drawer = document.getElementById('settings-drawer');
    this.backdrop = document.getElementById('settings-backdrop') || document.getElementById('settings-drawer-backdrop');
    this.btnClose = document.getElementById('btn-close-settings') || document.getElementById('settings-close-btn');
    this.btnTrigger = document.getElementById('settings-toggle-btn');

    // Section 01: Diagnostic Thresholds
    this.riskSlider = document.getElementById('setting-risk-slider');
    this.riskReadout = document.getElementById('setting-risk-val-label');
    this.sensitivityBtns = document.querySelectorAll('.sensitivity-pill-btn');

    // Section 02: Environmental Calibration
    this.lightingSelect = document.getElementById('setting-lighting-profile');
    this.autoRejectToggle = document.getElementById('setting-auto-reject-blur');

    // Section 03: Audio & System Preferences
    this.soundToggle = document.getElementById('setting-toggle-sound');
    this.masterSoundToggle = document.getElementById('setting-master-sound');
    this.soundVolumeSlider = document.getElementById('setting-sound-volume');
    this.volumeSlider = document.getElementById('setting-volume-slider');
    this.soundVolumeVal = document.getElementById('sound-volume-val');
    this.volumeReadout = document.getElementById('setting-volume-val-label');
    this.autoExportToggle = document.getElementById('setting-auto-export-critical');

    // Section 04: Security & Session Protocols
    this.inputOperatorId = document.getElementById('input-operator-id');
    this.selectRetention = document.getElementById('select-data-retention');
    this.toggleBlur = document.getElementById('toggle-session-blur');

    // Section 05: Advanced CV Guardrails
    this.rangeMinRes = document.getElementById('range-min-resolution');
    this.badgeMinResVal = document.getElementById('min-resolution-val');
    this.vfxSegmentGroup = document.getElementById('group-vfx-intensity');
    this.selectGaze = document.getElementById('select-gaze-tolerance');

    // Footer Action Buttons
    this.btnReset = document.getElementById('btn-reset-defaults');
    this.btnExport = document.getElementById('btn-export-config');
  }

  bindEvents() {
    // Drawer Open/Close Controls
    document.querySelectorAll('#settings-toggle-btn, #btn-toggle-settings-header, .btn-hud-header').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });

    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.close());
    }

    // Risk Alert Threshold Slider
    if (this.riskSlider) {
      this.riskSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.config.riskAlertThreshold = val;
        if (this.riskReadout) this.riskReadout.textContent = `${val}%`;
        this.saveConfig();
      });
    }

    // Pupil Sensitivity Pills
    this.sensitivityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sens = btn.getAttribute('data-sensitivity');
        if (sens) {
          this.config.pupilSensitivity = sens;
          this.updateSensitivityUI(sens);
          this.saveConfig();
        }
      });
    });

    // Lighting Profile Select
    if (this.lightingSelect) {
      this.lightingSelect.addEventListener('change', (e) => {
        this.config.ambientLightingProfile = e.target.value;
        this.saveConfig();
      });
    }

    // Auto-Reject Blurry Toggle
    if (this.autoRejectToggle) {
      this.autoRejectToggle.addEventListener('change', (e) => {
        this.config.autoRejectBlurry = e.target.checked;
        this.saveConfig();
      });
    }

    // Master Sound Toggles
    const handleSoundToggle = (enabled) => {
      this.config.masterSoundEnabled = enabled;
      SoundEngine.setMuted(!enabled);
      if (this.soundToggle) this.soundToggle.checked = enabled;
      if (this.masterSoundToggle) this.masterSoundToggle.checked = enabled;
      this.saveConfig();
    };

    if (this.soundToggle) {
      this.soundToggle.addEventListener('change', (e) => handleSoundToggle(e.target.checked));
    }
    if (this.masterSoundToggle) {
      this.masterSoundToggle.addEventListener('change', (e) => handleSoundToggle(e.target.checked));
    }

    // Master Volume Sliders
    const handleVolumeChange = (val) => {
      this.config.telemetryVolume = val;
      SoundEngine.setVolume(val);
      if (this.soundVolumeVal) this.soundVolumeVal.textContent = `${val}%`;
      if (this.volumeReadout) this.volumeReadout.textContent = `${val}%`;
      if (this.soundVolumeSlider) this.soundVolumeSlider.value = val;
      if (this.volumeSlider) this.volumeSlider.value = val;
      this.saveConfig();
    };

    if (this.soundVolumeSlider) {
      this.soundVolumeSlider.addEventListener('input', (e) => handleVolumeChange(parseInt(e.target.value, 10)));
    }
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => handleVolumeChange(parseInt(e.target.value, 10)));
    }

    // Auto-Export PDF Toggle
    if (this.autoExportToggle) {
      this.autoExportToggle.addEventListener('change', (e) => {
        this.config.autoExportPdf = e.target.checked;
        this.saveConfig();
      });
    }

    // Section 04: Operator Badge ID Change
    if (this.inputOperatorId) {
      this.inputOperatorId.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'OP-0000';
        this.config.operatorBadgeId = val;
        window.currentOperatorId = val;
        this.saveConfig();
      });
    }

    // Section 04: Retention Dropdown Select
    if (this.selectRetention) {
      this.selectRetention.addEventListener('change', (e) => {
        this.config.dataRetentionPolicy = e.target.value;
        this.saveConfig();
      });
    }

    // Section 04: Inactivity Blur Privacy Shield Toggle
    if (this.toggleBlur) {
      this.toggleBlur.addEventListener('change', (e) => {
        this.config.inactivityBlurEnabled = e.target.checked;
        this.saveConfig();
      });
    }

    // Section 05: Minimum Resolution Slider
    if (this.rangeMinRes) {
      this.rangeMinRes.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.config.minEyeResolutionPx = val;
        if (this.badgeMinResVal) this.badgeMinResVal.textContent = `${val}px`;
        this.saveConfig();
      });
    }

    // Section 05: VFX Segmented Buttons
    if (this.vfxSegmentGroup) {
      this.vfxSegmentGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment-btn');
        if (!btn) return;
        const selectedValue = btn.dataset.value;
        if (!selectedValue) return;

        this.vfxSegmentGroup.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        this.config.vfxIntensity = selectedValue;
        this.saveConfig();
      });
    }

    // Section 05: Gaze Tolerance Select
    if (this.selectGaze) {
      this.selectGaze.addEventListener('change', (e) => {
        this.config.gazeToleranceDeg = parseInt(e.target.value, 10);
        this.saveConfig();
      });
    }

    // Footer Actions: Reset Defaults & Export JSON Config
    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.restoreDefaults());
    }

    if (this.btnExport) {
      this.btnExport.addEventListener('click', () => this.exportConfigJSON());
    }
  }

  open() {
    if (this.drawer) {
      this.drawer.classList.add('is-open');
      this.drawer.setAttribute('aria-hidden', 'false');
    }
    if (this.backdrop) this.backdrop.classList.add('is-open');
  }

  close() {
    if (this.drawer) {
      this.drawer.classList.remove('is-open');
      this.drawer.setAttribute('aria-hidden', 'true');
    }
    if (this.backdrop) this.backdrop.classList.remove('is-open');
  }

  updateSensitivityUI(activeSens) {
    this.sensitivityBtns.forEach(btn => {
      if (btn.getAttribute('data-sensitivity') === activeSens) {
        btn.classList.add('is-active', 'active');
      } else {
        btn.classList.remove('is-active', 'active');
      }
    });
  }

  applyConfigToUI() {
    // Section 01
    if (this.riskSlider) this.riskSlider.value = this.config.riskAlertThreshold;
    if (this.riskReadout) this.riskReadout.textContent = `${this.config.riskAlertThreshold}%`;
    this.updateSensitivityUI(this.config.pupilSensitivity);

    // Section 02
    if (this.lightingSelect) this.lightingSelect.value = this.config.ambientLightingProfile;
    if (this.autoRejectToggle) this.autoRejectToggle.checked = this.config.autoRejectBlurry;

    // Section 03
    const soundEnabled = this.config.masterSoundEnabled;
    SoundEngine.setMuted(!soundEnabled);
    if (this.soundToggle) this.soundToggle.checked = soundEnabled;
    if (this.masterSoundToggle) this.masterSoundToggle.checked = soundEnabled;

    const vol = this.config.telemetryVolume;
    SoundEngine.setVolume(vol);
    if (this.soundVolumeSlider) this.soundVolumeSlider.value = vol;
    if (this.volumeSlider) this.volumeSlider.value = vol;
    if (this.soundVolumeVal) this.soundVolumeVal.textContent = `${vol}%`;
    if (this.volumeReadout) this.volumeReadout.textContent = `${vol}%`;

    if (this.autoExportToggle) this.autoExportToggle.checked = this.config.autoExportPdf;

    // Section 04
    if (this.inputOperatorId) this.inputOperatorId.value = this.config.operatorBadgeId;
    if (this.selectRetention) this.selectRetention.value = this.config.dataRetentionPolicy;
    if (this.toggleBlur) this.toggleBlur.checked = this.config.inactivityBlurEnabled;

    // Section 05
    if (this.rangeMinRes) {
      this.rangeMinRes.value = this.config.minEyeResolutionPx;
      if (this.badgeMinResVal) this.badgeMinResVal.textContent = `${this.config.minEyeResolutionPx}px`;
    }
    if (this.vfxSegmentGroup) {
      this.vfxSegmentGroup.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.value === this.config.vfxIntensity);
      });
    }
    if (this.selectGaze) this.selectGaze.value = this.config.gazeToleranceDeg;
  }

  applyConfigToSystem() {
    // Global state parameters
    window.currentOperatorId = this.config.operatorBadgeId;
    window.minEyeResolutionPx = this.config.minEyeResolutionPx;
    window.gazeToleranceDeg = this.config.gazeToleranceDeg;

    // Toggle background VFX canvas display & opacity
    const vfxCanvas = document.getElementById('vfx-bg-canvas');
    if (vfxCanvas) {
      if (this.config.vfxIntensity === 'off') {
        vfxCanvas.style.display = 'none';
      } else {
        vfxCanvas.style.display = 'block';
        vfxCanvas.style.opacity = this.config.vfxIntensity === 'low' ? '0.35' : '1.0';
      }
    }
  }

  restoreDefaults() {
    if (confirm('Are you sure you want to restore factory default configuration settings?')) {
      this.config = { ...DEFAULT_NEUROSIGHT_CONFIG };
      this.saveConfig();
      this.applyConfigToUI();
      this.showToast('Configuration restored to factory baseline.');
    }
  }

  exportConfigJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.config, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `neurosight_config_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('Configuration exported as JSON.');
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'hud-toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('is-visible'), 10);
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

let settingsManagerInstance = null;

export const SettingsManagerInstance = {
  init() {
    if (!settingsManagerInstance) {
      settingsManagerInstance = new SettingsManager();
    }
    return settingsManagerInstance;
  },

  getSettings() {
    return settingsManagerInstance ? settingsManagerInstance.getSettings() : { ...DEFAULT_NEUROSIGHT_CONFIG };
  }
};

// Also export as SettingsManager for backwards compatibility
export { SettingsManagerInstance as SettingsManager };

// Initialize on DOMContentLoaded if not instantiated
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.neurosightSettings = SettingsManagerInstance.init();
  });
}
