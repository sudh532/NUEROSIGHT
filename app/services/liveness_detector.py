"""
Deprecation forwarding module: Anti-spoofing and liveness terminology removed.
Redirects calls to analyze_substance_impairment in app.services.impairment_detector.
"""
from app.services.impairment_detector import analyze_substance_impairment

def verify_subject_liveness(frames, detector):
    return analyze_substance_impairment(frames, detector)
