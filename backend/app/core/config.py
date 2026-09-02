from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str

    # Groq
    groq_api_key: str
    groq_model: str = "openai/gpt-oss-120b"
    groq_embedding_model: str = "all-MiniLM-L6-v2"

    # Storage
    master_plans_bucket: str = "master-plans"
    quotations_bucket: str = "quotations"

    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Anonymous sessions
    anonymous_session_expire_hours: int = 24

    # Quotation processing
    quotation_retention_days: int = 30
    max_quotation_file_size_mb: int = 20
    ocr_confidence_threshold: float = 0.6

    # Rate limiting
    public_chat_max_messages_per_session: int = 50
    public_upload_max_per_session: int = 5
    public_upload_max_per_ip_per_hour: int = 10

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Misc
    env: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
