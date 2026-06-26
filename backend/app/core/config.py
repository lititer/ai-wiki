from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # Database
    database_url: str = "postgresql://aiwiki:aiwiki123@localhost:5432/aiwiki"

    # LLM Configuration
    llm_api_base: str = "https://token-plan-cn.xiaomimimo.com/anthropic"
    llm_api_key: str = ""
    llm_model: str = "mimo-v2.5-pro"

    # Embedding Configuration
    embedding_model: str = "all-MiniLM-L6-v2"

    # Application
    app_name: str = "AI Wiki"
    debug: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
