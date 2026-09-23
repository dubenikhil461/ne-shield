from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    """Application configuration from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/landslide_db"

    # JWT
    JWT_SECRET_KEY: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    CORS_ORIGINS: str = '["http://localhost:5173"]'

    # AI/ML
    AI_ML_MODE: str = "demo"

    # Moisture thresholds
    MOISTURE_OFFLINE_THRESHOLD_SECONDS: int = 120
    MOISTURE_WARNING_THRESHOLD: float = 65.0
    MOISTURE_HIGH_THRESHOLD: float = 75.0

    # WebSocket
    WEBSOCKET_ENABLED: bool = True

    # Impact analysis
    IMPACT_RADIUS_KM: float = 5.0

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)


settings = Settings()
