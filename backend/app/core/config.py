from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = ""
    TEST_DATABASE_URL: str = ""
    # LLM: los proveedores se intentan en orden (Docs/s10/restricciones.md RX-06)
    LLM_PROVIDERS: str = "groq,cloudflare"
    LLM_TIMEOUT_SECONDS: float = 20.0
    LLM_PROVIDER_COOLDOWN_SECONDS: int = 300
    LLM_MAX_TOKENS: int = 1024
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_TOKEN: str = ""
    CLOUDFLARE_AI_MODEL: str = "@cf/openai/gpt-oss-20b"
    SENTRY_DSN: str = ""
    CORS_ORIGINS: str = "http://localhost:5173"
    VERCEL_URL: str = ""
    BREVO_API_KEY: str = ""
    SMTP_FROM: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    APP_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def llm_providers_list(self) -> list[str]:
        return [p.strip().lower() for p in self.LLM_PROVIDERS.split(",") if p.strip()]


settings = Settings()