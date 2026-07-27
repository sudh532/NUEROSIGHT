Act as a Principal Frontend Engineer, UI/UX Micro-Interaction Specialist, and WebGL/CSS Shader Designer. You are tasked with upgrading the visual identity and HUD telemetry layer of the Aegis-Eye Ocular Platform. 

Your sole objective is to implement Section 1: Visual Polish & HUD Micro-Interactions into the existing frontend (`app/static/index.html` or dedicated CSS/JS modules). The enhancements must maintain a 60 FPS rendering pipeline, leverage GPU acceleration, and strictly adhere to the Tokyo Night sci-fi tactical aesthetic.

Execute this comprehensive implementation protocol across four detailed phases:

================================================================================
PHASE 1: SVG DYNAMIC HUD RETICLES & SEGMENTATION RETICLES
================================================================================
Enhance the split segmentation views (`L_00 // OCULAR` and `R_00 // OCULAR`) with interactive, dynamic HUD reticles.

1. **SVG Reticle Overlay Architecture:**
   - Overlay an inline SVG container (`width: 100%`, `height: 100%`, `pointer-events: none`, `position: absolute`) over both ocular segmentation image panes.
   - Inject animated vector reticle elements around detected pupil/iris bounds:
     - Outer dash-array tracking circle that slowly rotates clockwise (`transform-origin: center`, `@keyframes hud-spin-cw`).
     - Inner concentric target ring that counter-rotates (`@keyframes hud-spin-ccw`).
     - Corner bracket indicators bounding the eye matrix (`<path>` elements with `--color-accent-purple` stroke).

2. **Hover-Triggered Pulsing Crosshairs:**
   - Attach interactive event triggers to the biometric segmentation panes.
   - On hover, reveal dynamic crosshair guides (`.hud-crosshair-x`, `.hud-crosshair-y`) that track mouse/pointer position smoothly using `transform: translate3d()` for zero layout thrashing.
   - Add a subtle pulse animation on hover (`@keyframes crosshair-pulse`) using `stroke-dashoffset` variations and opacity oscillation.

================================================================================
PHASE 2: SCANLINE & PROCESSING LASER ANIMATIONS
================================================================================
Inject physical feedback during image analysis and telemetry updates.

1. **Primary Input Laser Scanline:**
   - Construct a dedicated scanline layer (`div.scanline-overlay`) over the main primary input face image container.
   - Style the laser bar:
     - Height: `2px` to `4px`.
     - Background: Gradient from `transparent` -> `var(--color-accent-cyan)` -> `transparent`.
     - Box-shadow: `0 0 12px var(--color-accent-cyan), 0 0 24px var(--color-accent-blue)`.
   - Implement `@keyframes laser-sweep`:
     - Smooth vertical translation from `top: 0%` to `top: 100%` and back.
     - Add a subtle trailing beam curtain (`background: linear-gradient(to bottom, rgba(125, 207, 255, 0.15), transparent)`) directly behind the scanning line.

2. **State-Driven Activation:**
   - Bind the scanline animation to processing states (`is-scanning` or `is-analyzing` CSS classes).
   - Ensure the scanline smoothly fades out (`opacity: 0`, `transition: opacity 0.4s`) once the analysis payload resolves.

================================================================================
PHASE 3: STATE-DRIVEN GLOW BORDERS & VERDICT TINTING
================================================================================
Dynamically update card surfaces and panel borders based on the API verdict response.

1. **Verdict CSS State Classes:**
   - Establish strict CSS class triggers on the primary telemetry panel:
     - `.state-critical` (SPOOF ALERT, IMPAIRMENT, TRAUMA)
     - `.state-verified` (CLEARED, VERIFIED)

2. **Dynamic Lighting Profiles:**
   - **For `.state-critical`:**
     - Border color transitions to `rgba(247, 118, 142, 0.8)` (`--color-accent-red`).
     - Box shadow activates an amber/red pulsing glow: `box-shadow: 0 0 20px rgba(247, 118, 142, 0.35), inset 0 0 15px rgba(247, 118, 142, 0.1)`.
     - Animate subtle border heartbeat using `@keyframes pulse-alert-border`.
   - **For `.state-verified`:**
     - Border color transitions to `rgba(125, 207, 255, 0.8)` (`--color-accent-cyan`).
     - Box shadow activates a clean emerald/cyan drop: `box-shadow: 0 0 20px rgba(125, 207, 255, 0.35), inset 0 0 15px rgba(125, 207, 255, 0.1)`.

3. **Smooth Color Interpolation:**
   - Ensure all border and shadow state changes transition smoothly using `transition: border-color 0.5s var(--ease-smooth), box-shadow 0.5s var(--ease-smooth)`.

================================================================================
PHASE 4: INTEGRATION & VERIFICATION
================================================================================
Inject the required CSS styles, update DOM structures, and bind state updates inside JavaScript.

1. Add the new `@keyframes` and HUD classes to your CSS stylesheet (or embedded `<style>` block).
2. Update the JavaScript handling the API response to dynamically toggle `.state-critical` and `.state-verified` based on `data.verdict` or `data.risk_score`.
3. Verify that all animations utilize GPU-accelerated CSS properties (`transform`, `opacity`, `filter`) to maintain crisp 60 FPS performance.