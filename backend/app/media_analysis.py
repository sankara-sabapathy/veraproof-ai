import base64
import json
import logging
import os
import tempfile
import uuid
from typing import Any, Dict, Optional

import cv2
import numpy as np

from app.models import MediaAnalysisStatus
from app.database import db_manager
from app.quota import quota_manager
from app.scoring import evaluate_trust_status
from app.storage import storage_manager
from app.video_utils import extract_sparse_keyframes
from app.ai_provider import get_ai_pipeline

logger = logging.getLogger(__name__)


class MediaAnalysisManager:
    ALLOWED_IMAGE_TYPES = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    }
    ALLOWED_VIDEO_TYPES = {
        "video/webm",
        "video/mp4",
        "video/quicktime",
        "video/ogg",
    }
    MAX_IMAGE_BYTES = 10 * 1024 * 1024
    MAX_VIDEO_BYTES = 50 * 1024 * 1024

    def validate_upload(self, filename: str, content_type: str, file_size: int) -> str:
        normalized_type = (content_type or "").lower()

        if normalized_type in self.ALLOWED_IMAGE_TYPES:
            if file_size > self.MAX_IMAGE_BYTES:
                raise ValueError("Image uploads are limited to 10 MB")
            return "image"

        if normalized_type in self.ALLOWED_VIDEO_TYPES:
            if file_size > self.MAX_VIDEO_BYTES:
                raise ValueError("Video uploads are limited to 50 MB")
            return "video"

        raise ValueError("Unsupported media type. Upload JPG, PNG, WEBP, WEBM, MP4, MOV, or OGG.")

    async def create_job(
        self,
        tenant_id: str,
        filename: str,
        content_type: str,
        media_bytes: bytes,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        metadata = metadata or {}
        media_type = self.validate_upload(filename, content_type, len(media_bytes))
        job_id = str(uuid.uuid4())

        artifact_s3_key = await storage_manager.store_media_artifact(
            tenant_id=tenant_id,
            job_id=job_id,
            filename=filename,
            media_data=media_bytes,
            content_type=content_type,
        )

        query = """
            INSERT INTO media_analysis_jobs (
                job_id,
                tenant_id,
                status,
                media_type,
                content_type,
                source_filename,
                file_size_bytes,
                metadata,
                artifact_s3_key
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        """

        await db_manager.execute_query(
            query,
            job_id,
            tenant_id,
            MediaAnalysisStatus.PENDING.value,
            media_type,
            content_type,
            filename,
            len(media_bytes),
            json.dumps(metadata),
            artifact_s3_key,
        )

        job = await self.get_job(job_id, tenant_id)
        if not job:
            raise ValueError("Failed to create media analysis job")
        return job

    async def list_jobs(self, tenant_id: str, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        query = """
            SELECT *
            FROM media_analysis_jobs
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        """
        jobs = await db_manager.fetch_all(query, tenant_id, limit, offset)

        count_query = "SELECT COUNT(*) AS count FROM media_analysis_jobs WHERE tenant_id = $1"
        count_result = await db_manager.fetch_one(count_query, tenant_id)

        return {
            "jobs": [self._serialize_job(job) for job in jobs],
            "total": count_result["count"] if count_result else len(jobs),
            "limit": limit,
            "offset": offset,
        }

    async def get_job(self, job_id: str, tenant_id: str, role: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM media_analysis_jobs WHERE job_id = $1"
        job = await db_manager.fetch_one(query, job_id)
        if not job:
            return None

        if role != "Master_Admin" and str(job["tenant_id"]) != str(tenant_id):
            return None

        return self._serialize_job(job)

    async def get_artifact_url(self, job_id: str, tenant_id: str, role: Optional[str] = None) -> str:
        job = await self.get_job(job_id, tenant_id, role)
        if not job:
            raise FileNotFoundError("Media analysis job not found")

        artifact_key = job.get("artifact_s3_key")
        if not artifact_key:
            raise FileNotFoundError("Analysis artifact not found")

        return await storage_manager.generate_signed_url(artifact_key)

    async def process_job(self, job_id: str, media_bytes: Optional[bytes] = None):
        job_row = await db_manager.fetch_one("SELECT * FROM media_analysis_jobs WHERE job_id = $1", job_id)
        if not job_row:
            logger.error("Media analysis job disappeared before processing", extra={"job_id": job_id})
            return

        tenant_id = str(job_row["tenant_id"])

        try:
            await self._update_status(job_id, MediaAnalysisStatus.ANALYZING.value)
            metadata = job_row.get("metadata") or {}
            frames_b64 = self._extract_frames(
                media_type=job_row["media_type"],
                source_filename=job_row["source_filename"],
                media_bytes=media_bytes,
            )

            if not frames_b64:
                raise ValueError("No analyzable frames were extracted from the uploaded media")

            vision_engine, genai_engine = get_ai_pipeline()
            is_spoofed, vision_context = await vision_engine.extract_context(frames_b64, metadata)

            if is_spoofed:
                ai_score = 0.0
                tier_2_score = 0
                ai_explanation = vision_context if isinstance(vision_context, dict) else {"summary": str(vision_context)}
                reasoning = ai_explanation.get("message") or ai_explanation.get("summary") or "Spoof indicators detected"
                analysis_outcome = "spoof_detected"
                final_trust_score = 0
            else:
                tier_2_score = 100 if isinstance(vision_context, dict) and vision_context.get("status") == "success" else 0
                ai_score, ai_explanation = await genai_engine.evaluate_trust(
                    frames_b64,
                    vision_context,
                    metadata,
                    {"has_data": False},
                )
                if ai_score < 0:
                    raise ValueError(ai_explanation.get("error") or "AI evaluation failed")

                final_trust_score = int(round(ai_score))
                reasoning = ai_explanation.get("summary") or "Analysis completed"
                analysis_outcome = "authentic" if evaluate_trust_status(final_trust_score) else "suspicious"

            await db_manager.execute_query(
                """
                UPDATE media_analysis_jobs
                SET
                    status = $1,
                    analysis_outcome = $2,
                    tier_2_score = $3,
                    final_trust_score = $4,
                    ai_score = $5,
                    reasoning = $6,
                    ai_explanation = $7::jsonb,
                    vision_context = $8::jsonb,
                    error_message = NULL,
                    completed_at = NOW()
                WHERE job_id = $9
                """,
                MediaAnalysisStatus.COMPLETED.value,
                analysis_outcome,
                tier_2_score,
                final_trust_score,
                ai_score,
                reasoning,
                json.dumps(ai_explanation),
                json.dumps(vision_context),
                job_id,
            )

            await quota_manager.decrement_quota(tenant_id)
            logger.info("Media analysis job completed", extra={"job_id": job_id, "tenant_id": tenant_id})
        except Exception as exc:
            logger.error("Media analysis job failed", exc_info=True, extra={"job_id": job_id, "tenant_id": tenant_id})
            await db_manager.execute_query(
                """
                UPDATE media_analysis_jobs
                SET
                    status = $1,
                    analysis_outcome = $2,
                    error_message = $3,
                    completed_at = NOW()
                WHERE job_id = $4
                """,
                MediaAnalysisStatus.FAILED.value,
                "error",
                str(exc)[:500],
                job_id,
            )

    async def _update_status(self, job_id: str, status: str):
        await db_manager.execute_query(
            "UPDATE media_analysis_jobs SET status = $1 WHERE job_id = $2",
            status,
            job_id,
        )

    def _extract_frames(self, media_type: str, source_filename: str, media_bytes: Optional[bytes]) -> list[str]:
        if not media_bytes:
            raise ValueError("Uploaded media payload was not available for analysis")

        if media_type == "image":
            return self._extract_image_frames(media_bytes)

        suffix = os.path.splitext(source_filename or "")[-1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
            tmp_file.write(media_bytes)
            tmp_file.flush()
            tmp_path = tmp_file.name

        try:
            return extract_sparse_keyframes(tmp_path, num_frames=5)
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                logger.warning("Failed to remove temporary analysis file", extra={"path": tmp_path})

    def _extract_image_frames(self, media_bytes: bytes) -> list[str]:
        image_array = np.frombuffer(media_bytes, dtype=np.uint8)
        frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Failed to decode image payload")

        height, width = frame.shape[:2]
        max_dim = 512
        if max(height, width) > max_dim:
            scale = max_dim / float(max(height, width))
            frame = cv2.resize(
                frame,
                (int(width * scale), int(height * scale)),
                interpolation=cv2.INTER_AREA,
            )

        success, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not success:
            raise ValueError("Failed to encode image for analysis")

        encoded = buffer.tobytes()
        base64_frame = base64.b64encode(encoded).decode('utf-8')
        return [base64_frame]

    def _serialize_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        metadata = job.get("metadata") or {}
        ai_explanation = job.get("ai_explanation") or None
        vision_context = job.get("vision_context") or None

        return {
            "job_id": str(job["job_id"]),
            "tenant_id": str(job["tenant_id"]),
            "status": job.get("status"),
            "analysis_outcome": job.get("analysis_outcome"),
            "media_type": job.get("media_type"),
            "content_type": job.get("content_type"),
            "source_filename": job.get("source_filename"),
            "file_size_bytes": job.get("file_size_bytes"),
            "metadata": metadata,
            "artifact_s3_key": job.get("artifact_s3_key"),
            "tier_2_score": job.get("tier_2_score"),
            "final_trust_score": job.get("final_trust_score"),
            "ai_score": job.get("ai_score"),
            "reasoning": job.get("reasoning"),
            "ai_explanation": ai_explanation,
            "vision_context": vision_context,
            "error_message": job.get("error_message"),
            "created_at": job.get("created_at"),
            "completed_at": job.get("completed_at"),
        }


media_analysis_manager = MediaAnalysisManager()


