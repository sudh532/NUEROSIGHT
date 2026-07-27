import os
import logging
import numpy as np

logger = logging.getLogger("aegis_eye.embeddings")

try:
    import torch  # type: ignore
    import torchvision.models as models  # type: ignore
    import torchvision.transforms as transforms  # type: ignore
    from PIL import Image  # type: ignore
    HAS_TORCH = True
    logger.info("[NEUROSIGHT EMBEDDINGS] PyTorch / Torchvision available.")
except ImportError as e:
    HAS_TORCH = False
    logger.warning(f"[NEUROSIGHT EMBEDDINGS] PyTorch / Torchvision not installed: {e}. Numpy fallback active.")

class OcularEmbeddingExtractor:
    def __init__(self):
        self.has_torch = HAS_TORCH
        self.model = None
        if HAS_TORCH:
            try:
                # Use exact torchvision enum to prevent deprecation UserWarnings
                from torchvision.models import MobileNet_V3_Small_Weights
                self.model = models.mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
            except (ImportError, AttributeError):
                try:
                    self.model = models.mobilenet_v3_small(pretrained=True)
                except Exception as ex:
                    logger.warning(f"[NEUROSIGHT EMBEDDINGS] Failed to load MobileNetV3 weights: {ex}.")
                    self.has_torch = False
            except Exception as ex:
                logger.warning(f"[NEUROSIGHT EMBEDDINGS] Failed to load MobileNetV3 weights: {ex}.")
                self.has_torch = False

            if self.model is not None:
                self.model.classifier = torch.nn.Identity()
                self.model.eval()
                self.transform = transforms.Compose([
                    transforms.Resize((112, 112)),
                    transforms.ToTensor(),
                    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                ])

    def extract_vector(self, pil_image) -> np.ndarray:
        if self.has_torch and self.model and pil_image is not None:
            try:
                if isinstance(pil_image, np.ndarray):
                    import cv2
                    rgb = cv2.cvtColor(pil_image, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(rgb)
                with torch.no_grad():
                    tensor_img = self.transform(pil_image).unsqueeze(0)
                    vec = self.model(tensor_img).squeeze().numpy()
                    if vec.ndim > 1:
                        vec = vec.flatten()
                    return vec[:128].astype(np.float32)
            except Exception as err:
                logger.error(f"[NEUROSIGHT EMBEDDINGS] Error extracting embedding vector: {err}")
        # Safe 128-dim fallback vector if PyTorch missing or error
        return np.zeros(128, dtype=np.float32)

    def get_embedding(self, cv2_or_pil_img) -> np.ndarray:
        return self.extract_vector(cv2_or_pil_img)

OcularFeatureExtractor = OcularEmbeddingExtractor

_extractor_instance = None

def get_ocular_feature_extractor() -> OcularEmbeddingExtractor:
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = OcularEmbeddingExtractor()
    return _extractor_instance
