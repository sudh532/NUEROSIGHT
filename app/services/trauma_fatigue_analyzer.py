import cv2
import numpy as np
from typing import Tuple, Dict, Any, List

def analyze_trauma_fatigue(
    image: np.ndarray,
    left_ptosis_coords: List[Tuple[int, int]],
    right_ptosis_coords: List[Tuple[int, int]],
    left_pupil_dia: float,
    right_pupil_dia: float,
    left_iris_dia: float,
    right_iris_dia: float
) -> Tuple[Dict[str, Any], np.ndarray]:
    """
    Measures palpebral fissure height (ptosis/fatigue) and evaluates pupil asymmetry
    (Anisocoria check) in millimeters based on standard human iris dimensions (11.7mm).
    """
    overlay = np.zeros_like(image)

    # 1. Ptosis (Eyelid Droopiness) calculation
    # ptosis landmarks order: upper_center, lower_center, inner_corner, outer_corner
    left_ratio, left_overlay = compute_ptosis_ratio_and_overlay(image, left_ptosis_coords, is_left=True)
    right_ratio, right_overlay = compute_ptosis_ratio_and_overlay(image, right_ptosis_coords, is_left=False)

    overlay = cv2.addWeighted(overlay, 1.0, left_overlay, 1.0, 0)
    overlay = cv2.addWeighted(overlay, 1.0, right_overlay, 1.0, 0)

    avg_ptosis_ratio = (left_ratio + right_ratio) / 2.0
    fatigue_flag = avg_ptosis_ratio < 0.30

    # 2. Anisocoria (Pupil Asymmetry / Concussion trauma check)
    # The average human iris diameter is constant at ~11.7mm.
    # We calibrate pixel-to-millimeter conversions:
    avg_iris_pixels = (left_iris_dia + right_iris_dia) / 2.0
    
    if avg_iris_pixels > 0:
        pixel_to_mm = 11.7 / avg_iris_pixels
    else:
        pixel_to_mm = 0.25 # typical fallback scale
        
    delta_pupil_pixels = abs(left_pupil_dia - right_pupil_dia)
    delta_pupil_mm = delta_pupil_pixels * pixel_to_mm
    
    anisocoria_flag = delta_pupil_mm > 1.0

    # 3. Formulate Trauma Score
    trauma_score = 0.0
    if anisocoria_flag:
        # High priority trauma indicator
        trauma_score = min(0.99, 0.70 + (delta_pupil_mm - 1.0) * 0.25)
    else:
        trauma_score = min(0.35, delta_pupil_mm * 0.3)

    metrics = {
        "left_ptosis_ratio": float(left_ratio),
        "right_ptosis_ratio": float(right_ratio),
        "avg_ptosis_ratio": float(avg_ptosis_ratio),
        "fatigue_flag": bool(fatigue_flag),
        "anisocoria_flag": bool(anisocoria_flag),
        "delta_pupil_mm": float(delta_pupil_mm),
        "trauma_score": float(trauma_score)
    }

    return metrics, overlay


def compute_ptosis_ratio_and_overlay(
    image: np.ndarray, 
    coords: List[Tuple[int, int]], 
    is_left: bool
) -> Tuple[float, np.ndarray]:
    """Helper to calculate vertical-to-horizontal eye aperture ratio and draw overlay lines."""
    overlay = np.zeros_like(image)
    
    if not coords or len(coords) < 4:
        return 0.38, overlay
        
    upper, lower, inner, outer = coords
    
    # Calculate vertical height
    vert_dist = np.linalg.norm(np.array(upper) - np.array(lower))
    # Calculate horizontal length
    horiz_dist = np.linalg.norm(np.array(inner) - np.array(outer))
    
    ratio = vert_dist / horiz_dist if horiz_dist > 0 else 0.38
    
    # Draw reference tracking lines: Flash Amber for trauma/fatigue inspection
    cv2.line(overlay, upper, lower, (0, 180, 240), 2)  # Amber in BGR
    cv2.line(overlay, inner, outer, (0, 180, 240), 1)
    
    return float(ratio), overlay
