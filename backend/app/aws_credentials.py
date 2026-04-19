import boto3
import threading
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class AWSCredentialManager:
    """
    Manages AWS credentials for the backend.
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        self._session = None
        self._refresh_credentials()
        
    def _refresh_credentials(self):
        with self._lock:
            client_kwargs = {
                'aws_access_key_id': settings.aws_access_key_id,
                'aws_secret_access_key': settings.aws_secret_access_key,
                'region_name': settings.aws_region
            }
            self._session = boto3.Session(**client_kwargs)
            logger.info("AWS: Using static AWS credentials.")

    def get_session(self) -> boto3.Session:
        """Returns the pre-authenticated boto3 Session with active credentials."""
        with self._lock:
            if not self._session:
                self._refresh_credentials()
            return self._session

    def stop(self):
        """Halts any background processes (no-op as refresh thread is removed)."""
        pass

# Global singleton instance
aws_cred_manager = AWSCredentialManager()
