/**
 * Telemetry Text Scramble Engine for NEUROSIGHT (cinematic.md Phase 3)
 * Emulates military-grade sci-fi ocular tracking data decryption.
 */

export class TextScrambler {
  constructor(chars = '!<>-_\\/[]{}—=+*^?#________') {
    this.chars = chars;
  }

  /**
   * Scrambles an element's text content, resolving to finalValue over duration.
   * @param {HTMLElement} element - Target DOM node
   * @param {string} finalValue - True numeric/text string to resolve
   * @param {number} duration - Animation duration in ms (default 600)
   * @returns {Promise<void>} Resolves when scramble animation completes
   */
  scramble(element, finalValue, duration = 600) {
    if (!element) return Promise.resolve();

    const targetStr = String(finalValue);
    const length = targetStr.length;
    const startTime = performance.now();
    const intervalMs = 30;

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const resolvedChars = Math.floor(progress * length);

        let output = '';
        for (let i = 0; i < length; i++) {
          if (i < resolvedChars) {
            output += targetStr[i];
          } else {
            const randomChar = this.chars[Math.floor(Math.random() * this.chars.length)];
            output += randomChar;
          }
        }

        element.textContent = output;

        if (progress >= 1) {
          clearInterval(timer);
          element.textContent = targetStr;
          resolve();
        }
      }, intervalMs);
    });
  }
}

export const textScrambler = new TextScrambler();
