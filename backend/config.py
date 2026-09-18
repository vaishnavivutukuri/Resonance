from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "mongodb://localhost:27017/resonance"
    SECRET_KEY: str = "change-me-to-a-long-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AUDIO_STORAGE_PATH: str = "./storage"
    MAX_UPLOAD_MB: int = 50
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@resonance.com"
    ADMIN_PASSWORD: str = "admin123"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
