from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""

    DATABASE_URL: str | None = None

    POSTGRES_USER: str = "smarthome"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "smarthome_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"

    SECRET_KEY: str = Field(default="dev-only-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    WEATHER_LATITUDE: float = 52.2297
    WEATHER_LONGITUDE: float = 21.0122
    SIMULATION_INTERVAL_SECONDS: int = 60

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            "postgresql+asyncpg://"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
