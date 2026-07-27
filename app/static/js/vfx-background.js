/**
 * Ambient Parallax Grid Canvas Engine for NEUROSIGHT (cinematic.md Phase 1)
 * High-performance 2D Canvas matrix node grid with interactive mouse parallax and energy particles.
 */

export class VFXBackground {
  constructor(canvasId = 'vfx-bg-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.devicePixelRatio = window.devicePixelRatio || 1;

    // Grid spacing
    this.gridSpacing = 60;

    // Mouse parallax tracking
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;

    // Animation state
    this.animId = null;
    this.isPaused = false;

    // Floating particles (16 ambient energy specs)
    this.particles = [];
    this.numParticles = 16;

    this.init();
  }

  init() {
    this.resize();
    this.initParticles();
    this.bindEvents();
    this.start();
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.devicePixelRatio;
    this.canvas.height = this.height * this.devicePixelRatio;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 1.5 + 0.5,
        speedY: Math.random() * 0.4 + 0.2,
        opacity: Math.random() * 0.5 + 0.1
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize(), { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.targetX = (e.clientX - this.width / 2) * 0.015;
      this.targetY = (e.clientY - this.height / 2) * 0.015;
    }, { passive: true });

    // Lifecycle Guard: Pause render loop when tab is hidden to save CPU/battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.start();
      }
    });
  }

  start() {
    if (this.isPaused || !this.animId) {
      this.isPaused = false;
      this.render();
    }
  }

  pause() {
    this.isPaused = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  render() {
    if (this.isPaused) return;

    // Smooth Lerp Mouse Offset
    this.currentX += (this.targetX - this.currentX) * 0.08;
    this.currentY += (this.targetY - this.currentY) * 0.08;

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.currentX, this.currentY);

    // 1. Render Matrix Node Grid & Connection Lines (O(N) high-fps grid algorithm)
    const cols = Math.ceil(this.width / this.gridSpacing) + 1;
    const rows = Math.ceil(this.height / this.gridSpacing) + 1;
    const startX = -this.gridSpacing;
    const startY = -this.gridSpacing;

    this.ctx.strokeStyle = 'rgba(125, 207, 255, 0.05)';
    this.ctx.fillStyle = 'rgba(125, 207, 255, 0.12)';
    this.ctx.lineWidth = 1;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const nx = startX + c * this.gridSpacing;
        const ny = startY + r * this.gridSpacing;

        // Draw Node Dot
        this.ctx.beginPath();
        this.ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Connect to right neighbor
        if (c < cols) {
          this.ctx.beginPath();
          this.ctx.moveTo(nx, ny);
          this.ctx.lineTo(nx + this.gridSpacing, ny);
          this.ctx.stroke();
        }
        // Connect to bottom neighbor
        if (r < rows) {
          this.ctx.beginPath();
          this.ctx.moveTo(nx, ny);
          this.ctx.lineTo(nx, ny + this.gridSpacing);
          this.ctx.stroke();
        }
      }
    }

    // 2. Render Floating Energy Spec Particles
    for (let p of this.particles) {
      p.y -= p.speedY;
      if (p.y < 0) {
        p.y = this.height;
        p.x = Math.random() * this.width;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(125, 207, 255, ${p.opacity})`;
      this.ctx.fill();
    }

    this.ctx.restore();

    this.animId = requestAnimationFrame(() => this.render());
  }
}
