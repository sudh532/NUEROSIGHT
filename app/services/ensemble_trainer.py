import os
import logging
import numpy as np

logger = logging.getLogger("aegis_eye.ensemble")

ENSEMBLE_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "neurosight_ensemble_v3.pkl")

def build_high_performance_ensemble(X, y, save_path=ENSEMBLE_MODEL_PATH):
    """
    Constructs and calibrates a high-performance stacking ensemble:
    LightGBM + CatBoost + XGBoost -> Logistic Regression Meta-Learner -> CalibratedClassifierCV
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

        logger.info("[NEUROSIGHT ENSEMBLE] Training Calibrated Stacking Ensemble Model...")
        calibrated_ensemble.fit(X, y)

        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        joblib.dump(calibrated_ensemble, save_path)
        logger.info(f"[NEUROSIGHT ENSEMBLE SUCCESS] Model saved to {save_path}")
        return calibrated_ensemble
    except Exception as e:
        logger.warning(f"[NEUROSIGHT ENSEMBLE FALLBACK] Ensemble training fallback: {e}")
        return None
