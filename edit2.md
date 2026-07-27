Act as a Principal Frontend Engineer and Data Visualization Architect specializing in high-performance dashboard interfaces (Chart.js / D3.js / Canvas API). You are tasked with upgrading the Telemetry & Analytics (Archives View) section of the Aegis-Eye platform.

Your sole objective is to implement Section 2: Telemetry & Analytics Enhancements into the existing frontend (`app/static/index.html` or associated CSS/JS modules). The enhancements must maintain high rendering performance, support dynamic dataset manipulation, and match the Tokyo Night dark-mode sci-fi aesthetic.

Execute this comprehensive implementation protocol across four detailed phases:

================================================================================
PHASE 1: INTERACTIVE RADIAL GAUGES FOR METRICS
================================================================================
Replace static linear progress bars with custom interactive circular gauge dials for key ocular metrics.

1. **Gauge Architecture & Initialization:**
   - Construct circular canvas/SVG radial gauge components for:
     - **Sclera Redness Ratio**
     - **Pupil-to-Iris Ratio (PIR)**
     - **Eyelid Aperture**
   - Implement semi-circular or 270-degree arc sweeps using CSS SVG `stroke-dasharray` / `stroke-dashoffset` or Chart.js doughnut charts with `circumference: 270` and `rotation: 225`.

2. **Styling & Threshold Markers:**
   - Apply glowing gradient fills along the gauge arcs matching Tokyo Night design tokens:
     - Background track: `rgba(255, 255, 255, 0.05)` with `1px` border ring.
     - Gauge fill gradient: Transitioning from `--color-accent-cyan` through `--color-accent-purple` to `--color-accent-red` as values approach critical thresholds.
   - Render dynamic digital readouts at the center of each dial using monospace typography (`--font-mono`), displaying the exact numeric percentage/ratio and units.
   - Add threshold indicator markers (e.g., dynamic tick lines or colored arcs indicating normal vs. critical boundaries).

3. **Smooth Value Interpolation:**
   - Animate gauge transitions when new diagnostic data arrives using `requestAnimationFrame` or SVG dash-offset transitions (`transition: stroke-dashoffset 0.8s var(--ease-smooth)`).

================================================================================
PHASE 2: TIME-SERIES CHART CONTROLS & DYNAMIC DATASETS
================================================================================
Upgrade the "Biometric Impairment Chronology" graph with multi-scale range selection, dataset toggling, and rich contextual tooltips.

1. **Quick Range Selectors:**
   - Add a sleek filter pill bar directly above the chronology chart containing time controls: `[1D]`, `[7D]`, `[1M]`, `[ALL]`.
   - Implement event listeners on the range buttons:
     - On click, slice or filter the underlying historical telemetry array based on the selected timestamp window.
     - Update the X-axis scale dynamically and trigger `chart.update('active')` with smooth re-rendering transitions.
     - Highlight the currently active range button using `--color-accent-purple` glow and a `.is-active` class.

2. **Toggleable Dataset Legend:**
   - Implement interactive legend pills allowing operators to toggle individual data curves on/off:
     - `Sclera Redness` curve toggle
     - `Pupil-to-Iris Ratio (PIR)` curve toggle
     - `Eyelid Movement` curve toggle
   - When a dataset is hidden, smoothly fade out its line and fill area (`dataset.hidden = !dataset.hidden`), adjusting Y-axis scaling dynamically.

3. **Snapshot Card Tooltips:**
   - Override default canvas tooltips with a custom HTML/CSS floating snapshot card (`div.chart-tooltip-card`).
   - On data point hover:
     - Display a frosted glass tooltip (`backdrop-filter: blur(12px)`) displaying timestamp, exact value readouts, risk classification label, and operator ID.
     - Highlight the corresponding data point on the chart canvas with a glowing ring marker.

================================================================================
PHASE 3: AUDIT LOGS TABLE UPGRADES
================================================================================
Transform the static audit logs table into a filterable, interactive telemetry vault.

1. **Category Filter Pills:**
   - Create a horizontal filter control bar above the table with status filter buttons:
     - `[ALL]`
     - `[CLEARED]`
     - `[IMPAIRMENT]`
     - `[INFECTION]`
     - `[TRAUMA]`
   - Filter logic: Upon selecting a status pill, instantly filter the DOM table rows or recalculate the rendered array, displaying matching historical records with an animation fade-in.

2. **Interactive Row Inspection (Drawer/Modal):**
   - Add cursor hover feedback (`cursor: pointer`, row highlight background `rgba(122, 162, 247, 0.08)`) to every audit log row.
   - On row click:
     - Trigger a sliding side-drawer or modal overlay (`div.inspection-drawer`).
     - Populate the inspection drawer with the selected record's full diagnostic state:
       - Original ocular input snapshot.
       - Left/Right split ocular segmentation panes with bounding reticles.
       - Complete raw metrics breakdown (Sclera ratio, PIR, Aperture delta, Liveness score).
       - Compliance verification state, hash ID, and export button.
   - Include smooth slide-in (`transform: translateX(0)`) and slide-out transitions, alongside backdrop click-to-close handler.

================================================================================
PHASE 4: INTEGRATION & VERIFICATION
================================================================================
Bind data structures, update DOM templates, and test UI interactions.

1. Ensure all new components integrate seamlessly into the existing Archives panel markup.
2. Verify Chart.js / D3 initialization handles window resizing cleanly with responsive container wrappers.
3. Test filter logic, range selectors, and drawer toggles to confirm zero console errors and fluid 60 FPS transitions.