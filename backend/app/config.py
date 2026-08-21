from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./ceo_ai.db"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    llm_provider: str = "ollama"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.1-8b-instant"
    groq_whisper_model: str = "whisper-large-v3-turbo"
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3.1"
    ollama_embed_model: str = "nomic-embed-text"
    cors_origins: str = "http://localhost:3003"
    jwt_secret: str = "dev-only-change-me-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7
    cron_secret: str | None = None

    resend_api_key: str | None = None
    email_from: str = "CEO.ai <onboarding@resend.dev>"
    app_base_url: str = "http://localhost:3003"
    password_reset_minutes: int = 60

    sentry_dsn: str | None = None

    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_pro: str | None = None
    stripe_price_team: str | None = None
    stripe_price_agency: str | None = None

    sarvam_api_key: str | None = None
    sarvam_model: str = "bulbul:v2"

    voice_provider: str = "sarvam"
    voice_language: str = "en-IN"

    elevenlabs_api_key: str | None = None
    azure_speech_key: str | None = None
    azure_speech_region: str = "westeurope"

    llm_local_only: bool = True
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    cerebras_api_key: str | None = None
    nvidia_api_key: str | None = None
    openrouter_api_key: str | None = None

    ollama_model: str | None = None
    groq_model: str | None = None
    gemini_model: str | None = None
    cerebras_model: str | None = None
    nvidia_model: str | None = None
    openrouter_model: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
