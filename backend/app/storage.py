import boto3
from botocore.exceptions import ClientError, EndpointConnectionError, ConnectionClosedError
from typing import Optional
import json
from datetime import datetime, timedelta
import logging
from app.config import settings
from app.aws_credentials import aws_cred_manager

logger = logging.getLogger(__name__)

# Maximum retry attempts for S3 operations after reconnection
_MAX_RETRIES = 2


class ArtifactStorageManager:
    """Manages artifact storage in S3 (LocalStack for dev).
    
    Includes automatic reconnection and bucket-recreation logic to handle
    LocalStack container restarts or transient network failures gracefully.
    """
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.s3_bucket_name
        self._initialized = False
    
    def _lazy_init(self):
        """Lazy initialization of S3 client"""
        if self._initialized:
            return
        self._connect()
    
    def _connect(self):
        """Create a fresh boto3 S3 client and ensure the bucket exists."""
        try:
            session = aws_cred_manager.get_session()
            client_kwargs = {
                'service_name': 's3',
                'region_name': settings.aws_region
            }
            # Only pass endpoint_url for LocalStack (local dev / CI)
            if settings.aws_endpoint_url:
                client_kwargs['endpoint_url'] = settings.aws_endpoint_url
            
            self.s3_client = session.client(**client_kwargs)
            self._ensure_bucket_exists()
            self._initialized = True
            logger.info("S3 storage manager initialized", extra={
                "endpoint": settings.aws_endpoint_url or "AWS (default)",
                "bucket": self.bucket_name,
            })
        except Exception as e:
            logger.warning(f"S3 storage not available: {e}")
            self.s3_client = None
            self._initialized = False
            if settings.environment != "development":
                raise
    
    def _reconnect(self):
        """Force a full reconnection by resetting initialization state."""
        logger.info("Forcing S3 client reconnection")
        self._initialized = False
        self.s3_client = None
        self._connect()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        if not self.s3_client:
            return
            
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = int(e.response['Error'].get('Code', 0))
            if error_code == 404:
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"S3 bucket created: {self.bucket_name}")
                except Exception as create_err:
                    logger.warning(f"Failed to create bucket: {create_err}")
            else:
                logger.warning(f"Unexpected error checking bucket: {e}")
        except Exception as e:
            logger.warning(f"S3 connection not ready (will retry later): {e}")

        # Ensure CORS is configured for localhost testing
        if settings.environment == "development" and self.s3_client:
            try:
                self.s3_client.put_bucket_cors(
                    Bucket=self.bucket_name,
                    CORSConfiguration={
                        'CORSRules': [
                            {
                                'AllowedHeaders': ['*'],
                                'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                                'AllowedOrigins': ['*'],
                                'ExposeHeaders': ['ETag']
                            }
                        ]
                    }
                )
                logger.info(f"CORS configured for S3 bucket: {self.bucket_name}")
            except Exception as cors_err:
                logger.warning(f"Failed to set CORS on bucket: {cors_err}")
    
    def _put_object_with_retry(self, key: str, body, content_type: str):
        """Put an object into S3 with automatic retry on connection failures.
        
        On the first failure (e.g. NoSuchBucket, connection reset), this method
        forces a full client reconnection and retries the upload once.
        """
        last_error = None
        for attempt in range(_MAX_RETRIES):
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=body,
                    ContentType=content_type
                )
                return  # Success
            except ClientError as e:
                error_code = e.response['Error'].get('Code', '')
                last_error = e
                if error_code in ('NoSuchBucket', 'NoSuchKey') and attempt < _MAX_RETRIES - 1:
                    logger.warning(f"S3 bucket missing, reconnecting (attempt {attempt + 1})", extra={"key": key})
                    self._reconnect()
                else:
                    raise
            except (EndpointConnectionError, ConnectionClosedError, ConnectionError) as e:
                last_error = e
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(f"S3 connection lost, reconnecting (attempt {attempt + 1})", extra={"key": key})
                    self._reconnect()
                else:
                    raise
        # Should not reach here, but just in case
        if last_error:
            raise last_error
    
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
            return f"mock://{str(tenant_id)}/sessions/{str(session_id)}/video.webm"
        
        s3_key = f"{str(tenant_id)}/sessions/{str(session_id)}/video.webm"
        
        self._put_object_with_retry(s3_key, video_data, 'video/webm')
        logger.info(f"Video stored: {s3_key}", extra={"bytes": len(video_data)})
        return s3_key
    
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
            return f"mock://{str(tenant_id)}/sessions/{str(session_id)}/imu_data.json"
        
        s3_key = f"{str(tenant_id)}/sessions/{str(session_id)}/imu_data.json"
        
        json_data = json.dumps(imu_data, indent=2)
        self._put_object_with_retry(s3_key, json_data.encode('utf-8'), 'application/json')
        logger.info(f"IMU data stored: {s3_key}", extra={"samples": len(imu_data)})
        return s3_key
    
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
            return f"mock://{str(tenant_id)}/sessions/{str(session_id)}/optical_flow.json"
        
        s3_key = f"{str(tenant_id)}/sessions/{str(session_id)}/optical_flow.json"
        
        json_data = json.dumps(flow_data, indent=2)
        self._put_object_with_retry(s3_key, json_data.encode('utf-8'), 'application/json')
        logger.info(f"Optical flow data stored: {s3_key}", extra={"samples": len(flow_data)})
        return s3_key
    
    async def generate_signed_url(
        self,
        s3_key: str,
        expiration: int = None
    ) -> str:
        """Generate signed URL for artifact download"""
        self._lazy_init()
        
        if expiration is None:
            expiration = settings.signed_url_expiration_seconds
            
        if not self.s3_client:
            logger.warning("S3 not available - returning mock artifact URL")
            return f"mock://artifact/{s3_key}"
        
        # Verify the object actually exists before generating a URL
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
        except ClientError as e:
            error_code = e.response['Error'].get('Code', '')
            if error_code in ('404', 'NoSuchKey'):
                logger.error(f"Artifact not found in S3: {s3_key}")
                raise FileNotFoundError(f"Artifact not found in S3: {s3_key}")
            # For NoSuchBucket, try reconnecting
            if error_code == 'NoSuchBucket':
                self._reconnect()
                try:
                    self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
                except Exception:
                    logger.error(f"Artifact not found after reconnect: {s3_key}")
                    raise FileNotFoundError(f"Artifact not found in S3: {s3_key}")
            
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )
            
            # Map internal docker hostname to localhost for browser resolution
            if settings.environment == "development" and "localstack:4566" in url:
                url = url.replace("localstack:4566", "localhost:4566")
                
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
        self._lazy_init()
        if not self.s3_client:
            logger.warning("S3 not available - skipping artifact deletion")
            return
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
