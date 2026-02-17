from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

# Explicitly load .env file
load_dotenv()


class Settings(BaseSettings):
    # Database
    database_url: str
    
    # AWS
    aws_endpoint_url: str = "http://localhost:4566"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "veraproof-artifacts"
    
    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 1
    refresh_token_expiration_days: int = 30
    
    # Application
    environment: str = "development"
    backend_url: str
    frontend_verification_url: str
    frontend_dashboard_url: str
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:4200"
    
    # Rate Limiting
    max_concurrent_sessions: int = 10
    api_rate_limit_per_minute: int = 100
    
    # Session
    session_expiration_minutes: int = 15
    session_extension_minutes: int = 10
    
    # Artifact Storage
    artifact_retention_days: int = 90
    signed_url_expiration_seconds: int = 3600
    
    # Mock Services
    use_mock_sagemaker: bool = True
    use_mock_razorpay: bool = True
    use_local_auth: bool = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Debug: Print loaded settings
import logging
logger = logging.getLogger(__name__)
logger.info(f"Config loaded - Frontend URL: {settings.frontend_verification_url}")
