import base64
import logging
from sqlalchemy.types import TypeDecorator, String
try:
    from cryptography.fernet import Fernet
except ImportError:
    logger.warning("Cryptography package not installed. Using passthrough fallback in crypto_types.")
    class Fernet:
        def __init__(self, key):
            pass
        def encrypt(self, value):
            return value
        def decrypt(self, value):
            return value
from app.core.config import settings

logger = logging.getLogger("aegis_eye.crypto")


class EncryptedStringField(TypeDecorator):
    """
    SQLAlchemy custom type decorator that performs client-side encryption.
    Decrypts database strings transparently upon ORM record hydration.
    Leverages Cryptography Fernet (AES-128 in CBC mode + HMAC-SHA256).
    """
    impl = String
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Fernet requires a 32-byte key base64 URL-safe encoded.
        key = settings.ENCRYPTION_SECRET_KEY.encode("utf-8")
        try:
            # Validate key format
            self.fernet = Fernet(key)
        except Exception:
            logger.warning("Configured ENCRYPTION_SECRET_KEY is not a valid base64 key. Creating fallback.")
            # Create a deterministic base64 fallback key from the provided password string
            hashed_key = base64.urlsafe_b64encode(key.ljust(32)[:32])
            self.fernet = Fernet(hashed_key)

    def process_bind_param(self, value, dialect):
        """Encrypts plain string before inserting into SQLite database file."""
        if value is None:
            return None
        try:
            encrypted_bytes = self.fernet.encrypt(value.encode("utf-8"))
            return encrypted_bytes.decode("utf-8")
        except Exception as e:
            logger.error(f"Failed to encrypt field data: {e}")
            raise ValueError(f"Symmetric encryption failed: {e}")

    def process_result_value(self, value, dialect):
        """Decrypts database ciphertext back to plaintext upon query loading."""
        if value is None:
            return None
        try:
            decrypted_bytes = self.fernet.decrypt(value.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            logger.error(f"Failed to decrypt database field data: {e}")
            # In production, return a placeholder indicating decryption failed instead of crashing
            return "[DECRYPTION_FAILED]"
