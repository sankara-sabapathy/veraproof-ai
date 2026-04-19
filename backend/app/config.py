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
    ws_token_expiration_seconds: int = 900
    require_ws_token: bool = False

    # Dashboard/OIDC sessions
    app_session_secret: str = "change-me-session-secret"
    session_cookie_name: str = "vp_session"
    csrf_cookie_name: str = "vp_csrf"
    oidc_state_cookie_name: str = "vp_oidc_state"
    session_max_age_hours: int = 12
    session_cookie_samesite: str = "lax"
    session_cookie_secure: bool = False
    google_oauth_enabled: bool = False
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    google_oauth_scopes: str = "openid email profile"
    platform_admin_emails: str = ""

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

    # Artifact Storage / encryption
    artifact_retention_days: int = 90
    signed_url_expiration_seconds: int = 3600
    app_encryption_key: str = "change-me-encryption-key"
    tenant_runtime_key_ttl_seconds: int = 1800

    # Mock Services
    use_mock_sagemaker: bool = True
    use_mock_razorpay: bool = True
    use_local_auth: bool = True
    dev_local_admin_email: str = "admin@veraproof.ai"
    dev_local_admin_password: str = "Admin@123"

    # Port configuration (optional, for reference only)
    backend_http_port: int = 8100
    backend_https_port: int = 8443
    partner_dashboard_port: int = 8200
    verification_interface_port: int = 8300
    postgres_port: int = 5432
    localstack_port: int = 4566

    @property
    def platform_admin_emails_list(self) -> List[str]:
        emails: List[str] = []
        for email in self.platform_admin_emails.split(','):
            candidate = email.strip().lower()
            if candidate and candidate not in emails:
                emails.append(candidate)
        return emails

    @property
    def cors_origins_list(self) -> List[str]:
        origins: List[str] = []
        for origin in self.cors_origins.split(","):
            candidate = origin.strip()
            if not candidate:
                continue
            origins.append(candidate)
            if "localhost" in candidate:
                origins.append(candidate.replace("localhost", "127.0.0.1"))
            elif "127.0.0.1" in candidate:
                origins.append(candidate.replace("127.0.0.1", "localhost"))

        deduped: List[str] = []
        for origin in origins:
            if origin not in deduped:
                deduped.append(origin)
        return deduped

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
