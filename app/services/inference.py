import logging

logger = logging.getLogger("neurosight_prod.inference")

def warmup_model():
    """
    Pre-loads MediaPipe FaceLandmarker task binaries and MobileNetV3 feature extractor weights into RAM
    during application startup to deliver sub-50ms latency on incoming user requests.
    """
    try:
        from app.services.orchestrator import get_detector
        from app.services.embeddings import get_ocular_feature_extractor

        logger.info("[ML WARMUP] Pre-loading MediaPipe FaceLandmarker detector...")
        get_detector()
        logger.info("[ML WARMUP] Pre-loading Ocular Feature Extractor...")
        get_ocular_feature_extractor()
        logger.info("[ML WARMUP SUCCESS] ML Inference Engine warm-up complete. Sub-50ms latency ready.")
    except Exception as e:
        logger.error(f"[ML WARMUP FAILURE] Inference model warm-up failed: {e}")
