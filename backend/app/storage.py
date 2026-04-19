import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

from botocore.exceptions import ClientError, ConnectionClosedError, EndpointConnectionError

from app.aws_credentials import aws_cred_manager
from app.config import settings
from app.encryption import tenant_encryption_manager

logger = logging.getLogger(__name__)

_MAX_RETRIES = 2


class ArtifactStorageManager:
    """Manages artifact storage in S3 (LocalStack for dev)."""

    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.s3_bucket_name
        self._initialized = False

    def _lazy_init(self):
        if self._initialized:
            return
        self._connect()

    def _connect(self):
        try:
            session = aws_cred_manager.get_session()
            client_kwargs = {
                'service_name': 's3',
                'region_name': settings.aws_region,
            }
            if settings.aws_endpoint_url:
                client_kwargs['endpoint_url'] = settings.aws_endpoint_url

            self.s3_client = session.client(**client_kwargs)
            self._ensure_bucket_exists()
            self._initialized = True
            logger.info('S3 storage manager initialized', extra={
                'endpoint': settings.aws_endpoint_url or 'AWS (default)',
                'bucket': self.bucket_name,
            })
        except Exception as e:
            logger.warning(f'S3 storage not available: {e}')
            self.s3_client = None
            self._initialized = False
            if settings.environment != 'development':
                raise

    def _reconnect(self):
        logger.info('Forcing S3 client reconnection')
        self._initialized = False
        self.s3_client = None
        self._connect()

    def _ensure_bucket_exists(self):
        if not self.s3_client:
            return
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = int(e.response['Error'].get('Code', 0))
            if error_code == 404:
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f'S3 bucket created: {self.bucket_name}')
                except Exception as create_err:
                    logger.warning(f'Failed to create bucket: {create_err}')
            else:
                logger.warning(f'Unexpected error checking bucket: {e}')
        except Exception as e:
            logger.warning(f'S3 connection not ready (will retry later): {e}')

        if settings.environment == 'development' and self.s3_client:
            try:
                self.s3_client.put_bucket_cors(
                    Bucket=self.bucket_name,
                    CORSConfiguration={
                        'CORSRules': [{
                            'AllowedHeaders': ['*'],
                            'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                            'AllowedOrigins': ['*'],
                            'ExposeHeaders': ['ETag'],
                        }]
                    },
                )
                logger.info(f'CORS configured for S3 bucket: {self.bucket_name}')
            except Exception as cors_err:
                logger.warning(f'Failed to set CORS on bucket: {cors_err}')

    def _put_object_with_retry(self, key: str, body, content_type: str, metadata: Optional[dict] = None):
        last_error = None
        for attempt in range(_MAX_RETRIES):
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=body,
                    ContentType=content_type,
                    Metadata=metadata or {},
                )
                return
            except ClientError as e:
                error_code = e.response['Error'].get('Code', '')
                last_error = e
                if error_code in ('NoSuchBucket', 'NoSuchKey') and attempt < _MAX_RETRIES - 1:
                    logger.warning(f'S3 bucket missing, reconnecting (attempt {attempt + 1})', extra={'key': key})
                    self._reconnect()
                else:
                    raise
            except (EndpointConnectionError, ConnectionClosedError, ConnectionError) as e:
                last_error = e
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(f'S3 connection lost, reconnecting (attempt {attempt + 1})', extra={'key': key})
                    self._reconnect()
                else:
                    raise
        if last_error:
            raise last_error

    async def _store_bytes(self, tenant_id: str, s3_key: str, payload: bytes, content_type: str) -> Tuple[str, dict]:
        self._lazy_init()

        ciphertext, encryption_metadata = await tenant_encryption_manager.encrypt_for_tenant(str(tenant_id), payload)

        if not self.s3_client:
            logger.warning('S3 not available - skipping storage')
            return f'mock://{s3_key}', encryption_metadata

        self._put_object_with_retry(s3_key, ciphertext, content_type, metadata=encryption_metadata)
        return s3_key, encryption_metadata

    async def store_video(self, tenant_id: str, session_id: str, video_data: bytes) -> str:
        s3_key, _metadata = await self._store_bytes(str(tenant_id), f'{str(tenant_id)}/sessions/{str(session_id)}/video.webm', video_data, 'video/webm')
        logger.info(f'Video stored: {s3_key}', extra={'bytes': len(video_data)})
        return s3_key

    async def store_imu_data(self, tenant_id: str, session_id: str, imu_data: list) -> str:
        json_data = json.dumps(imu_data, indent=2).encode('utf-8')
        s3_key, _metadata = await self._store_bytes(str(tenant_id), f'{str(tenant_id)}/sessions/{str(session_id)}/imu_data.json', json_data, 'application/json')
        logger.info(f'IMU data stored: {s3_key}', extra={'samples': len(imu_data)})
        return s3_key

    async def store_optical_flow(self, tenant_id: str, session_id: str, flow_data: list) -> str:
        json_data = json.dumps(flow_data, indent=2).encode('utf-8')
        s3_key, _metadata = await self._store_bytes(str(tenant_id), f'{str(tenant_id)}/sessions/{str(session_id)}/optical_flow.json', json_data, 'application/json')
        logger.info(f'Optical flow data stored: {s3_key}', extra={'samples': len(flow_data)})
        return s3_key

    async def store_media_artifact(self, tenant_id: str, job_id: str, filename: str, media_data: bytes, content_type: str) -> str:
        extension = os.path.splitext(filename or '')[1].lower() or '.bin'
        s3_key, _metadata = await self._store_bytes(str(tenant_id), f'{str(tenant_id)}/media-analysis/{str(job_id)}/source{extension}', media_data, content_type)
        logger.info(f'Media analysis source stored: {s3_key}', extra={'bytes': len(media_data)})
        return s3_key

    async def store_session_artifact(self, tenant_id: str, session_id: str, filename: str, artifact_data: bytes, content_type: str) -> str:
        safe_name = filename or 'artifact.bin'
        s3_key, _metadata = await self._store_bytes(str(tenant_id), f'{str(tenant_id)}/sessions/{str(session_id)}/{safe_name}', artifact_data, content_type)
        logger.info(f'Session artifact stored: {s3_key}', extra={'bytes': len(artifact_data), 'content_type': content_type})
        return s3_key

    async def store_session_json_artifact(self, tenant_id: str, session_id: str, filename: str, payload) -> str:
        json_data = json.dumps(payload, indent=2, default=str).encode('utf-8')
        return await self.store_session_artifact(
            tenant_id=tenant_id,
            session_id=session_id,
            filename=filename,
            artifact_data=json_data,
            content_type='application/json',
        )

    async def get_object_metadata(self, s3_key: str) -> Dict[str, str]:
        if s3_key.startswith('mock://'):
            return {}
        self._lazy_init()
        if not self.s3_client:
            return {}
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
        except ClientError as e:
            error_code = e.response['Error'].get('Code', '')
            if error_code in ('404', 'NoSuchKey', 'NoSuchBucket'):
                return {}
            raise
        return response.get('Metadata') or {}

    async def generate_signed_url(self, s3_key: str, expiration: int = None) -> str:
        self._lazy_init()
        if expiration is None:
            expiration = settings.signed_url_expiration_seconds
        if not self.s3_client:
            logger.warning('S3 not available - returning mock artifact URL')
            return f'mock://artifact/{s3_key}'

        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
        except ClientError as e:
            error_code = e.response['Error'].get('Code', '')
            if error_code in ('404', 'NoSuchKey'):
                logger.error(f'Artifact not found in S3: {s3_key}')
                raise FileNotFoundError(f'Artifact not found in S3: {s3_key}')
            if error_code == 'NoSuchBucket':
                self._reconnect()
                try:
                    self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
                except Exception:
                    logger.error(f'Artifact not found after reconnect: {s3_key}')
                    raise FileNotFoundError(f'Artifact not found in S3: {s3_key}')

        url = self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': s3_key},
            ExpiresIn=expiration,
        )
        if settings.environment == 'development' and 'localstack:4566' in url:
            url = url.replace('localstack:4566', 'localhost:4566')
        logger.info(f'Signed URL generated for: {s3_key}')
        return url

    async def load_artifact_object(self, s3_key: str) -> Tuple[bytes, str, dict]:
        self._lazy_init()
        if not self.s3_client:
            raise FileNotFoundError(f'Artifact not available in storage: {s3_key}')

        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
        except ClientError as e:
            error_code = e.response['Error'].get('Code', '')
            if error_code in ('404', 'NoSuchKey', 'NoSuchBucket'):
                raise FileNotFoundError(f'Artifact not found in storage: {s3_key}') from e
            raise

        metadata = response.get('Metadata') or {}
        content_type = response.get('ContentType') or 'application/octet-stream'
        tenant_id = s3_key.split('/', 1)[0]
        payload = response['Body'].read()
        plaintext = await tenant_encryption_manager.decrypt_for_tenant(tenant_id, payload, metadata)
        return plaintext, content_type, metadata

    async def load_artifact_bytes(self, s3_key: str) -> bytes:
        payload, _content_type, _metadata = await self.load_artifact_object(s3_key)
        return payload

    async def load_json_artifact(self, s3_key: str):
        artifact_bytes = await self.load_artifact_bytes(s3_key)
        return json.loads(artifact_bytes.decode('utf-8'))

    async def schedule_deletion(self, s3_key: str, days: int = None):
        if days is None:
            days = settings.artifact_retention_days
        deletion_date = datetime.utcnow() + timedelta(days=days)
        logger.info(f'Artifact {s3_key} scheduled for deletion on {deletion_date}')

    async def delete_artifact(self, s3_key: str):
        self._lazy_init()
        if not self.s3_client:
            logger.warning('S3 not available - skipping artifact deletion')
            return
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f'Artifact deleted: {s3_key}')
        except Exception as e:
            logger.error(f'Failed to delete artifact: {e}')
            raise


storage_manager = ArtifactStorageManager()
