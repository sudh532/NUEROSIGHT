import os
import logging
import numpy as np

logger = logging.getLogger("aegis_eye.trainer")

MODEL_SAVE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "neurosight_ensemble_v3.pkl")

def train_calibrated_stacking_ensemble(X, y, save_path=MODEL_SAVE_PATH):
    """
    Constructs and calibrates a high-performance stacking ensemble:
    LightGBM + CatBoost + XGBoost -> Logistic Regression Meta-Learner -> CalibratedClassifierCV(method='sigmoid')
    """
    try:
        import lightgbm as lgb
        import xgboost as xgb
        from catboost import CatBoostClassifier
        from sklearn.ensemble import StackingClassifier
        from sklearn.linear_model import LogisticRegression
        from sklearn.calibration import CalibratedClassifierCV
        from sklearn.model_selection import StratifiedKFold
        import joblib

        estimators = [
            ('lgb', lgb.LGBMClassifier(
                objective='multiclass', num_class=4, learning_rate=0.015,
                n_estimators=300, max_depth=6, num_leaves=31, class_weight='balanced', random_state=42, verbose=-1
            )),
            ('cat', CatBoostClassifier(
                iterations=300, learning_rate=0.02, depth=6, auto_class_weights='Balanced',
                verbose=0, random_seed=42
            )),
            ('xgb', xgb.XGBClassifier(
                objective='multi:softprob', num_class=4, learning_rate=0.015,
                n_estimators=300, max_depth=5, eval_metric='mlogloss', random_state=42
            ))
        ]

        stacking_clf = StackingClassifier(
            estimators=estimators,
            final_estimator=LogisticRegression(max_iter=1000),
            cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=42),
            n_jobs=-1
        )

        calibrated_ensemble = CalibratedClassifierCV(
            estimator=stacking_clf,
            method='sigmoid',
            cv=3
        )

        logger.info("[NEUROSIGHT TRAINER] Fitting Calibrated Stacking Ensemble Model...")
        calibrated_ensemble.fit(X, y)

        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        joblib.dump(calibrated_ensemble, save_path)
        logger.info(f"[NEUROSIGHT TRAINER] Model successfully saved to {save_path}")
        return calibrated_ensemble
    except Exception as e:
        logger.warning(f"[NEUROSIGHT TRAINER] Fallback: {e}")
        return None

def calibrate_risk_verdict(predicted_category: str, is_impaired: bool, confidence: float, sclera_redness: float = 0.0) -> dict:
    """
    Enforces explicit risk calibration logic:
    When predicted_category == 'NONE' or is_impaired == False:
      - category = 'NONE'
      - is_impaired = False
      - risk_score = min(sclera_redness / 100.0, 0.15) (clamped <= 0.15 in green)
      - verdict_text = 'NO SUBSTANCE IMPAIRMENT DETECTED'
    Else:
      - is_impaired = True
      - risk_score = round(max(confidence, 0.65), 2)
      - verdict_text = f'{predicted_category} IMPAIRMENT DETECTED'
    """
    cat_upper = str(predicted_category).upper()
    if cat_upper in ["NONE", "NORMAL", "CLEARED"] or not is_impaired:
        category = "NONE"
        is_impaired = False
        risk_score = round(min(sclera_redness / 100.0 if sclera_redness > 1.0 else sclera_redness, 0.15), 2)
        verdict_text = "NO SUBSTANCE IMPAIRMENT DETECTED"
    else:
        category = cat_upper
        is_impaired = True
        risk_score = round(max(confidence, 0.65), 2)
        verdict_text = f"{category} IMPAIRMENT DETECTED"

    return {
        "category": category,
        "is_impaired": is_impaired,
        "risk_score": risk_score,
        "verdict_text": verdict_text
    }
