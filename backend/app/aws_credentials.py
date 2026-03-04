import boto3
import threading
import time
import logging
from datetime import datetime, timezone
from app.config import settings

logger = logging.getLogger(__name__)

class AWSCredentialManager:
    """
    Manages AWS credentials for the backend, dynamically assuming an IAM role
    via STS to avoid using long-lived static API keys in production.
    Auto-refreshes credentials 15 minutes before expiration.
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        self._session = None
        self._expiration = None
        self._refresh_thread = None
        self._stop_event = threading.Event()
        
        # Setup initial session
        self._refresh_credentials()
        
        # Start background thread if assuming role is enabled
        if settings.aws_assume_role_arn and settings.environment != "development":
            self._start_refresh_thread()

    def _refresh_credentials(self):
        with self._lock:
            # Skip STS AssumeRole in dev mode or if explicitly disabled
            if not settings.aws_assume_role_arn or settings.environment == "development":
                client_kwargs = {
                    'aws_access_key_id': settings.aws_access_key_id,
                    'aws_secret_access_key': settings.aws_secret_access_key,
                    'region_name': settings.aws_region
                }
                self._session = boto3.Session(**client_kwargs)
                self._expiration = None
                logger.info("STS: Using static AWS credentials (AssumeRole disabled or dev mode).")
                return

            logger.info(f"STS: Assuming AWS role: {settings.aws_assume_role_arn}")
            try:
                # Create base STS client using the minimal static IAM user keys
                sts_client = boto3.client(
                    'sts',
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                    region_name=settings.aws_region
                )
                
                response = sts_client.assume_role(
                    RoleArn=settings.aws_assume_role_arn,
                    RoleSessionName="VeraproofBackendRuntime",
                    DurationSeconds=3600  # 1 hour
                )
                
                credentials = response['Credentials']
                self._session = boto3.Session(
                    aws_access_key_id=credentials['AccessKeyId'],
                    aws_secret_access_key=credentials['SecretAccessKey'],
                    aws_session_token=credentials['SessionToken'],
                    region_name=settings.aws_region
                )
                self._expiration = credentials['Expiration']
                logger.info(f"STS: Successfully assumed role. Expires at {self._expiration}")
                
            except Exception as e:
                logger.error(f"STS: Failed to assume role {settings.aws_assume_role_arn}: {e}")
                # Re-raise so startup fails quickly if IAM is misconfigured
                if not self._session:
                    raise

    def _start_refresh_thread(self):
        self._refresh_thread = threading.Thread(target=self._refresh_loop, daemon=True, name="AWSCredentialsRefresher")
        self._refresh_thread.start()

    def _refresh_loop(self):
        while not self._stop_event.is_set():
            if self._expiration:
                # Calculate time to expiration
                now = datetime.now(self._expiration.tzinfo if self._expiration.tzinfo else timezone.utc)
                time_to_expiry = (self._expiration - now).total_seconds()
                
                # Refresh 15 minutes (900 seconds) before expiration
                if time_to_expiry <= 900:
                    logger.info(f"STS: Temporary credentials expiring in {time_to_expiry:.0f}s. Refreshing...")
                    try:
                        self._refresh_credentials()
                    except Exception as e:
                        logger.error(f"STS: Error refreshing credentials during background loop: {e}")
            
            # Check every minute
            self._stop_event.wait(60)

    def get_session(self) -> boto3.Session:
        """Returns the pre-authenticated boto3 Session with active credentials."""
        with self._lock:
            if not self._session:
                self._refresh_credentials()
            return self._session

    def stop(self):
        """Halts the background refresh thread."""
        self._stop_event.set()
        if self._refresh_thread:
            self._refresh_thread.join(timeout=2)

# Global singleton instance
aws_cred_manager = AWSCredentialManager()
