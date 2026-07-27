import uuid
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from app.services.drug_narcotic_analyzer import estimate_pupil_metrics
from app.services.infection_analyzer import compute_eye_redness_and_mask
from app.services.trauma_fatigue_analyzer import compute_ptosis_ratio_and_overlay

# MediaPipe Index lists for landmarks
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]
RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]

LEFT_PTOSIS_INDICES = [159, 145, 33, 133]
RIGHT_PTOSIS_INDICES = [386, 374, 362, 263]

# Illumination check landmarks: forehead (10), nose tip (4), left cheek (234), right cheek (454), chin (152)
ILLUMINATION_LANDMARKS = [10, 4, 234, 454, 152]


def extract_pixel_intensity(image: np.ndarray, pt: Tuple[int, int], radius: int = 5) -> float:
    """Helper to extract mean grayscale intensity in a small radius around a coordinate."""
    h, w = image.shape[:2]
    cx, cy = pt
    
    # Define bounding box
    x_min = max(0, cx - radius)
    x_max = min(w - 1, cx + radius)
    y_min = max(0, cy - radius)
    y_max = min(h - 1, cy + radius)
    
    if x_max <= x_min or y_max <= y_min:
        return 128.0  # neutral mid-gray fallback
        
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    roi = gray[y_min:y_max+1, x_min:x_max+1]
    return float(np.mean(roi))


def get_mesh_coords(landmarks: Any, indices: List[int], img_w: int, img_h: int) -> List[Tuple[int, int]]:
    """Helper to map normalized landmarks list to pixel coordinates."""
    coords = []
    for idx in indices:
        l = landmarks[idx]
        coords.append((int(l.x * img_w), int(l.y * img_h)))
    return coords


def calibrate_session_profile(
    frames: List[np.ndarray], 
    detector: Any
) -> Dict[str, Any]:
    """
    Ingests sequential frames (e.g. 90 frames at 30fps for a 3-second calibration phase).
    Extracts face mesh landmarks, baseline PIR, Sclera redness, eyelid aperture,
    and maps localized ambient illumination variance across the face.
    """
    session_id = str(uuid.uuid4())
    
    pir_samples = []
    redness_samples = []
    aperture_samples = []
    lux_variances = []
    
    for frame in frames:
        if frame is None or frame.size == 0:
            continue
            
        img_h, img_w = frame.shape[:2]
        
        # Run face mesh detection
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        import mediapipe as mp
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        
        detection_result = detector.detect(mp_image)
        if not detection_result.face_landmarks:
            continue
            
        landmarks = detection_result.face_landmarks[0]
        
        # 1. Extract Pupil-to-Iris Ratio (PIR)
        left_iris = get_mesh_coords(landmarks, LEFT_IRIS_INDICES, img_w, img_h)
        right_iris = get_mesh_coords(landmarks, RIGHT_IRIS_INDICES, img_w, img_h)
        left_eye = get_mesh_coords(landmarks, LEFT_EYE_INDICES, img_w, img_h)
        right_eye = get_mesh_coords(landmarks, RIGHT_EYE_INDICES, img_w, img_h)
        
        left_pir, _, _, _, _ = estimate_pupil_metrics(frame, left_iris, left_eye, is_left=True)
        right_pir, _, _, _, _ = estimate_pupil_metrics(frame, right_iris, right_eye, is_left=False)
        pir_samples.append((left_pir + right_pir) / 2.0)
        
        # 2. Extract Sclera Redness
        left_red, _ = compute_eye_redness_and_mask(frame, left_eye)
        right_red, _ = compute_eye_redness_and_mask(frame, right_eye)
        redness_samples.append((left_red + right_red) / 2.0)
        
        # 3. Extract Eyelid Aperture
        left_ptosis = get_mesh_coords(landmarks, LEFT_PTOSIS_INDICES, img_w, img_h)
        right_ptosis = get_mesh_coords(landmarks, RIGHT_PTOSIS_INDICES, img_w, img_h)
        left_ap, _ = compute_ptosis_ratio_and_overlay(frame, left_ptosis, is_left=True)
        right_ap, _ = compute_ptosis_ratio_and_overlay(frame, right_ptosis, is_left=False)
        aperture_samples.append((left_ap + right_ap) / 2.0)
        
        # 4. Map Localized Lux Variances across face mesh
        illum_pts = get_mesh_coords(landmarks, ILLUMINATION_LANDMARKS, img_w, img_h)
        intensities = [extract_pixel_intensity(frame, pt) for pt in illum_pts]
        
        # Standard deviation and variance coefficient of face surface intensity vectors
        if intensities:
            std_dev = np.std(intensities)
            mean_val = np.mean(intensities)
            var_coeff = (std_dev / mean_val) if mean_val > 0 else 0.0
            lux_variances.append(var_coeff)
            
    # Compile baselines with robust defaults for missing datasets
    baseline_pir = float(np.mean(pir_samples)) if pir_samples else 0.33
    baseline_redness = float(np.mean(redness_samples)) if redness_samples else 0.04
    baseline_aperture = float(np.mean(aperture_samples)) if aperture_samples else 0.38
    lux_delta = float(np.mean(lux_variances)) if lux_variances else 0.0
    
    return {
        "session_id": session_id,
        "baseline_pir": round(baseline_pir, 4),
        "baseline_redness": round(baseline_redness, 4),
        "baseline_aperture": round(baseline_aperture, 4),
        "lux_delta": round(lux_delta, 4)
    }
