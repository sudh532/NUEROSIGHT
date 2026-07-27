/**
 * Precision Ocular Mesh Reticle & Interactive Scanning Canvas
 */
export const Canvas3D = {
  activeTrackers: [],

  initReticle(containerId, isLeft) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove any existing canvas
    const oldCanvas = container.querySelector('.reticle-canvas');
    if (oldCanvas) oldCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.className = 'reticle-canvas eye-tracking-overlay';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'auto';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = container.clientWidth;
    let height = canvas.height = container.clientHeight;

    const resizeObserver = new ResizeObserver(() => {
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
      drawStaticGrid();
    });
    resizeObserver.observe(container);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let isHovered = false;
    let animationFrameId = null;

    const drawStaticGrid = () => {
      ctx.clearRect(0, 0, width, height);
      // Subtle background scanlines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
      ctx.lineWidth = 0.5;
      
      // Grid cells
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const drawReticle = () => {
      if (!isHovered) {
        drawStaticGrid();
        animationFrameId = requestAnimationFrame(drawReticle);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      drawStaticGrid();

      // Dynamic pointer crosshair (Editorial Style: single pixel thin lines)
      ctx.strokeStyle = 'var(--text-primary)';
      ctx.lineWidth = 0.5;

      // Draw horizontal tracking line
      ctx.beginPath();
      ctx.moveTo(0, mouseY);
      ctx.lineTo(width, mouseY);
      ctx.stroke();

      // Draw vertical tracking line
      ctx.beginPath();
      ctx.moveTo(mouseX, 0);
      ctx.lineTo(mouseX, height);
      ctx.stroke();

      // Concentric structural reticle rings
      ctx.strokeStyle = 'var(--text-primary)';
      ctx.lineWidth = 0.75;
      
      // Ring 1 (Inner target)
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2 (Outer target with dashes)
      ctx.strokeStyle = 'var(--text-secondary)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ocular Coordinates indicator
      ctx.fillStyle = 'var(--text-primary)';
      ctx.font = '7px var(--font-mono)';
      ctx.fillText(`LOC: [${Math.round(mouseX)}, ${Math.round(mouseY)}]`, mouseX + 8, mouseY - 8);
      ctx.fillText(`LENS: ${isLeft ? 'L_OS' : 'R_OD'}`, mouseX + 8, mouseY + 14);

      animationFrameId = requestAnimationFrame(drawReticle);
    };

    // Event listeners
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const onMouseEnter = () => {
      isHovered = true;
    };

    const onMouseLeave = () => {
      isHovered = false;
      ctx.clearRect(0, 0, width, height);
      drawStaticGrid();
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseenter', onMouseEnter);
    canvas.addEventListener('mouseleave', onMouseLeave);

    drawStaticGrid();
    drawReticle();

    this.activeTrackers.push({
      canvas,
      resizeObserver,
      cleanup: () => {
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseenter', onMouseEnter);
        canvas.removeEventListener('mouseleave', onMouseLeave);
        resizeObserver.disconnect();
        cancelAnimationFrame(animationFrameId);
      }
    });
  },

  clearAllTrackers() {
    this.activeTrackers.forEach(t => t.cleanup());
    this.activeTrackers = [];
  }
};
