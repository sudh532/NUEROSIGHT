import pytest
from app.services.classification_engine import evaluate_verdict


def test_verdict_normal():
    """Asserts that normal metrics yield a safe cleared verdict."""
    inf = {"left_redness": 0.03, "right_redness": 0.04, "asymmetry_index": 0.01, "exudate_detected": False, "exudate_ratio": 0.0, "infection_probability": 0.05}
    drug = {"left_pir": 0.33, "right_pir": 0.34, "avg_pir": 0.33, "gaze_drift": 0.02, "detected_category": "None", "impairment_score": 0.12}
    trauma = {"left_ptosis_ratio": 0.38, "right_ptosis_ratio": 0.37, "avg_ptosis_ratio": 0.38, "fatigue_flag": False, "anisocoria_flag": False, "delta_pupil_mm": 0.2, "trauma_score": 0.05}
    
    res = evaluate_verdict(inf, drug, trauma)
    assert "SCREENING COMPLETE" in res["overall_verdict"]
    assert res["risk_score"] == 0.08
    assert res["confidence_level"] == 0.94


def test_verdict_anisocoria_priority():
    """Asserts that pupil asymmetry (anisocoria) overrides all other metrics with a high risk trauma warning."""
    # Setup inf/drug as highly impaired/infected, but trauma has anisocoria
    inf = {"left_redness": 0.22, "right_redness": 0.04, "asymmetry_index": 0.18, "exudate_detected": True, "exudate_ratio": 0.12, "infection_probability": 0.85}
    drug = {"left_pir": 0.54, "right_pir": 0.55, "avg_pir": 0.54, "gaze_drift": 0.05, "detected_category": "CNS Stimulant", "impairment_score": 0.95}
    trauma = {"left_ptosis_ratio": 0.38, "right_ptosis_ratio": 0.37, "avg_ptosis_ratio": 0.38, "fatigue_flag": False, "anisocoria_flag": True, "delta_pupil_mm": 1.8, "trauma_score": 0.90}
    
    res = evaluate_verdict(inf, drug, trauma)
    assert "CRITICAL ALERT" in res["overall_verdict"]
    assert "HEAD TRAUMA" in res["overall_verdict"]
    assert res["risk_score"] == 0.90


def test_verdict_pathology():
    """Asserts that asymmetrical redness combined with exudates yields an infection verdict."""
    inf = {"left_redness": 0.20, "right_redness": 0.04, "asymmetry_index": 0.16, "exudate_detected": True, "exudate_ratio": 0.10, "infection_probability": 0.80}
    drug = {"left_pir": 0.33, "right_pir": 0.34, "avg_pir": 0.33, "gaze_drift": 0.02, "detected_category": "None", "impairment_score": 0.12}
    trauma = {"left_ptosis_ratio": 0.38, "right_ptosis_ratio": 0.37, "avg_ptosis_ratio": 0.38, "fatigue_flag": False, "anisocoria_flag": False, "delta_pupil_mm": 0.2, "trauma_score": 0.05}
    
    res = evaluate_verdict(inf, drug, trauma)
    assert "PATHOLOGICAL EXUDATE" in res["overall_verdict"]
    assert res["risk_score"] == 0.80


def test_verdict_cns_stimulant():
    """Asserts that high PIR results in a CNS stimulant impairment verdict."""
    inf = {"left_redness": 0.03, "right_redness": 0.04, "asymmetry_index": 0.01, "exudate_detected": False, "exudate_ratio": 0.0, "infection_probability": 0.05}
    drug = {"left_pir": 0.52, "right_pir": 0.52, "avg_pir": 0.52, "gaze_drift": 0.02, "detected_category": "CNS Stimulant", "impairment_score": 0.85}
    trauma = {"left_ptosis_ratio": 0.38, "right_ptosis_ratio": 0.37, "avg_ptosis_ratio": 0.38, "fatigue_flag": False, "anisocoria_flag": False, "delta_pupil_mm": 0.2, "trauma_score": 0.05}
    
    res = evaluate_verdict(inf, drug, trauma)
    assert "CNS STIMULANT" in res["overall_verdict"]
    assert res["risk_score"] == 0.85


def test_verdict_cns_depressant():
    """Asserts that low PIR results in a CNS depressant impairment verdict."""
    inf = {"left_redness": 0.03, "right_redness": 0.04, "asymmetry_index": 0.01, "exudate_detected": False, "exudate_ratio": 0.0, "infection_probability": 0.05}
    drug = {"left_pir": 0.16, "right_pir": 0.16, "avg_pir": 0.16, "gaze_drift": 0.02, "detected_category": "CNS Depressant", "impairment_score": 0.88}
    trauma = {"left_ptosis_ratio": 0.38, "right_ptosis_ratio": 0.37, "avg_ptosis_ratio": 0.38, "fatigue_flag": False, "anisocoria_flag": False, "delta_pupil_mm": 0.2, "trauma_score": 0.05}
    
    res = evaluate_verdict(inf, drug, trauma)
    assert "CNS DEPRESSANT" in res["overall_verdict"]
    assert res["risk_score"] == 0.88


def test_verdict_cannabis_alcohol():
    """Asserts that symmetric high redness index yields Cannabis/Alcohol category impairment."""
    inf = {"left_redness": 0.22, "right_redness": 0.22, "asymmetry_index": 0.0, "exudate_detected": False, "exudate_ratio": 0.0, "infection_probability": 0.33}
    drug = {"left_pir": 0.33, "right_pir": 0.34, "avg_pir": 0.33, "gaze_drift": 0.02, "detected_category": "Cannabis/Alcohol", "impairment_score": 0.56}
    trauma = {"left_ptosis_ratio": 0.38, "right_ptosis_ratio": 0.37, "avg_ptosis_ratio": 0.38, "fatigue_flag": False, "anisocoria_flag": False, "delta_pupil_mm": 0.2, "trauma_score": 0.05}
    
    res = evaluate_verdict(inf, drug, trauma)
    assert "CANNABIS/ALCOHOL" in res["overall_verdict"]
    assert res["risk_score"] == 0.56


def test_verdict_fatigue():
    """Asserts that low ptosis ratio flags fatigue warnings in the verdict details."""
    inf = {"left_redness": 0.03, "right_redness": 0.04, "asymmetry_index": 0.01, "exudate_detected": False, "exudate_ratio": 0.0, "infection_probability": 0.05}
    drug = {"left_pir": 0.33, "right_pir": 0.34, "avg_pir": 0.33, "gaze_drift": 0.02, "detected_category": "None", "impairment_score": 0.12}
    trauma = {"left_ptosis_ratio": 0.28, "right_ptosis_ratio": 0.28, "avg_ptosis_ratio": 0.28, "fatigue_flag": True, "anisocoria_flag": False, "delta_pupil_mm": 0.2, "trauma_score": 0.05}
    
    res = evaluate_verdict(inf, drug, trauma)
    assert "SCREENING COMPLETE" in res["overall_verdict"]
    assert "fatigue" in res["reason"]
    assert res["risk_score"] == 0.35


def test_static_spoof_detection():
    """Asserts that duplicate/zero-variance frames are correctly flagged as static spoofs with a low liveness score."""
    import numpy as np
    from app.services.liveness_detector import verify_subject_liveness
    
    class MockLandmark:
        def __init__(self, x, y, z):
            self.x = x
            self.y = y
            self.z = z
            
    class MockFaceMeshResult:
        def __init__(self, landmarks):
            self.face_landmarks = [landmarks]
            
    # Compile a rigid, zero-variance sequence of 10 identical mock landmark lists
    base_landmarks = [MockLandmark(0.5, 0.5, 0.0) for _ in range(478)]
    # Eyelid vertical points (159, 145)
    base_landmarks[159] = MockLandmark(0.5, 0.45, -0.02)
    base_landmarks[145] = MockLandmark(0.5, 0.55, -0.02)
    # Pupil centers (468, 473)
    base_landmarks[468] = MockLandmark(0.48, 0.5, -0.03)
    base_landmarks[473] = MockLandmark(0.52, 0.5, -0.03)
    # Iris edges for diameters
    base_landmarks[469] = MockLandmark(0.47, 0.5, -0.03)
    base_landmarks[471] = MockLandmark(0.49, 0.5, -0.03)
    base_landmarks[474] = MockLandmark(0.51, 0.5, -0.03)
    base_landmarks[476] = MockLandmark(0.53, 0.5, -0.03)
    # Forehead (10) & Nose (4)
    base_landmarks[10] = MockLandmark(0.5, 0.3, 0.05)
    base_landmarks[4] = MockLandmark(0.5, 0.6, 0.08)
    
    # Mock detector that always returns the same landmarks (zero variance)
    class MockDetector:
        def detect(self, mp_image):
            return MockFaceMeshResult(base_landmarks)
            
    # Run the tracking logic over 10 identical frames
    dummy_frames = [np.zeros((100, 100, 3), dtype=np.uint8) for _ in range(10)]
    
    liveness = verify_subject_liveness(dummy_frames, MockDetector())
    assert liveness["is_live"] is False
    assert "Zero-variance indicators detected" in liveness["reason"]
    assert liveness["liveness_score"] == 0.0

