from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    TEST_DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    GROQ_API_KEY: str = ""
    SENTRY_DSN: str = ""
    VERCEL_URL: str = ""
    ENVIRONMENT: str = "development"
    APP_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()