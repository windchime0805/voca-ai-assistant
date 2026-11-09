from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./voca.db"
    cors_origins: str = "http://localhost:5173"
    demo_mode: bool = True
    gnani_api_key: str = ""
    prisma_model: str = ""
    timbre_model: str = ""
    timbre_voice: str = "Kaveri"
    timbre_language: str = "en-IN"
    prisma_language: str = "en-IN"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
