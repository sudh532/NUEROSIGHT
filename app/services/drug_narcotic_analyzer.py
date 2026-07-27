import cv2
import numpy as np
from typing import Tuple, Dict, Any, List

def analyze_drug_impairment(
    image: np.ndarray,
    left_iris_coords: List[Tuple[int, int]],
    right_iris_coords: List[Tuple[int, int]],
    left_eye_coords: List[Tuple[int, int]],
    right_eye_coords: List[Tuple[int, int]],
    redness_metrics: Dict[str, Any],
    lighting_profile: str = "artificial"
) -> Tuple[Dict[str, Any], np.ndarray]:
    """
    Computes Pupil-to-Iris Ratio (PIR) via concentric boundaries.
    Applies lighting profile offsets and classifies stimulants, opioids, or cannabis categories.
    """
    overlay = np.zeros_like(image)
    
    # 1. Estimate pupil and iris diameters for left/right eye
    left_pir, left_iris_dia, left_pupil_dia, left_drift, left_overlay = estimate_pupil_metrics(
        image, left_iris_coords, left_eye_coords, is_left=True
    )
    right_pir, right_iris_dia, right_pupil_dia, right_drift, right_overlay = estimate_pupil_metrics(
        image, right_iris_coords, right_eye_coords, is_left=False
    )
    
    # Merge visual overlays
    overlay = cv2.addWeighted(overlay, 1.0, left_overlay, 1.0, 0)
    overlay = cv2.addWeighted(overlay, 1.0, right_overlay, 1.0, 0)
    
    avg_pir = (left_pir + right_pir) / 2.0
    avg_drift = (left_drift + right_drift) / 2.0
    
    # 2. Lighting Profile Adjustments
    # Offset dilation limits based on ambient light
    light_offset = 0.0
    if lighting_profile == "low_light":
        light_offset = 0.04  # Expected physiological dilation
    elif lighting_profile == "sunlight":
        light_offset = -0.04 # Expected physiological constriction
        
    # Adjusted thresholds
    stimulant_threshold = 0.48 + light_offset
    depressant_threshold = 0.20 + light_offset
    
    # 3. Impairment Classification Logic
    verdict_category = "None"
    impairment_score = 0.0
    
    avg_redness = (redness_metrics.get("left_redness", 0.0) + redness_metrics.get("right_redness", 0.0)) / 2.0
    exudate_detected = redness_metrics.get("exudate_detected", False)
    
    if avg_pir > stimulant_threshold:
        # Severe Mydriasis
        verdict_category = "CNS Stimulant"
        deviation = avg_pir - stimulant_threshold
        impairment_score = min(0.99, 0.65 + deviation * 2.0)
    elif avg_pir < depressant_threshold:
        # Severe Miosis (pinpoint)
        verdict_category = "CNS Depressant"
        deviation = depressant_threshold - avg_pir
        impairment_score = min(0.99, 0.70 + deviation * 2.5)
    elif avg_redness > 0.18 and not exudate_detected:
        # Bilateral symmetrical redness without yellow/green infection exudates
        verdict_category = "Cannabis/Alcohol"
        impairment_score = min(0.99, 0.50 + (avg_redness - 0.18) * 1.5)
    else:
        # Check for gaze drift / nystagmus impairment indicator
        if avg_drift > 0.09:
            verdict_category = "Gaze Instability Detected"
            impairment_score = min(0.60, avg_drift * 5.0)
        else:
            impairment_score = min(0.25, avg_pir * 0.5)

    metrics = {
        "left_pir": float(left_pir),
        "right_pir": float(right_pir),
        "avg_pir": float(avg_pir),
        "gaze_drift": float(avg_drift),
        "detected_category": verdict_category,
        "impairment_score": float(impairment_score)
    }

    return metrics, overlay


def estimate_pupil_metrics(
    image: np.ndarray, 
    iris_coords: List[Tuple[int, int]], 
    eye_coords: List[Tuple[int, int]],
    is_left: bool
) -> Tuple[float, float, float, float, np.ndarray]:
    """Helper to detect iris circle, segment pupil, check drift, and draw overlay."""
    h, w, _ = image.shape
    overlay = np.zeros_like(image)

    if not iris_coords or len(iris_coords) < 3:
        return 0.33, 30.0, 10.0, 0.0, overlay
        
    # 1. Fit circle over iris points to estimate iris center (cx, cy) and diameter (HID)
    pts = np.array(iris_coords, dtype=np.int32)
    (cx, cy), radius = cv2.minEnclosingCircle(pts)
    cx, cy = int(cx), int(cy)
    hid = radius * 2.0
    
    # Draw green circle for iris boundary
    cv2.circle(overlay, (cx, cy), int(radius), (0, 255, 0), 2)
    
    # 2. Estimate pupil center and size
    # Crop a small region of interest (ROI) centered on the iris
    roi_radius = int(radius * 0.9)
    x_min = max(0, cx - roi_radius)
    x_max = min(w, cx + roi_radius)
    y_min = max(0, cy - roi_radius)
    y_max = min(h, cy + roi_radius)
    
    roi = image[y_min:y_max, x_min:x_max]
    
    pupil_dia = hid * 0.33  # baseline fallback
    pcx, pcy = cx, cy       # baseline fallback
    
    if roi.size > 0:
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        # Pupil is the darkest central region, apply thresholding
        _, thresh = cv2.threshold(gray, 40, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_contour = None
        min_dist_to_center = float('inf')
        
        roi_center = (roi_radius, roi_radius)
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < (hid * 0.04) ** 2:
                continue
            
            # Compute centroid
            M = cv2.moments(contour)
            if M["m00"] != 0:
                ccx = M["m10"] / M["m00"]
                ccy = M["m01"] / M["m00"]
                dist = np.linalg.norm(np.array([ccx, ccy]) - np.array(roi_center))
                if dist < min_dist_to_center:
                    min_dist_to_center = dist
                    best_contour = contour
                    
        if best_contour is not None and len(best_contour) >= 5:
            try:
                ellipse = cv2.fitEllipse(best_contour)
                pupil_dia = min(ellipse[1][0], ellipse[1][1])
                
                # Map back to main coordinates
                pcx = int(ellipse[0][0] + x_min)
                pcy = int(ellipse[0][1] + y_min)
                
                ellipse_center = (pcx, pcy)
                ellipse_axes = (int(ellipse[1][0] / 2), int(ellipse[1][1] / 2))
                ellipse_angle = ellipse[2]
                
                # Draw yellow ellipse for pupil boundary
                cv2.ellipse(overlay, ellipse_center, ellipse_axes, ellipse_angle, 0, 360, (0, 255, 255), 2)
            except Exception:
                pass
                
    # If fallback used or contour extraction failed, draw yellow fallback pupil circle
    if pcx == cx and pcy == cy:
        cv2.circle(overlay, (cx, cy), int(pupil_dia / 2), (0, 255, 255), 1)

    # 3. Compute PIR (Pupil-to-Iris Ratio)
    pir = pupil_dia / hid
    
    # 4. Compute horizontal displacement / gaze drift
    # Measure distance between pupil center and iris center normalized by iris diameter
    gaze_drift = abs(pcx - cx) / hid
    
    return float(pir), float(hid), float(pupil_dia), float(gaze_drift), overlay
