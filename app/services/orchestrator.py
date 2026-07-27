import time
import os
import cv2
import base64
import urllib.request
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from typing import Dict, Any, Tuple, List, Optional
from datetime import datetime

from app.core.exceptions import OcularTrackingException
from app.services.infection_analyzer import analyze_infection
from app.services.drug_narcotic_analyzer import analyze_drug_impairment
from app.services.trauma_fatigue_analyzer import analyze_trauma_fatigue
from app.services.classification_engine import evaluate_verdict
from app.services.impairment_detector import analyze_substance_impairment
from app.services.models.tabular_lgbm import classify_tabular_features
from app.services.embeddings import get_ocular_feature_extractor

# Model download configs
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

def ensure_model_exists():
    """Ensures face_landmarker.task is downloaded locally from Google CDN."""
    if not os.path.exists(MODEL_PATH):
        try:
            print(f"Downloading MediaPipe model to {MODEL_PATH}...")
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
            print("Model download complete.")
        except Exception as e:
            raise RuntimeError(f"Failed to fetch model binary asset: {e}")

# Lazy singleton — detector initialized on first use, not at module import time
_detector = None

def get_detector() -> vision.FaceLandmarker:
    """Returns the global FaceLandmarker detector, downloading the model if needed."""
    global _detector
    if _detector is None:
        ensure_model_exists()
        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1
        )
        _detector = vision.FaceLandmarker.create_from_options(options)
    return _detector

# MediaPipe Index lists
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]
RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]

LEFT_PTOSIS_INDICES = [159, 145, 33, 133]
RIGHT_PTOSIS_INDICES = [386, 374, 362, 263]


def get_coords(landmarks: Any, indices: List[int], img_w: int, img_h: int) -> List[Tuple[int, int]]:
    """Helper to map normalized landmarks list to pixel coordinates."""
    coords = []
    for idx in indices:
        l = landmarks[idx]
        coords.append((int(l.x * img_w), int(l.y * img_h)))
    return coords


def crop_eye_region(
    image: np.ndarray, 
    eye_coords: List[Tuple[int, int]], 
    overlays: List[np.ndarray]
) -> np.ndarray:
    """Crops the eye region with visual diagnostic overlays."""
    h, w, _ = image.shape
    
    # Calculate bounding box
    xs = [pt[0] for pt in eye_coords]
    ys = [pt[1] for pt in eye_coords]
    
    x_min = max(0, min(xs) - 15)
    x_max = min(w, max(xs) + 15)
    y_min = max(0, min(ys) - 15)
    y_max = min(h, max(ys) + 15)
    
    eye_crop = image[y_min:y_max, x_min:x_max].copy()
    
    # Combine overlays and crop
    combined_overlay = np.zeros_like(image)
    for overlay in overlays:
        combined_overlay = cv2.addWeighted(combined_overlay, 1.0, overlay, 1.0, 0)
        
    overlay_crop = combined_overlay[y_min:y_max, x_min:x_max]
    
    # Blend overlay with crop (alpha=0.6, beta=0.4)
    if eye_crop.size > 0 and overlay_crop.size > 0:
        return cv2.addWeighted(eye_crop, 0.6, overlay_crop, 0.4, 0)
    return eye_crop


def apply_lighting_calibration_preprocessing(image: np.ndarray, profile: str) -> np.ndarray:
    """
    Applies adaptive OpenCV image pre-processing steps based on incoming calibration_profile / lighting_profile:
    - low_light: CLAHE on L-channel in LAB color space to sharpen dark pupil/iris borders.
    - sunlight: Gamma correction (gamma=0.7) and green channel enhancement to accentuate scleral blood vessels.
    - artificial: Auto-white-balance color constancy normalization.
    """
    if not profile:
        profile = "artificial"
    profile = profile.lower().strip()

    try:
        if profile == "low_light":
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        elif profile == "sunlight":
            inv_gamma = 1.0 / 0.7
            table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            gamma_corrected = cv2.LUT(image, table)
            b, g, r = cv2.split(gamma_corrected)
            g_enhanced = cv2.equalizeHist(g)
            return cv2.merge((b, g_enhanced, r))

        elif profile == "artificial":
            result = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
            avg_a = np.average(result[:, :, 1])
            avg_b = np.average(result[:, :, 2])
            result[:, :, 1] = result[:, :, 1] - ((avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1)
            result[:, :, 2] = result[:, :, 2] - ((avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1)
            result = np.clip(result, 0, 255).astype(np.uint8)
            return cv2.cvtColor(result, cv2.COLOR_LAB2BGR)
    except Exception as err:
        print(f"[Aegis CV Preprocessing] Fallback due to calibration filter error: {err}")
        return image

    return image


def run_aegis_screening(
    image_bytes: bytes, 
    lighting_profile: str = "artificial",
    session_profile: Optional[Dict[str, Any]] = None,
    frame_sequence: Optional[List[bytes]] = None
) -> Dict[str, Any]:
    """
    Decodes the target image, evaluates drug & substance impairment metrics across frame sequence,
    calibrates metrics relative to a transient session profile, runs standard sub-analyzers,
    and classifies features using the tabular LightGBM engine.
    """
    start_time = time.perf_counter()
    try:
        if not image_bytes:
            raise OcularTrackingException("Received empty byte array from client.")
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        raw_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if raw_image is None:
            raise OcularTrackingException("OpenCV failed to decode the image binary. Corrupt or unsupported format.")
            
        # Apply adaptive OpenCV calibration preprocessing
        image = apply_lighting_calibration_preprocessing(raw_image, lighting_profile)
        img_h, img_w, _ = image.shape
    except Exception as exc:
        if isinstance(exc, OcularTrackingException):
            raise exc
        raise OcularTrackingException(f"OpenCV decoding validation failure: {str(exc)}")
    
    # 1. Populate frames list for telemetry tracking
    frames = []
    if frame_sequence:
        for buf in frame_sequence:
            narr = np.frombuffer(buf, np.uint8)
            f = cv2.imdecode(narr, cv2.IMREAD_COLOR)
            if f is not None:
                frames.append(f)
    else:
        frames.append(image)
        
    # Run Substance Impairment telemetry tracker
    impairment_payload = analyze_substance_impairment(frames, get_detector())
    
    # 2. Extract Baselines
    if session_profile:
        baseline_pir = session_profile.get("baseline_pir", 0.33)
        baseline_redness = session_profile.get("baseline_redness", 0.04)
        baseline_aperture = session_profile.get("baseline_aperture", 0.38)
        lux_delta = session_profile.get("lux_delta", 0.02)
    else:
        baseline_pir = 0.33
        baseline_redness = 0.04
        baseline_aperture = 0.38
        lux_delta = 0.02
        
    # Execute MediaPipe mesh tracking on the target image
    try:
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    except Exception as color_err:
        raise OcularTrackingException(f"Color space conversion failed: {str(color_err)}")
        
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
    detection_result = get_detector().detect(mp_image)
    
    if not detection_result.face_landmarks:
        print("[NEUROSIGHT INFO] Zero full facial structures isolated. Operating in Direct Ocular Crop Mode.")
        is_direct_crop = True
        landmarks = None
        
        # Synthesize fallback ocular coordinates assuming tight eye/bridge crop
        left_eye_coords = [
            (int(img_w * 0.05), int(img_h * 0.5)),
            (int(img_w * 0.20), int(img_h * 0.3)),
            (int(img_w * 0.20), int(img_h * 0.7)),
            (int(img_w * 0.45), int(img_h * 0.5)),
            (int(img_w * 0.20), int(img_h * 0.7)),
            (int(img_w * 0.20), int(img_h * 0.3))
        ]
        right_eye_coords = [
            (int(img_w * 0.55), int(img_h * 0.5)),
            (int(img_w * 0.75), int(img_h * 0.3)),
            (int(img_w * 0.75), int(img_h * 0.7)),
            (int(img_w * 0.95), int(img_h * 0.5)),
            (int(img_w * 0.75), int(img_h * 0.7)),
            (int(img_w * 0.75), int(img_h * 0.3))
        ]
        left_iris_coords = [
            (int(img_w * 0.15), int(img_h * 0.5)),
            (int(img_w * 0.25), int(img_h * 0.35)),
            (int(img_w * 0.35), int(img_h * 0.5)),
            (int(img_w * 0.25), int(img_h * 0.65)),
            (int(img_w * 0.25), int(img_h * 0.5))
        ]
        right_iris_coords = [
            (int(img_w * 0.65), int(img_h * 0.5)),
            (int(img_w * 0.75), int(img_h * 0.35)),
            (int(img_w * 0.85), int(img_h * 0.5)),
            (int(img_w * 0.75), int(img_h * 0.65)),
            (int(img_w * 0.75), int(img_h * 0.5))
        ]
        left_ptosis_coords = [
            (int(img_w * 0.25), int(img_h * 0.3)),
            (int(img_w * 0.25), int(img_h * 0.7)),
            (int(img_w * 0.05), int(img_h * 0.5)),
            (int(img_w * 0.45), int(img_h * 0.5))
        ]
        right_ptosis_coords = [
            (int(img_w * 0.75), int(img_h * 0.3)),
            (int(img_w * 0.75), int(img_h * 0.7)),
            (int(img_w * 0.55), int(img_h * 0.5)),
            (int(img_w * 0.95), int(img_h * 0.5))
        ]
        left_canthus = left_eye_coords[3]
        right_canthus = right_eye_coords[0]
    else:
        is_direct_crop = False
        landmarks = detection_result.face_landmarks[0]
        
        # Extract coordinates
        left_eye_coords = get_coords(landmarks, LEFT_EYE_INDICES, img_w, img_h)
        right_eye_coords = get_coords(landmarks, RIGHT_EYE_INDICES, img_w, img_h)
        
        left_iris_coords = get_coords(landmarks, LEFT_IRIS_INDICES, img_w, img_h)
        right_iris_coords = get_coords(landmarks, RIGHT_IRIS_INDICES, img_w, img_h)
        
        left_ptosis_coords = get_coords(landmarks, LEFT_PTOSIS_INDICES, img_w, img_h)
        right_ptosis_coords = get_coords(landmarks, RIGHT_PTOSIS_INDICES, img_w, img_h)
        
        left_canthus = left_eye_coords[3]  # Landmark 133
        right_canthus = right_eye_coords[0] # Landmark 362
    
    # 1. Run Pathological Conditions Analyzer
    infection, inf_overlay = analyze_infection(image, left_eye_coords, right_eye_coords, left_canthus, right_canthus)
    
    # 2. Run Chemical Narcotic Impairment Analyzer
    drug, drug_overlay = analyze_drug_impairment(
        image, left_iris_coords, right_iris_coords, left_eye_coords, right_eye_coords, infection, lighting_profile
    )
    
    # Calibrate actual diameters for Anisocoria to be accurate in pixels
    left_iris_dia = np.linalg.norm(np.array(left_iris_coords[0]) - np.array(left_iris_coords[2]))
    right_iris_dia = np.linalg.norm(np.array(right_iris_coords[0]) - np.array(right_iris_coords[2]))
    
    # Pupil diameter based on PIR * iris diameter
    left_pupil_dia = drug["left_pir"] * left_iris_dia
    right_pupil_dia = drug["right_pir"] * right_iris_dia
    
    # 3. Run Concussion & Trauma Analyzer
    trauma, trauma_overlay = analyze_trauma_fatigue(
        image, left_ptosis_coords, right_ptosis_coords,
        left_pupil_dia, right_pupil_dia,
        left_iris_dia, right_iris_dia
    )

    # 4. Formulate Feature Matrix Relative to Baselines (14 Augmented Features - Phase 1)
    left_red = float(infection["left_redness"])
    right_red = float(infection["right_redness"])
    left_pir = float(drug["left_pir"])
    right_pir = float(drug["right_pir"])
    left_aperture = float(trauma.get("left_ptosis_ratio", trauma["avg_ptosis_ratio"]))
    right_aperture = float(trauma.get("right_ptosis_ratio", trauma["avg_ptosis_ratio"]))
    mean_pir = float(drug["avg_pir"])
    mean_redness = float((left_red + right_red) / 2.0)
    mean_aperture = float(trauma["avg_ptosis_ratio"])

    left_red_dev = float(left_red - baseline_redness)
    right_red_dev = float(right_red - baseline_redness)
    left_pir_dev = float(left_pir - baseline_pir)
    right_pir_dev = float(right_pir - baseline_pir)
    anisocoria_delta = float(trauma["delta_pupil_mm"])
    eyelid_aperture_score = float(trauma["avg_ptosis_ratio"])
    lux_variance_index = float(lux_delta)
    impairment_risk_score = float(impairment_payload["impairment_risk_score"])

    # Augmented Physics & Biometric Ratios
    max_pir = max(left_pir, right_pir, 1e-5)
    anisocoria_ratio = float(abs(left_pir - right_pir) / max_pir)
    redness_asymmetry = float(abs(left_red - right_red))
    max_aperture = max(left_aperture, right_aperture, 1e-5)
    aperture_symmetry = float(min(left_aperture, right_aperture) / max_aperture)
    pupil_aperture_interaction = float(mean_pir * mean_aperture)
    pir_delta_from_baseline = float(mean_pir - baseline_pir)
    redness_delta_from_baseline = float(mean_redness - baseline_redness)

    features = [
        left_red_dev,
        right_red_dev,
        left_pir_dev,
        right_pir_dev,
        anisocoria_delta,
        eyelid_aperture_score,
        lux_variance_index,
        impairment_risk_score,
        anisocoria_ratio,
        redness_asymmetry,
        aperture_symmetry,
        pupil_aperture_interaction,
        pir_delta_from_baseline,
        redness_delta_from_baseline
    ]

    # 5. Evaluate Tabular Classifier Verdict
    verdict_payload = classify_tabular_features(features, infection, drug, trauma)

    # Override verdict text if impairment detector flagged specific drug classification
    if impairment_payload.get("classification_label") in ["SUSPECTED_STIMULANT", "SUSPECTED_DEPRESSANT", "HIGH_IMPAIRMENT"]:
        verdict_payload["classification_label"] = impairment_payload["classification_label"]
        verdict_payload["substance_confidence"] = impairment_payload["substance_confidence"]
        verdict_payload["impairment_risk_score"] = impairment_payload["impairment_risk_score"]

    # 6. Crop and Overlay Display crops
    if is_direct_crop:
        left_crop = image[:, :img_w // 2]
        right_crop = image[:, img_w // 2:]
    else:
        left_crop = crop_eye_region(image, left_eye_coords, [inf_overlay, drug_overlay, trauma_overlay])
        right_crop = crop_eye_region(image, right_eye_coords, [inf_overlay, drug_overlay, trauma_overlay])
    
    # Base64 encoding
    _, left_buffer = cv2.imencode('.png', left_crop)
    _, right_buffer = cv2.imencode('.png', right_crop)
    
    left_b64_raw = base64.b64encode(left_buffer).decode('utf-8')
    right_b64_raw = base64.b64encode(right_buffer).decode('utf-8')
    
    left_b64 = "data:image/png;base64," + left_b64_raw
    right_b64 = "data:image/png;base64," + right_b64_raw

    # Extract 3D normalized coordinates for validation
    if landmarks:
        left_eye_3d = [{"x": float(landmarks[idx].x), "y": float(landmarks[idx].y), "z": float(landmarks[idx].z)} for idx in LEFT_EYE_INDICES]
        right_eye_3d = [{"x": float(landmarks[idx].x), "y": float(landmarks[idx].y), "z": float(landmarks[idx].z)} for idx in RIGHT_EYE_INDICES]
    else:
        left_eye_3d = [{"x": 0.25, "y": 0.5, "z": 0.0}]
        right_eye_3d = [{"x": 0.75, "y": 0.5, "z": 0.0}]

    # Generate full-frame processed image with all overlays combined
    full_overlay = np.zeros_like(image)
    full_overlay = cv2.addWeighted(full_overlay, 1.0, inf_overlay, 1.0, 0)
    full_overlay = cv2.addWeighted(full_overlay, 1.0, drug_overlay, 1.0, 0)
    full_overlay = cv2.addWeighted(full_overlay, 1.0, trauma_overlay, 1.0, 0)
    
    processed_full = cv2.addWeighted(image, 0.75, full_overlay, 0.25, 0)
    _, full_buffer = cv2.imencode('.jpg', processed_full)
    full_b64 = base64.b64encode(full_buffer).decode('utf-8')

    # Return full telemetry schema package
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    is_imp = bool(verdict_payload.get("is_impaired", False))
    cat_val = str(verdict_payload.get("category", "NONE"))
    risk_val = float(verdict_payload.get("risk_score", 0.0))
    conf_val = float(verdict_payload.get("confidence", verdict_payload.get("confidence_level", 0.95)))
    v_text = "NO SUBSTANCE IMPAIRMENT DETECTED" if not is_imp else f"{cat_val} IMPAIRMENT DETECTED"

    return {
        "status": "success",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "calibration_profile": lighting_profile,
        "lighting_profile": lighting_profile,
        "is_direct_crop": is_direct_crop,
        "is_impaired": is_imp,
        "category": cat_val,
        "risk_score": risk_val,
        "risk": risk_val,
        "confidence": conf_val,
        "latency_ms": f"{latency_ms}ms",
        "latency_val": latency_ms,
        "verdict_text": v_text,
        "crop_left_base64": left_b64_raw,
        "crop_right_base64": right_b64_raw,
        "verdict": verdict_payload,
        "metrics": {
            "infection": infection,
            "drug": drug,
            "trauma": trauma,
            "impairment": impairment_payload
        },
        "processed_image": full_b64,
        "processed_images": {
            "left_eye": left_b64,
            "right_eye": right_b64
        },
        "ocular_coordinates": {
            "left_eye_3d": left_eye_3d,
            "right_eye_3d": right_eye_3d
        }
    }

