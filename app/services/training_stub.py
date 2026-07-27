import os
import sys
from typing import Tuple
import numpy as np

# Resolve project paths to enable easy execution
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "aegis_lgb_model.txt")


def generate_synthetic_data(num_samples: int = 1500) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates synthetic tabular features mapping to the 4 categories with 14 augmented features:
    0: Normal
    1: Chemical Narcotic Impairment
    2: Pathological Infection
    3: Neurological Trauma
    
    14 Feature Columns Order:
    [
      0: left_redness_dev, 1: right_redness_dev, 
      2: left_pir_dev, 3: right_pir_dev, 
      4: anisocoria_delta, 5: eyelid_aperture_score, 
      6: lux_variance_index, 7: impairment_risk_score,
      8: anisocoria_ratio, 9: redness_asymmetry,
      10: aperture_symmetry, 11: pupil_aperture_interaction,
      12: pir_delta_from_baseline, 13: redness_delta_from_baseline
    ]
    """
    np.random.seed(42)
    
    X = []
    y = []
    
    for _ in range(num_samples):
        cls = np.random.choice([0, 1, 2, 3], p=[0.4, 0.2, 0.2, 0.2])
        
        # Base settings (Normal Baseline)
        left_red = np.random.normal(0.01, 0.01)
        right_red = np.random.normal(0.01, 0.01)
        left_pir = np.random.normal(0.0, 0.02)
        right_pir = np.random.normal(0.0, 0.02)
        anisocoria = np.random.normal(0.1, 0.05)
        eyelid_aperture = np.random.normal(0.38, 0.02)
        lux = np.random.normal(0.02, 0.01)
        impairment_risk = np.random.normal(0.08, 0.03) # low impairment default
        
        if cls == 1:
            # Chemical Narcotic Impairment: High PIR deviations or constriction
            is_stimulant = np.random.choice([True, False])
            if is_stimulant:
                left_pir = np.random.normal(0.15, 0.04)
                right_pir = np.random.normal(0.15, 0.04)
            else:
                left_pir = np.random.normal(-0.15, 0.04)
                right_pir = np.random.normal(-0.15, 0.04)
            if np.random.choice([True, False]):
                left_red = np.random.normal(0.20, 0.04)
                right_red = np.random.normal(0.20, 0.04)
            impairment_risk = np.random.normal(0.85, 0.05)
                
        elif cls == 2:
            # Pathological Infection: Asymmetric sclera redness
            left_red = np.random.normal(0.22, 0.05)
            right_red = np.random.normal(0.02, 0.02)
            if np.random.choice([True, False]):
                left_red, right_red = right_red, left_red
            impairment_risk = np.random.normal(0.35, 0.08)
                
        elif cls == 3:
            # Neurological Trauma: Anisocoria & Ptosis
            anisocoria = np.random.normal(1.8, 0.3)
            eyelid_aperture = np.random.normal(0.25, 0.03)
            impairment_risk = np.random.normal(0.80, 0.08)
            
        # Clip values to physical boundaries
        left_red = max(0.0, left_red)
        right_red = max(0.0, right_red)
        anisocoria = max(0.0, anisocoria)
        eyelid_aperture = max(0.0, eyelid_aperture)
        impairment_risk = max(0.0, min(1.0, impairment_risk))
        
        # Calculate augmented physics & biometric features (Phase 1)
        abs_pir_left = max(0.01, 0.33 + left_pir)
        abs_pir_right = max(0.01, 0.33 + right_pir)
        max_pir = max(abs_pir_left, abs_pir_right, 1e-5)
        
        anisocoria_ratio = abs(abs_pir_left - abs_pir_right) / max_pir
        redness_asymmetry = abs(left_red - right_red)
        max_aperture = max(eyelid_aperture, 0.01, 1e-5)
        aperture_symmetry = min(eyelid_aperture, 0.38) / max_aperture
        pupil_aperture_interaction = ((abs_pir_left + abs_pir_right) / 2.0) * eyelid_aperture
        pir_delta_from_baseline = ((abs_pir_left + abs_pir_right) / 2.0) - 0.33
        redness_delta_from_baseline = ((left_red + right_red) / 2.0) - 0.04
        
        row = [
            left_red, right_red, left_pir, right_pir, 
            anisocoria, eyelid_aperture, lux, impairment_risk,
            anisocoria_ratio, redness_asymmetry, aperture_symmetry,
            pupil_aperture_interaction, pir_delta_from_baseline, redness_delta_from_baseline
        ]
        X.append(row)
        y.append(cls)
        
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def run_training():
    """Trains a LightGBM multi-class model with SMOTE oversampling and saves model weights."""
    try:
        import lightgbm as lgb
        print("[NEUROSIGHT ML] Imported LightGBM successfully.")
    except ImportError:
        print("[NEUROSIGHT ML WARNING] LightGBM not installed in active python context.")
        return False
        
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    print("[NEUROSIGHT ML] Generating augmented synthetic datasets (14 features)...")
    X, y = generate_synthetic_data(1500)
    
    # SMOTE Over-Sampling (Phase 2)
    try:
        from imblearn.over_sampling import SMOTE
        smote = SMOTE(random_state=42)
        X, y = smote.fit_resample(X, y)
        print(f"[NEUROSIGHT ML] SMOTE over-sampling applied. Resampled dataset size: {X.shape[0]}")
    except ImportError:
        print("[NEUROSIGHT ML INFO] imbalanced-learn not found. Using default balanced dataset.")
    
    # Configure hyperparameter tuned parameters (Phase 3)
    params = {
        'objective': 'multiclass',
        'num_class': 4,
        'metric': 'multi_logloss',
        'boosting_type': 'gbdt',
        'learning_rate': 0.05,
        'num_leaves': 31,
        'min_data_in_leaf': 15,
        'max_depth': 6,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 1,
        'verbosity': -1,
        'seed': 42
    }
    
    train_data = lgb.Dataset(X, label=y)
    print("[NEUROSIGHT ML] Fitting LightGBM multiclass booster model...")
    bst = lgb.train(
        params,
        train_data,
        num_boost_round=150
    )
    
    bst.save_model(MODEL_PATH)
    print(f"[NEUROSIGHT ML SUCCESS] Booster model weights saved at: {MODEL_PATH}")
    return True


if __name__ == "__main__":
    run_training()
