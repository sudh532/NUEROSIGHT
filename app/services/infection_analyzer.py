import cv2
import numpy as np
from typing import Tuple, Dict, Any, List

def analyze_infection(
    image: np.ndarray, 
    left_eye_coords: List[Tuple[int, int]], 
    right_eye_coords: List[Tuple[int, int]],
    left_canthus_pt: Tuple[int, int],
    right_canthus_pt: Tuple[int, int]
) -> Tuple[Dict[str, Any], np.ndarray]:
    """
    Analyzes the scleras for unilateral redness asymmetry and checks the inner canthus
    regions for pale-yellow/green exudate clusters using HSV threshold masks.
    """
    h, w, _ = image.shape
    overlay = np.zeros_like(image)

    # 1. Sclera Redness Calculation for Left and Right eyes
    # To keep it robust, we calculate redness within the eye polygons
    left_redness, left_sclera_mask = compute_eye_redness_and_mask(image, left_eye_coords)
    right_redness, right_sclera_mask = compute_eye_redness_and_mask(image, right_eye_coords)

    # Highlight scleras on the overlay: Clinical Blue for detected infection inspection
    overlay[left_sclera_mask == 255] = [240, 130, 59]  # Clinical Blue in BGR
    overlay[right_sclera_mask == 255] = [240, 130, 59]

    # Calculate unilateral asymmetry
    asymmetry_index = abs(left_redness - right_redness)

    # 2. Exudate and Discharge Tracking at inner canthus regions (Landmarks 133 & 362)
    # We sample a localized bounding box around the inner canthus landmarks (radius = 18px)
    left_exudate_ratio, left_exudate_mask = compute_canthus_exudate(image, left_canthus_pt, 18)
    right_exudate_ratio, right_exudate_mask = compute_canthus_exudate(image, right_canthus_pt, 18)

    # Overlay detected exudate pixels in bright yellow
    overlay[left_exudate_mask == 255] = [0, 220, 220] # Yellow highlight
    overlay[right_exudate_mask == 255] = [0, 220, 220]

    max_exudate_ratio = max(left_exudate_ratio, right_exudate_ratio)
    exudate_detected = max_exudate_ratio > 0.05

    # 3. Formulate Infection Probability
    # Unilateral presentation (asymmetry > 0.08) + exudates makes it very high probability
    infection_probability = 0.0
    if exudate_detected:
        infection_probability = 0.70 + min(0.29, max_exudate_ratio * 2)
    elif asymmetry_index > 0.07:
        infection_probability = 0.40 + min(0.30, asymmetry_index * 2)
    else:
        # Symmetric mild redness
        infection_probability = min(0.30, max(left_redness, right_redness) * 1.5)

    metrics = {
        "left_redness": float(left_redness),
        "right_redness": float(right_redness),
        "asymmetry_index": float(asymmetry_index),
        "exudate_detected": bool(exudate_detected),
        "exudate_ratio": float(max_exudate_ratio),
        "infection_probability": float(infection_probability)
    }

    return metrics, overlay


def compute_eye_redness_and_mask(image: np.ndarray, eye_coords: List[Tuple[int, int]]) -> Tuple[float, np.ndarray]:
    """Helper to construct mask of eye polygon and calculate red pixel ratio."""
    h, w, _ = image.shape
    mask = np.zeros((h, w), dtype=np.uint8)
    
    # Draw eye contour
    poly = np.array(eye_coords, dtype=np.int32)
    cv2.fillPoly(mask, [poly], 255)
    
    # Apply CLAHE to L channel in LAB color space to auto-correct ambient lighting (Phase 1)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl_chan = clahe.apply(l_chan)
    corrected_lab = cv2.merge((cl_chan, a_chan, b_chan))
    corrected_image = cv2.cvtColor(corrected_lab, cv2.COLOR_LAB2BGR)
    
    # Isolate red pixels using a combined threshold (High R/G ratio and minimum R intensity)
    b, g, r = cv2.split(corrected_image)
    
    # Calculate ratio r / (g + b + 1)
    with np.errstate(divide='ignore', invalid='ignore'):
        red_ratio = r.astype(float) / (g.astype(float) + b.astype(float) + 1.0)
        
    redness_mask = (red_ratio > 0.58) & (r > 100) & (mask == 255)
    
    total_pixels = np.sum(mask == 255)
    if total_pixels == 0:
        return 0.0, mask
        
    red_pixels = np.sum(redness_mask)
    ratio = float(red_pixels) / float(total_pixels)
    
    # Return redness ratio and eye mask
    return ratio, mask


def compute_canthus_exudate(image: np.ndarray, canthus_pt: Tuple[int, int], radius: int) -> Tuple[float, np.ndarray]:
    """Helper to detect yellow/green discharge near inner canthus point via HSV threshold."""
    h, w, _ = image.shape
    mask = np.zeros((h, w), dtype=np.uint8)
    
    cx, cy = canthus_pt
    cv2.circle(mask, (int(cx), int(cy)), radius, 255, -1)
    
    # Convert to HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Pale yellow/green/discharge HSV range: H[20, 45], S[40, 255], V[40, 255]
    lower_bound = np.array([20, 40, 40])
    upper_bound = np.array([45, 255, 255])
    
    exudate_hsv_mask = cv2.inRange(hsv, lower_bound, upper_bound)
    exudate_mask = cv2.bitwise_and(exudate_hsv_mask, mask)
    
    total_pixels = np.sum(mask == 255)
    if total_pixels == 0:
        return 0.0, mask
        
    exudate_pixels = np.sum(exudate_mask == 255)
    ratio = float(exudate_pixels) / float(total_pixels)
    
    return ratio, exudate_mask
