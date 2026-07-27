from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    DATABASE_URL: str = "sqlite:///aegis_eye_forensic_audit.db"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "password123"
    APP_ENV: str = "production"
    LOG_LEVEL: str = "info"
    ENCRYPTION_SECRET_KEY: str = "j5p8_Z9vE7V2n_hM_6GZt-MbP0L12bZzG013579abcd="


settings = Settings()
