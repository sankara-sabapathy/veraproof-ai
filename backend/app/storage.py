import boto3
from botocore.exceptions import ClientError
from typing import Optional
import json
from datetime import datetime, timedelta
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class ArtifactStorageManager:
    """Manages artifact storage in S3 (LocalStack for dev)"""
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.s3_bucket_name
        self._initialized = False
    
    def _lazy_init(self):
        """Lazy initialization of S3 client"""
        if self._initialized:
            return
        
        try:
            self.s3_client = boto3.client(
                's3',
                endpoint_url=settings.aws_endpoint_url,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
            self._ensure_bucket_exists()
            self._initialized = True
            logger.info("S3 storage manager initialized")
        except Exception as e:
            logger.warning(f"S3 storage not available: {e}")
            if settings.environment != "development":
                raise
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        if not self.s3_client:
            return
            
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 bucket exists: {self.bucket_name}")
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                logger.info(f"S3 bucket created: {self.bucket_name}")
            except Exception as e:
                logger.warning(f"Failed to create bucket (will retry later): {e}")
        except Exception as e:
            logger.warning(f"S3 connection not ready (will retry later): {e}")
    
    async def store_video(
        self,
        tenant_id: str,
        session_id: str,
        video_data: bytes
    ) -> str:
        """Store video in S3, return S3 key"""
        self._lazy_init()
        
        if not self.s3_client:
            logger.warning("S3 not available - skipping video storage")
            return f"mock://{tenant_id}/sessions/{session_id}/video.webm"
        
        s3_key = f"{tenant_id}/sessions/{session_id}/video.webm"
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=video_data,
                ContentType='video/webm'
            )
            logger.info(f"Video stored: {s3_key}")
            return s3_key
        except Exception as e:
            logger.error(f"Failed to store video: {e}")
            raise
    
    async def store_imu_data(
        self,
        tenant_id: str,
        session_id: str,
        imu_data: list
    ) -> str:
        """Store IMU data as JSON in S3"""
        self._lazy_init()
        
        if not self.s3_client:
            logger.warning("S3 not available - skipping IMU data storage")
            return f"mock://{tenant_id}/sessions/{session_id}/imu_data.json"
        
        s3_key = f"{tenant_id}/sessions/{session_id}/imu_data.json"
        
        try:
            json_data = json.dumps(imu_data, indent=2)
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=json_data.encode('utf-8'),
                ContentType='application/json'
            )
            logger.info(f"IMU data stored: {s3_key}")
            return s3_key
        except Exception as e:
            logger.error(f"Failed to store IMU data: {e}")
            raise
    
    async def store_optical_flow(
        self,
        tenant_id: str,
        session_id: str,
        flow_data: list
    ) -> str:
        """Store optical flow data in S3"""
        self._lazy_init()
        
        if not self.s3_client:
            logger.warning("S3 not available - skipping optical flow storage")
            return f"mock://{tenant_id}/sessions/{session_id}/optical_flow.json"
        
        s3_key = f"{tenant_id}/sessions/{session_id}/optical_flow.json"
        
        try:
            json_data = json.dumps(flow_data, indent=2)
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=json_data.encode('utf-8'),
                ContentType='application/json'
            )
            logger.info(f"Optical flow data stored: {s3_key}")
            return s3_key
        except Exception as e:
            logger.error(f"Failed to store optical flow data: {e}")
            raise
    
    async def generate_signed_url(
        self,
        s3_key: str,
        expiration: int = None
    ) -> str:
        """Generate signed URL for artifact download"""
        if expiration is None:
            expiration = settings.signed_url_expiration_seconds
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )
            logger.info(f"Signed URL generated for: {s3_key}")
            return url
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            raise
    
    async def schedule_deletion(self, s3_key: str, days: int = None):
        """Schedule artifact deletion after N days"""
        if days is None:
            days = settings.artifact_retention_days
        
        # In production, this would use S3 lifecycle policies
        # For now, just log the intent
        deletion_date = datetime.utcnow() + timedelta(days=days)
        logger.info(f"Artifact {s3_key} scheduled for deletion on {deletion_date}")
    
    async def delete_artifact(self, s3_key: str):
        """Delete artifact from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Artifact deleted: {s3_key}")
        except Exception as e:
            logger.error(f"Failed to delete artifact: {e}")
            raise


# Global storage manager instance
storage_manager = ArtifactStorageManager()
