import os
import logging
from typing import List, Dict, Any
from app.services.classification_engine import evaluate_verdict, apply_biomarker_safety_override

logger = logging.getLogger("aegis_eye.lgbm")

MODEL_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aegis_lgb_model.txt")

# Flag indicating status of compilation
LGBM_AVAILABLE = False
booster = None

try:
    import lightgbm as lgb
    import numpy as np
    
    if os.path.exists(MODEL_FILE_PATH):
        booster = lgb.Booster(model_file=MODEL_FILE_PATH)
        LGBM_AVAILABLE = True
        logger.info("Tabular LightGBM booster loaded successfully.")
    else:
        logger.warning(f"LightGBM weights not found at {MODEL_FILE_PATH}. Fallback mode active.")
except ImportError as e:
    logger.warning(f"LightGBM/Pandas libraries not installed in active environment: {e}. Fallback active.")
except Exception as e:
    logger.error(f"Error during LightGBM initialization: {e}. Fallback active.")


def classify_tabular_features(
    features: List[float],
    infection_metrics: Dict[str, Any],
    drug_metrics: Dict[str, Any],
    trauma_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Ingests extracted 14-element tabular feature vector:
    [
      0: left_redness_dev, 1: right_redness_dev, 
      2: left_pir_dev, 3: right_pir_dev, 
      4: anisocoria_delta, 5: eyelid_aperture_score, 
      6: lux_variance_index, 7: impairment_risk_score,
      8: anisocoria_ratio, 9: redness_asymmetry,
      10: aperture_symmetry, 11: pupil_aperture_interaction,
      12: pir_delta_from_baseline, 13: redness_delta_from_baseline
    ]
    Evaluates vector using LightGBM. If unavailable or if physical metrics fail threshold,
    executes rule-based safety overrides.
    """
    if not LGBM_AVAILABLE or booster is None:
        # Secure fallback block
        verdict = evaluate_verdict(infection_metrics, drug_metrics, trauma_metrics)
        verdict["lgb_inference"] = False
        verdict["lgb_fallback_warning"] = "LightGBM model weights or runtime libraries unavailable."
        return verdict
        
    try:
        import numpy as np
        # Ingest 1D feature list as 2D row matrix
        features_arr = np.array([features], dtype=np.float32)
        
        # Structural validation before inference
        expected_features = booster.num_feature()
        if features_arr.shape[1] != expected_features:
            logger.info(f"Adapting feature dimension from {features_arr.shape[1]} to expected {expected_features}")
            if features_arr.shape[1] > expected_features:
                features_arr = features_arr[:, :expected_features]
            else:
                padded = np.zeros((features_arr.shape[0], expected_features), dtype=np.float32)
                padded[:, :features_arr.shape[1]] = features_arr
                features_arr = padded
            
        # Output soft probability distribution: [Normal, Narcotic, Infection, Concussion]
        preds = booster.predict(features_arr)[0]
        pred_class = int(np.argmax(preds))
        confidence = float(preds[pred_class])
        
        # Get category names
        categories = ["NONE", "Chemical Narcotic Impairment", "Pathological Infection", "Neurological Trauma"]
        verdict_label = categories[pred_class]
        is_impaired = pred_class == 1 or pred_class == 3
        
        sclera_redness = float((infection_metrics.get("left_redness", 0.0) + infection_metrics.get("right_redness", 0.0)) / 2.0)
        
        # Build verdict response package
        if pred_class == 0 or not is_impaired:
            overall_verdict = "NO SUBSTANCE IMPAIRMENT DETECTED // CLEARED"
            reason = f"Tabular LightGBM classified subject state as normal baseline (confidence: {confidence:.2%})."
            verdict_label = "NONE"
            is_impaired = False
            overall_risk = float(round(min(sclera_redness / 100.0, 0.15), 2))
        elif pred_class == 1:
            detected_cat = drug_metrics.get("detected_category", "CNS Impairment")
            overall_verdict = f"SUBSTANCE IMPAIRMENT DETECTED - CATEGORY: {detected_cat.upper()}"
            reason = f"Tabular LightGBM predicted high probability of chemical narcotic impairment (confidence: {confidence:.2%})."
            verdict_label = detected_cat.upper()
            overall_risk = float(round(max(confidence, 0.65), 2))
        elif pred_class == 2:
            overall_verdict = "PATHOLOGICAL EXUDATE DETECTED - POTENTIAL INFECTIOUS CONDITION"
            reason = f"Tabular LightGBM predicted high probability of pathological ocular infection (confidence: {confidence:.2%})."
            overall_risk = float(round(max(confidence, 0.65), 2))
        else:
            overall_verdict = "HIGH NEURAL IMPAIRMENT ALERT - POSSIBLE CONCUSSION DETECTED"
            reason = f"Tabular LightGBM predicted high probability of neurological concussion or trauma (confidence: {confidence:.2%})."
            overall_risk = float(round(max(confidence, 0.65), 2))
            
        verdict_dict = {
            "overall_verdict": overall_verdict,
            "reason": reason,
            "category": verdict_label,
            "is_impaired": is_impaired,
            "risk_score": round(overall_risk, 4),
            "confidence": round(confidence, 4),
            "confidence_level": round(confidence, 4),
            "lgb_inference": True,
            "lgb_probabilities": [round(float(p), 4) for p in preds]
        }

        # Apply biomarker safety override rule guardrail
        return apply_biomarker_safety_override(infection_metrics, drug_metrics, trauma_metrics, verdict_dict)
        
    except Exception as e:
        logger.error(f"Error during LightGBM tabular inference: {e}. Executing rule fallback.")
        verdict = evaluate_verdict(infection_metrics, drug_metrics, trauma_metrics)
        verdict["lgb_inference"] = False
        verdict["lgb_fallback_warning"] = f"Inference exception: {str(e)}"
        return verdict
