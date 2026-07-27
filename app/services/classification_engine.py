from typing import Dict, Any

def apply_biomarker_safety_override(
    infection_metrics: Dict[str, Any],
    drug_metrics: Dict[str, Any],
    trauma_metrics: Dict[str, Any],
    verdict_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Enforces a strict ensemble heuristic safety override:
    If 2 or more physical ocular biomarkers breach critical impairment thresholds,
    override any model/classifier false-negative predictions (is_impaired=False or category='NONE').
    """
    left_red = infection_metrics.get("left_redness", 0.0) if infection_metrics else 0.0
    right_red = infection_metrics.get("right_redness", 0.0) if infection_metrics else 0.0
    sclera_redness = (left_red + right_red) / 2.0
    
    pir = drug_metrics.get("avg_pir", 0.33) if drug_metrics else 0.33
    aperture = trauma_metrics.get("avg_ptosis_ratio", 0.38) if trauma_metrics else 0.38
    
    critical_flags = 0
    flag_details = []
    
    # 1. Check Sclera Redness (Vascular Injection > 12%)
    if sclera_redness > 0.12:
        critical_flags += 1
        flag_details.append(f"Redness {(sclera_redness * 100):.1f}% > 12.0%")
        
    # 2. Check Pupil-to-Iris Ratio (Miosis < 0.18 or Mydriasis > 0.38)
    if pir < 0.18 or pir > 0.38:
        critical_flags += 1
        if pir < 0.18:
            flag_details.append(f"Pinpoint Miosis PIR {pir:.2f} < 0.18")
        else:
            flag_details.append(f"Mydriasis PIR {pir:.2f} > 0.38")
            
    # 3. Check Eyelid Aperture (Ptosis / Drooping < 0.33)
    if aperture < 0.33:
        critical_flags += 1
        flag_details.append(f"Ptosis Aperture {aperture:.2f} < 0.33")

    # If 2+ physical metrics are abnormal, override false negative model outputs
    current_category = str(verdict_dict.get("category", "NONE")).upper()
    current_impaired = bool(verdict_dict.get("is_impaired", False))
    
    if critical_flags >= 2 and (not current_impaired or current_category in ["NONE", "NORMAL"]):
        verdict_dict["is_impaired"] = True
        
        # Categorize based on primary driver
        if pir < 0.18:
            cat_label = "CNS DEPRESSANT / OPIOID"
        elif pir > 0.38:
            cat_label = "STIMULANT / CANNABIS"
        elif sclera_redness > 0.12:
            cat_label = "CANNABIS / ALCOHOL"
        else:
            cat_label = "CNS DEPRESSANT / NARCOTIC"
            
        verdict_dict["category"] = cat_label
        calc_risk = min(0.99, max(0.85, float(sclera_redness * 2.5 + abs(0.33 - pir) * 2.0 + (0.33 - aperture) * 1.5)))
        verdict_dict["risk_score"] = round(calc_risk, 4)
        verdict_dict["confidence"] = 0.98
        verdict_dict["confidence_level"] = 0.98
        verdict_dict["overall_verdict"] = f"SUBSTANCE IMPAIRMENT DETECTED - CATEGORY: {cat_label}"
        verdict_dict["reason"] = f"Ensemble heuristic safety override: Multiple critical ocular biomarker anomalies detected ({', '.join(flag_details)})."
        verdict_dict["heuristic_override"] = True
    elif not verdict_dict.get("is_impaired", False) or current_category in ["NONE", "NORMAL"]:
        verdict_dict["is_impaired"] = False
        verdict_dict["category"] = "NONE"
        verdict_dict["overall_verdict"] = "NO SUBSTANCE IMPAIRMENT DETECTED // CLEARED"
        verdict_dict["risk_score"] = round(min(sclera_redness / 100.0, 0.15), 2)

    return verdict_dict


def evaluate_verdict(
    infection_metrics: Dict[str, Any],
    drug_metrics: Dict[str, Any],
    trauma_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates all parallel metrics and returns a deterministic field verdict,
    overall risk score, confidence index, and simple reason.
    """
    anisocoria = trauma_metrics.get("anisocoria_flag", False)
    exudate = infection_metrics.get("exudate_detected", False)
    asymmetry = infection_metrics.get("asymmetry_index", 0.0)
    left_red = infection_metrics.get("left_redness", 0.0)
    right_red = infection_metrics.get("right_redness", 0.0)
    avg_redness = (left_red + right_red) / 2.0
    
    drug_cat = drug_metrics.get("detected_category", "None")
    avg_pir = drug_metrics.get("avg_pir", 0.33)
    
    fatigue = trauma_metrics.get("fatigue_flag", False)
    avg_ptosis = trauma_metrics.get("avg_ptosis_ratio", 0.38)
    
    verdict = "SCREENING COMPLETE - NO CRITICAL ANOMALIES DETECTED"
    reason = "All metrics are within standard operating parameters."
    overall_risk = 0.0
    is_impaired = False
    category = "NONE"
    
    # 1. Rule 1: Pupil Asymmetry / Concussion Bypass (Highest Priority)
    if anisocoria:
        verdict = "CRITICAL ALERT - POSSIBLE HEAD TRAUMA / CONCUSSION DETECTED"
        reason = f"Extreme pupil size variance ({trauma_metrics.get('delta_pupil_mm', 0.0):.2f}mm) detected. Potential neurological impairment or head injury."
        overall_risk = trauma_metrics.get("trauma_score", 0.85)
        is_impaired = True
        category = "NEUROLOGICAL TRAUMA"
        
    # 2. Rule 2: Pathological Infection Check
    elif exudate or (asymmetry > 0.08 and avg_redness > 0.12):
        verdict = "PATHOLOGICAL EXUDATE DETECTED - POTENTIAL INFECTIOUS CONDITION"
        reason = f"Unilateral redness asymmetry ({asymmetry:.2f}) and active canthus exudate tracking indicate potential conjunctivitis/keratitis."
        overall_risk = infection_metrics.get("infection_probability", 0.75)
        is_impaired = False  # Infection, not chemical narcotic impairment
        category = "PATHOLOGICAL INFECTION"
        
    # 3. Rule 3: Chemical/Narcotic Impairment Checks
    elif drug_cat in ["CNS Stimulant", "CNS Depressant", "Cannabis/Alcohol"]:
        verdict = f"IMPAIRMENT INDICATORS DETECTED - CATEGORY: {drug_cat.upper()}"
        if drug_cat == "CNS Stimulant":
            reason = f"Severe pupil dilation (PIR: {avg_pir:.2f}) consistent with Central Nervous System stimulants."
        elif drug_cat == "CNS Depressant":
            reason = f"Severe pupil constriction / pinpoint state (PIR: {avg_pir:.2f}) consistent with CNS depressants."
        else:
            reason = f"Intense symmetric redness ({avg_redness:.2f}) without pathological exudates consistent with Cannabis/Alcohol presence."
        overall_risk = drug_metrics.get("impairment_score", 0.80)
        is_impaired = True
        category = drug_cat.upper()
        
    # 4. Default: Cleared status or fatigue warning
    else:
        if fatigue:
            verdict = "SCREENING COMPLETE - NO CRITICAL ANOMALIES DETECTED"
            reason = f"Narrowing palpebral fissure ({avg_ptosis:.2f}) indicates severe physical fatigue or drowsiness."
            overall_risk = 0.35
            is_impaired = False
            category = "FATIGUE"
        else:
            overall_risk = 0.08
            is_impaired = False
            category = "NONE"

    res = {
        "overall_verdict": verdict,
        "reason": reason,
        "risk_score": float(overall_risk),
        "confidence_level": 0.94,
        "confidence": 0.94,
        "is_impaired": is_impaired,
        "category": category
    }

    return apply_biomarker_safety_override(infection_metrics, drug_metrics, trauma_metrics, res)
