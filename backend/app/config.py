from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

# Load .env file but DO NOT override existing OS environment variables.
# AWS Lightsail injects environment variables at runtime. If override=True, 
# the bundled .env file will overwrite the production credentials!
load_dotenv(override=False)

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://veraproof:test@localhost:5432/veraproof_test"
    
    # AWS
    aws_endpoint_url: str = ""  # Empty = real AWS; set to http://localhost:4566 for LocalStack in .env
    aws_assume_role_arn: str = "" # Role to assume via STS in production. Empty = use static creds
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    aws_region: str = "ap-south-1"
    s3_bucket_name: str = "veraproof-artifacts"
    
    # JWT
    jwt_secret: str = "test-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 1
    refresh_token_expiration_days: int = 30
    
    # Application
    environment: str = "development"
    backend_url: str = "http://localhost:8100"
    frontend_verification_url: str = "http://localhost:8300"
    frontend_dashboard_url: str = "http://localhost:8200"
    
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
    
    # Port configuration (optional, for reference only)
    backend_http_port: int = 8100
    backend_https_port: int = 8443
    partner_dashboard_port: int = 8200
    verification_interface_port: int = 8300
    postgres_port: int = 5432
    localstack_port: int = 4566
    
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
logger.info(f"Config loaded - CORS Origins: {settings.cors_origins}")
logger.info(f"Config loaded - CORS Origins List: {settings.cors_origins_list}")
