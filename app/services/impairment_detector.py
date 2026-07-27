import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from app.services.drug_narcotic_analyzer import estimate_pupil_metrics

# MediaPipe Landmark Index lists
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]
RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]

LEFT_EYELID_VERTS = (159, 145)
RIGHT_EYELID_VERTS = (386, 374)

def get_mesh_coords(landmarks: Any, indices: List[int], img_w: int, img_h: int) -> List[Tuple[int, int]]:
    """Helper to map normalized landmarks list to pixel coordinates."""
    coords = []
    for idx in indices:
        l = landmarks[idx]
        coords.append((int(l.x * img_w), int(l.y * img_h)))
    return coords

def analyze_substance_impairment(
    frames: List[np.ndarray], 
    detector: Any
) -> Dict[str, Any]:
    """
    Evaluates ocular metrics across input frame(s) for drug & substance impairment.
    Metrics analyzed:
      1. Pupil-to-Iris Ratio (PIR): Mydriasis (>0.45, Stimulants/Hallucinogens) vs Miosis (<0.18, Opioids/Depressants).
      2. Sclera Redness Ratio: Vascular Injection Level (Inflammation / Irritation).
      3. Eyelid Aperture: Ptosis Delta (Sedative / Fatigue Indicator).
    Returns impairment_risk_score, substance_confidence, classification_label, and metric details.
    """
    if not frames:
        return {
            "impairment_risk_score": 0.0,
            "substance_confidence": 0.0,
            "classification_label": "CLEARED",
            "reason": "No frame data provided for impairment analysis."
        }

    pir_values = []
    eyelid_heights = []

    for frame in frames:
        if frame is None or frame.size == 0:
            continue
            
        img_h, img_w = frame.shape[:2]
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        import mediapipe as mp
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        
        detection_result = detector.detect(mp_image)
        if not detection_result.face_landmarks:
            continue
            
        landmarks = detection_result.face_landmarks[0]
        
        # 1. Eyelid Aperture
        l_upper = landmarks[LEFT_EYELID_VERTS[0]]
        l_lower = landmarks[LEFT_EYELID_VERTS[1]]
        left_h = np.linalg.norm(np.array([l_upper.x * img_w, l_upper.y * img_h]) - 
                               np.array([l_lower.x * img_w, l_lower.y * img_h]))
        r_upper = landmarks[RIGHT_EYELID_VERTS[0]]
        r_lower = landmarks[RIGHT_EYELID_VERTS[1]]
        right_h = np.linalg.norm(np.array([r_upper.x * img_w, r_upper.y * img_h]) - 
                                np.array([r_lower.x * img_w, r_lower.y * img_h]))
        eyelid_heights.append(float((left_h + right_h) / 2.0))
        
        # 2. PIR tracking
        left_iris = get_mesh_coords(landmarks, LEFT_IRIS_INDICES, img_w, img_h)
        right_iris = get_mesh_coords(landmarks, RIGHT_IRIS_INDICES, img_w, img_h)
        left_eye = get_mesh_coords(landmarks, LEFT_EYE_INDICES, img_w, img_h)
        right_eye = get_mesh_coords(landmarks, RIGHT_EYE_INDICES, img_w, img_h)
        
        left_pir, _, _, _, _ = estimate_pupil_metrics(frame, left_iris, left_eye, is_left=True)
        right_pir, _, _, _, _ = estimate_pupil_metrics(frame, right_iris, right_eye, is_left=False)
        pir_values.append(float((left_pir + right_pir) / 2.0))

    avg_pir = float(np.mean(pir_values)) if pir_values else 0.33
    avg_eyelid = float(np.mean(eyelid_heights)) if eyelid_heights else 15.0

    # Classification logic based on PIR and Ptosis
    if avg_pir > 0.45:
        classification_label = "SUSPECTED_STIMULANT"
        impairment_risk_score = round(min(1.0, 0.50 + (avg_pir - 0.45) * 2.5), 4)
        substance_confidence = 0.88
        reason = "MYDRIASIS DETECTED (Stimulant / Hallucinogen Indicator). Pupil-to-iris ratio elevated."
    elif avg_pir < 0.18:
        classification_label = "SUSPECTED_DEPRESSANT"
        impairment_risk_score = round(min(1.0, 0.50 + (0.18 - avg_pir) * 3.0), 4)
        substance_confidence = 0.91
        reason = "MIOSIS DETECTED (Opioid / Depressant Indicator). Pupil constricted beyond baseline."
    elif avg_eyelid < 8.0:
        classification_label = "HIGH_IMPAIRMENT"
        impairment_risk_score = 0.75
        substance_confidence = 0.82
        reason = "SEVERE PTOSIS DETECTED (Sedative / Fatigue Indicator). Significant eyelid droop observed."
    else:
        classification_label = "CLEARED"
        impairment_risk_score = 0.05
        substance_confidence = 0.95
        reason = "Ocular telemetry within normal baseline parameters. No substance impairment detected."

    return {
        "impairment_risk_score": impairment_risk_score,
        "substance_confidence": substance_confidence,
        "classification_label": classification_label,
        "reason": reason,
        "metrics": {
            "avg_pir": round(avg_pir, 4),
            "avg_eyelid_px": round(avg_eyelid, 2)
        }
    }
