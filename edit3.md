Act as a Principal Software Engineer and Full-Stack Web Application Architect specializing in real-time media streams, browser API integration, and compliance reporting interfaces. You are tasked with upgrading the Workflow & Operational Features layer of the Aegis-Eye platform.

Your sole objective is to implement Section 3: Workflow & Operational Features into the existing frontend (`app/static/index.html` or associated JS/CSS modules). All implementations must be robust, properly clean up system resources (e.g., closing camera media tracks), and maintain the Tokyo Night sci-fi HUD theme.

Execute this comprehensive implementation protocol across four detailed phases:

================================================================================
PHASE 1: LIVE CAMERA STREAM MODE (WEBCAM INTEGRATION)
================================================================================
Implement real-time webcam stream capture as an alternative input method to static file uploads.

1. **Input Mode Toggle Switch:**
   - Add a segmented toggle control above the dropzone area with two states:
     - `[FILE UPLOAD]` (Default)
     - `[LIVE WEBCAM SCAN]`
   - Style the active state pill with `--color-accent-purple` lighting and smooth sliding highlight transitions.

2. **Webcam Stream Pipeline (`navigator.mediaDevices.getUserMedia`):**
   - When switching to `[LIVE WEBCAM SCAN]`:
     - Swap the static file dropzone with an active HTML5 `<video id="webcam-preview" autoplay playsinline muted>` element embedded inside a dark glass card container.
     - Call `navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } })`.
     - Attach the returned `MediaStream` to `video.srcObject`.
     - Display a dynamic "Camera Active" status icon with a pulsing green indicator dot.

3. **Frame Capture & API Submission:**
   - Add a prominent "Capture & Analyze Frame" trigger button below the video stream.
   - On capture button click:
     - Instantiate an off-screen HTML5 `<canvas>` element matching video stream dimensions.
     - Execute `canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height)`.
     - Export canvas payload using `canvas.toBlob(blob => { ... }, 'image/jpeg', 0.95)`.
     - Package the blob into a `FormData` payload and dispatch it to the existing `POST /api/detect` backend route.
     - Overlay a quick flash effect (`@keyframes shutter-flash`) on the video viewfinder to provide instant visual feedback.

4. **Resource Cleanup & Error Handling:**
   - When switching back to `[FILE UPLOAD]` or navigating away, cleanly stop all video tracks using `stream.getTracks().forEach(track => track.stop())` to release camera access.
   - Gracefully catch permission denied errors (`NotAllowedError`, `NotFoundError`) and display a dark glass alert overlay detailing camera access requirements.

================================================================================
PHASE 2: PDF / JSON REPORT PREVIEW MODAL
================================================================================
Construct an interactive preview modal before exporting compliance diagnostic records.

1. **Modal DOM Structure & Triggers:**
   - Bind an event listener to the "Export Compliance Report (PDF)" button.
   - Render a fixed backdrop overlay (`div.report-modal-backdrop`) with `backdrop-filter: blur(16px)` and opacity transitions.
   - Construct a central modal viewport (`div.report-modal-container`) styled in Tokyo Night glassmorphic aesthetics.

2. **Report Preview Contents:**
   - **Header:** Aegis-Eye Official Compliance Document header, Case Hash ID, Timestamp, Operator ID, and Security Classification badge.
   - **Biometric Summary:** Rendered thumbnails of primary face input and split ocular segmentations side-by-side.
   - **Telemetry Metrics Table:** Itemized breakdown of Sclera Redness, Pupil-to-Iris Ratio, Eyelid Aperture, and Liveness score with PASS/FAIL indicator chips.
   - **RAW JSON View Toggle:** A tab switch inside the modal to toggle between "Formatted PDF Sheet" and "Raw System Telemetry (JSON)".

3. **Export Execution Actions:**
   - Add action buttons at the modal footer:
     - `[PRINT / SAVE PDF]`: Calls `window.print()` using a dedicated CSS `@media print` print-stylesheet that formats the report cleanly on a white background with high-contrast text.
     - `[DOWNLOAD RAW JSON]`: Instantiates a `Blob` containing the diagnostic JSON and triggers an automated browser download (`aegis_eye_report_[CASE_HASH].json`).
     - `[CLOSE MODAL]`: Dismisses the modal and restores keyboard focus to the main dashboard.

================================================================================
PHASE 3: AUDIO TELEMETRY CUES (SYNTHESIZED SOUND EFFECTS)
================================================================================
Provide subtle acoustic feedback using the native Web Audio API without requiring external audio file assets.

1. **Audio Context Engine:**
   - Initialize a global browser `AudioContext` lazily on first user gesture to comply with browser autoplay policies.
   - Add a global mute/unmute audio toggle button in the top navigation bar with visual status indicators (`[SOUND: ON]` / `[SOUND: OFF]`).

2. **Procedural Sound Effects:**
   - **Navigation Tactile Click:**
     - Generate a short 10ms high-frequency sine pulse (`frequency: 800Hz` decaying rapidly to `100Hz`) when switching between `DIAGNOSIS` and `ARCHIVES` tabs.
   - **Scan Processing Pulse:**
     - Generate a subtle dual-tone sweep while an image analysis payload is in flight.
   - **Alert Chime (Critical Result / Spoof Alert):**
     - Generate an urgent 2-stage square wave alarm sequence (`frequency: 440Hz` -> `880Hz` with low-pass filtering) when a `SPOOF ALERT` or `CRITICAL IMPAIRMENT` verdict is returned.
   - **Verified Chime (Cleared Result):**
     - Generate a smooth major-third sine chime (`frequency: 523.25Hz` -> `659.25Hz`) when a `CLEARED` verdict is returned.

================================================================================
PHASE 4: INTEGRATION & VERIFICATION
================================================================================
Integrate modules, handle state bindings, and conduct runtime verification.

1. Ensure the camera pipeline gracefully falls back on devices without webcam hardware.
2. Verify that `@media print` rules isolate the report container while hiding dashboard navigation, sidebar buttons, and background gradients.
3. Test audio playback state across all browser interaction pathways to ensure zero console warnings or unhandled audio context promises.