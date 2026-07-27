/**
 * Elements coordinator for custom biometric gauges, threshold spectrum bars,
 * raw biomarker sub-data panels, and drug/substance impairment annotations (updatev1.md).
 */
export const Elements = {
  /**
   * Calculates spectrum track pointer position (2% to 98%)
   */
  calculatePointerPosition(metricKey, rawValue) {
    let min = 0, max = 1;
    if (metricKey === 'sclera') {
      min = 0; max = 0.50;
    } else if (metricKey === 'pir') {
      min = 0.10; max = 0.50;
    } else if (metricKey === 'aperture') {
      min = 0.10; max = 0.60;
    }
    const normalized = (rawValue - min) / (max - min);
    const clampedPercent = Math.min(Math.max(normalized * 100, 2), 98);
    return `${clampedPercent.toFixed(1)}%`;
  },

  /**
   * Resets Telemetry Analysis Panel to Idle State (SYSTEM STANDBY)
   */
  resetTelemetryPanel() {
    const panel = document.getElementById('telemetry-panel');
    const header = document.getElementById('verdict-header');
    const reason = document.getElementById('verdict-reason');
    const riskVal = document.getElementById('verdict-risk-value');
    const confVal = document.getElementById('verdict-conf-value');
    const exportBtn = document.getElementById('btn-export-report');

    const rednessVal = document.getElementById('redness-value');
    const pupilVal = document.getElementById('pupil-value');
    const eyelidVal = document.getElementById('eyelid-value');

    const rednessAnn = document.getElementById('redness-annotation');
    const pupilAnn = document.getElementById('pupil-annotation');
    const eyelidAnn = document.getElementById('eyelid-annotation');

    const rednessFill = document.getElementById('redness-radial-fill');
    const pupilFill = document.getElementById('pupil-radial-fill');
    const eyelidFill = document.getElementById('eyelid-radial-fill');

    const ptrSclera = document.getElementById('pointer-sclera');
    const ptrPir = document.getElementById('pointer-pir');
    const ptrAperture = document.getElementById('pointer-aperture');

    if (panel) {
      panel.className = 'panel telemetry-status-module telemetry-panel state-standby is-idle';
    }

    if (header) {
      header.style.color = '#7dcfff';
      header.innerHTML = '<span class="standby-status-dot"></span> SYSTEM STANDBY';
    }

    if (reason) {
      reason.textContent = 'Ingest an eye or facial image in the ingress dropzone to trigger the forensic impairment pipeline.';
    }

    if (riskVal) riskVal.textContent = '--';
    if (confVal) confVal.textContent = '--';

    if (rednessVal) rednessVal.textContent = '--%';
    if (pupilVal) pupilVal.textContent = '--.--';
    if (eyelidVal) eyelidVal.textContent = '--.--';

    if (rednessAnn) {
      rednessAnn.textContent = 'STANDBY';
      rednessAnn.style.color = 'var(--text-muted)';
    }
    if (pupilAnn) {
      pupilAnn.textContent = 'STANDBY';
      pupilAnn.style.color = 'var(--text-muted)';
    }
    if (eyelidAnn) {
      eyelidAnn.textContent = 'STANDBY';
      eyelidAnn.style.color = 'var(--text-muted)';
    }

    if (rednessFill) rednessFill.style.strokeDashoffset = '188.5';
    if (pupilFill) pupilFill.style.strokeDashoffset = '188.5';
    if (eyelidFill) eyelidFill.style.strokeDashoffset = '188.5';

    if (ptrSclera) ptrSclera.style.left = '0%';
    if (ptrPir) ptrPir.style.left = '0%';
    if (ptrAperture) ptrAperture.style.left = '0%';

    // Reset Biomarker Sub-Data Details
    const ids = ['raw-sclera-density', 'raw-sclera-area', 'raw-sclera-chroma', 'raw-pir-left', 'raw-pir-right', 'raw-pir-anisocoria', 'raw-eyelid-left', 'raw-eyelid-right', 'raw-eyelid-symmetry'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });

    if (exportBtn) exportBtn.style.display = 'none';
  },

  /**
   * Smooth Count-Up Transition for Numeric Metric Values
   */
  animateValue(element, targetVal, duration = 600, formatter = (v) => v.toFixed(2)) {
    if (!element) return;

    const startVal = parseFloat(element.getAttribute('data-val') || '0');
    const startTime = performance.now();

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const currentVal = startVal + (targetVal - startVal) * easeProgress;

      element.textContent = formatter(currentVal);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        element.setAttribute('data-val', targetVal.toString());
      }
    };

    requestAnimationFrame(updateCount);
  },

  /**
   * Updates Sclera Redness Radial Gauge, Spectrum Pointer & Raw Biomarker Sub-Data
   */
  updateRedness(leftScore, rightScore) {
    const avgScore = (leftScore + rightScore) / 2.0;
    const maxScore = 0.40;
    const fraction = Math.max(0, Math.min(1, avgScore / maxScore));

    const arcLength = 141.37; // 270-degree arc length
    const targetOffset = arcLength * (1 - fraction);

    const fillElement = document.getElementById('redness-radial-fill');
    const valueDisplay = document.getElementById('redness-value');
    const annotationDisplay = document.getElementById('redness-annotation');
    const ptrSclera = document.getElementById('pointer-sclera');

    if (fillElement) {
      fillElement.style.strokeDashoffset = targetOffset;
      if (avgScore > 0.15) {
        fillElement.style.stroke = 'var(--color-status-alert, #f7768e)';
      } else if (avgScore > 0.08) {
        fillElement.style.stroke = 'var(--color-status-amber, #e0af68)';
      } else {
        fillElement.style.stroke = 'var(--color-status-safe, #9ece6a)';
      }
    }

    if (valueDisplay) {
      const targetPct = avgScore * 100;
      this.animateValue(valueDisplay, targetPct, 600, (v) => `${v.toFixed(1)}%`);
    }

    if (ptrSclera) {
      ptrSclera.style.left = this.calculatePointerPosition('sclera', avgScore);
    }

    if (annotationDisplay) {
      if (avgScore > 0.15) {
        annotationDisplay.textContent = "HIGH VASCULAR INJECTION";
        annotationDisplay.style.color = "#f7768e";
      } else if (avgScore > 0.08) {
        annotationDisplay.textContent = "ELEVATED VASCULAR INJECTION";
        annotationDisplay.style.color = "#e0af68";
      } else {
        annotationDisplay.textContent = "NORMAL VASCULAR PATTERN";
        annotationDisplay.style.color = "#9ece6a";
      }
    }

    // Populate Biomarker Sub-Data Box
    const densityEl = document.getElementById('raw-sclera-density');
    const areaEl = document.getElementById('raw-sclera-area');
    const chromaEl = document.getElementById('raw-sclera-chroma');

    if (densityEl) densityEl.textContent = avgScore.toFixed(3);
    if (areaEl) areaEl.textContent = `${(avgScore * 100).toFixed(1)}%`;
    if (chromaEl) chromaEl.textContent = `±${(Math.abs(leftScore - rightScore) / 2.0).toFixed(3)}`;
  },

  /**
   * Updates Pupil Dilation (PIR) Radial Gauge, Spectrum Pointer & Raw Biomarker Sub-Data
   */
  updatePupil(avgPir, leftPir = null, rightPir = null) {
    const minPir = 0.10;
    const maxPir = 0.60;
    const fraction = Math.max(0, Math.min(1, (avgPir - minPir) / (maxPir - minPir)));

    const arcLength = 141.37;
    const targetOffset = arcLength * (1 - fraction);

    const fillElement = document.getElementById('pupil-radial-fill');
    const valueDisplay = document.getElementById('pupil-value');
    const annotationDisplay = document.getElementById('pupil-annotation');
    const ptrPir = document.getElementById('pointer-pir');

    if (fillElement) {
      fillElement.style.strokeDashoffset = targetOffset;
      if (avgPir < 0.18 || avgPir > 0.45) {
        fillElement.style.stroke = 'var(--color-status-alert, #f7768e)';
      } else {
        fillElement.style.stroke = 'var(--color-accent-purple, #bb9af7)';
      }
    }

    if (valueDisplay) {
      this.animateValue(valueDisplay, avgPir, 600, (v) => v.toFixed(2));
    }

    if (ptrPir) {
      ptrPir.style.left = this.calculatePointerPosition('pir', avgPir);
    }

    if (annotationDisplay) {
      if (avgPir > 0.45) {
        annotationDisplay.textContent = "MYDRIASIS DETECTED (Stimulant)";
        annotationDisplay.style.color = "#f7768e";
      } else if (avgPir < 0.18) {
        annotationDisplay.textContent = "MIOSIS DETECTED (Opioid/Depressant)";
        annotationDisplay.style.color = "#f7768e";
      } else {
        annotationDisplay.textContent = "NORMAL PUPIL DYNAMICS";
        annotationDisplay.style.color = "#9ece6a";
      }
    }

    const lVal = leftPir !== null ? leftPir : avgPir;
    const rVal = rightPir !== null ? rightPir : avgPir;
    const anisocoria = Math.abs(lVal - rVal);

    const lEl = document.getElementById('raw-pir-left');
    const rEl = document.getElementById('raw-pir-right');
    const aEl = document.getElementById('raw-pir-anisocoria');

    if (lEl) lEl.textContent = lVal.toFixed(2);
    if (rEl) rEl.textContent = rVal.toFixed(2);
    if (aEl) aEl.textContent = `${anisocoria.toFixed(3)}`;
  },

  /**
   * Updates Eyelid Aperture Radial Gauge, Spectrum Pointer & Raw Biomarker Sub-Data
   */
  updateEyelids(avgAperture, leftAperture = null, rightAperture = null) {
    const minAperture = 0.20;
    const maxAperture = 0.50;
    const fraction = Math.max(0, Math.min(1, (avgAperture - minAperture) / (maxAperture - minAperture)));

    const arcLength = 141.37;
    const targetOffset = arcLength * (1 - fraction);

    const fillElement = document.getElementById('eyelid-radial-fill');
    const valueDisplay = document.getElementById('eyelid-value');
    const annotationDisplay = document.getElementById('eyelid-annotation');
    const ptrAperture = document.getElementById('pointer-aperture');

    if (fillElement) {
      fillElement.style.strokeDashoffset = targetOffset;
      if (avgAperture < 0.30) {
        fillElement.style.stroke = 'var(--color-status-alert, #f7768e)';
      } else {
        fillElement.style.stroke = 'var(--color-status-safe, #9ece6a)';
      }
    }

    if (valueDisplay) {
      this.animateValue(valueDisplay, avgAperture, 600, (v) => v.toFixed(2));
    }

    if (ptrAperture) {
      ptrAperture.style.left = this.calculatePointerPosition('aperture', avgAperture);
    }

    if (annotationDisplay) {
      if (avgAperture < 0.30) {
        annotationDisplay.textContent = "SEVERE PTOSIS DELTA";
        annotationDisplay.style.color = "#f7768e";
      } else {
        annotationDisplay.textContent = "NORMAL EYELID APERTURE";
        annotationDisplay.style.color = "#9ece6a";
      }
    }

    const lVal = leftAperture !== null ? leftAperture : avgAperture;
    const rVal = rightAperture !== null ? rightAperture : avgAperture;
    const symmetry = Math.abs(lVal - rVal);

    const lEl = document.getElementById('raw-eyelid-left');
    const rEl = document.getElementById('raw-eyelid-right');
    const sEl = document.getElementById('raw-eyelid-symmetry');

    if (lEl) lEl.textContent = lVal.toFixed(2);
    if (rEl) rEl.textContent = rVal.toFixed(2);
    if (sEl) sEl.textContent = `${symmetry.toFixed(3)}`;
  },

  /**
   * Animates numbers/tickers in editorial block
   */
  animateTicker(element, targetText, duration = 400) {
    if (!element) return;
    element.style.opacity = 0;
    setTimeout(() => {
      element.textContent = targetText;
      element.style.opacity = 1;
    }, duration);
  }
};
