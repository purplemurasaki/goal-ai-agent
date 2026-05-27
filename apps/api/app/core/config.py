from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
    )
    supabase_jwt_secret: str = "super-secret-jwt-token-with-at-least-32-characters-long"
    cors_origins: str = "http://localhost:3000"
    openai_api_key: str = ""
    openai_model_coach: str = "gpt-4o-mini"
    openai_model_decompose: str = "gpt-4o"
    openai_model_review: str = "gpt-4o-mini"
    ai_daily_limit: int = 50

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
