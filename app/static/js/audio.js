/**
 * Web Audio API Procedural Sound Synthesizer for Aegis-Eye
 * Mechanical Tactile Mouse Click Synthesizer (edit3.md Phase 3)
 */

let audioCtx = null;
let isMuted = false;
let masterVolume = 0.8;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Global unlock listener & automatic mechanical click binding on all interactive UI elements
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  };
  
  window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });

  // Play crisp mechanical click sound automatically on mouse press of interactive components
  window.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!target) return;

    const isFileInput = target.tagName === 'INPUT' && target.type === 'file';
    const isInteractive = 
      !isFileInput && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('.nav-tab-btn') ||
        target.closest('.range-pill-btn') ||
        target.closest('.table-filter-pill') ||
        target.closest('.legend-toggle-btn') ||
        target.closest('.mode-toggle-btn') ||
        target.closest('.theme-toggle-btn') ||
        target.closest('tr')
      );

    if (isInteractive) {
      SoundEngine.playClick();
    }
  }, { passive: true });
}

export const SoundEngine = {
  isMuted() {
    return isMuted;
  },

  setMuted(muted) {
    isMuted = !!muted;
  },

  setVolume(volPercent) {
    masterVolume = Math.max(0, Math.min(1, volPercent / 100));
  },

  toggleMute() {
    isMuted = !isMuted;
    if (!isMuted) {
      this.playClick();
    }
    return isMuted;
  },

  /**
   * Realistic Mechanical Micro-Switch Mouse Click Synthesizer
   * Combines high-frequency snap impulse + damped body cavity resonance.
   */
  playClick() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. High-frequency micro-snap impulse (2400Hz -> 400Hz in 8ms)
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();

      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(2400, now);
      snapOsc.frequency.exponentialRampToValueAtTime(400, now + 0.008);

      snapGain.gain.setValueAtTime(0.35, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);

      snapOsc.start(now);
      snapOsc.stop(now + 0.008);

      // 2. Damped tactile body cavity resonance (220Hz -> 80Hz in 18ms)
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();

      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(220, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(80, now + 0.018);

      bodyGain.gain.setValueAtTime(0.25, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);

      bodyOsc.start(now);
      bodyOsc.stop(now + 0.018);
    } catch (e) {
      console.warn('[Aegis Audio] Click sound failure:', e);
    }
  },

  // 2. Scan Processing Dual-Tone Sweep
  playProcessing() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(750, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('[Aegis Audio] Processing sound failure:', e);
    }
  },

  // 3. Alert Chime (Critical Result / Substance Impairment Alert: 2-stage square wave alarm)
  playAlert() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('[Aegis Audio] Alert chime failure:', e);
    }
  },

  // 4. Verified Chime (Cleared Result: Major-third sine chime C5 -> E5)
  playVerified() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note C5 (523.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note E5 (659.25Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.1);
      gain2.gain.setValueAtTime(0.2, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('[NEUROSIGHT Audio] Verified chime failure:', e);
    }
  },

  /**
   * High-frequency low-volume sweep tone during image scanning (cinematic.md Phase 4)
   */
  playScanSound() {
    this.playProcessing();
  },

  /**
   * Crisp double-beep chime when target lock reticle resolves (cinematic.md Phase 4)
   */
  playLockSound() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1600, now + 0.09);
      gain2.gain.setValueAtTime(0.2, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.18);
    } catch (e) {
      console.warn('[NEUROSIGHT Audio] Lock sound failure:', e);
    }
  },

  /**
   * Low dual-frequency warning hum if impairment is detected (cinematic.md Phase 4)
   */
  playAlertSound() {
    this.playAlert();
  }
};
