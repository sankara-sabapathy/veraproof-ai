import io
import json
from zipfile import ZipFile

import pytest

from app import reporting


@pytest.mark.asyncio
async def test_generate_report_persists_pdf(monkeypatch):
    manager = reporting.VerificationEvidenceManager()
    session = {
        "session_id": "session-123",
        "tenant_id": "tenant-123",
        "verification_status": "success",
        "final_trust_score": 91,
        "tier_1_score": 93,
        "tier_2_score": 88,
        "ai_score": 0.9,
        "physics_score": 0.84,
        "correlation_value": 0.82,
        "reasoning": "Synthetic smoke test verification completed successfully.",
        "metadata": {"verification_profile": "static_human"},
        "ai_explanation": {"summary": "Synthetic smoke test payload for report generation."},
    }
    artifacts = [
        {
            "artifact_type": "original_video",
            "file_name": "video.webm",
            "content_type": "video/webm",
            "storage_key": "tenant-123/sessions/session-123/video.webm",
            "sha256": "video-sha",
        },
        {
            "artifact_type": "imu_telemetry",
            "file_name": "imu_data.json",
            "content_type": "application/json",
            "storage_key": "tenant-123/sessions/session-123/imu_data.json",
            "sha256": "imu-sha",
        },
        {
            "artifact_type": "rekognition_raw",
            "file_name": "rekognition_raw.json",
            "content_type": "application/json",
            "storage_key": "tenant-123/sessions/session-123/rekognition_raw.json",
            "sha256": "rekognition-sha",
        },
    ]
    stored_payloads = {}
    upsert_calls = []

    async def fake_list_artifacts(session_id, tenant_id=None):
        assert session_id == "session-123"
        return artifacts

    async def fake_load_json_artifact(storage_key):
        if storage_key.endswith("imu_data.json"):
            return [{"timestamp": 1.0, "acceleration": {"x": 0.1, "y": 0.2, "z": 0.3}}]
        if storage_key.endswith("rekognition_raw.json"):
            return {"provider": "aws_rekognition", "frames": [{"frame_index": 0}]}
        raise AssertionError(f"Unexpected storage key: {storage_key}")

    async def fake_store_session_artifact(tenant_id, session_id, filename, artifact_data, content_type):
        stored_payloads[filename] = {
            "tenant_id": tenant_id,
            "session_id": session_id,
            "content_type": content_type,
            "artifact_data": artifact_data,
        }
        return f"{tenant_id}/sessions/{session_id}/{filename}"

    async def fake_upsert_artifact(**kwargs):
        upsert_calls.append(kwargs)
        return {"artifact_id": "artifact-123", **kwargs}

    monkeypatch.setattr(reporting.artifact_manager, "list_artifacts", fake_list_artifacts)
    monkeypatch.setattr(reporting.storage_manager, "load_json_artifact", fake_load_json_artifact)
    monkeypatch.setattr(reporting.storage_manager, "store_session_artifact", fake_store_session_artifact)
    monkeypatch.setattr(reporting.artifact_manager, "upsert_artifact", fake_upsert_artifact)

    artifact = await manager.generate_report(session)

    assert artifact["artifact_type"] == "verification_report_pdf"
    assert artifact["content_type"] == "application/pdf"
    assert upsert_calls[0]["metadata"]["source_artifact_types"] == [
        "imu_telemetry",
        "original_video",
        "rekognition_raw",
    ]
    pdf_payload = stored_payloads["verification_report.pdf"]
    assert pdf_payload["artifact_data"].startswith(b"%PDF-1.4")
    assert b"%%EOF" in pdf_payload["artifact_data"]


@pytest.mark.asyncio
async def test_generate_bundle_packages_expected_artifacts(monkeypatch):
    manager = reporting.VerificationEvidenceManager()
    session = {
        "session_id": "session-456",
        "tenant_id": "tenant-456",
    }
    artifacts = [
        {
            "artifact_type": "original_video",
            "file_name": "video.webm",
            "content_type": "video/webm",
            "storage_key": "video-key",
            "sha256": "video-sha",
        },
        {
            "artifact_type": "imu_telemetry",
            "file_name": "imu_data.json",
            "content_type": "application/json",
            "storage_key": "imu-key",
            "sha256": "imu-sha",
        },
        {
            "artifact_type": "rekognition_raw",
            "file_name": "rekognition_raw.json",
            "content_type": "application/json",
            "storage_key": "rekognition-key",
            "sha256": "rekognition-sha",
        },
    ]
    bytes_by_key = {
        "report-key": b"%PDF-1.4\nreport\n%%EOF",
        "video-key": b"fake-video",
        "imu-key": b'{"imu": true}',
        "rekognition-key": b'{"rekognition": true}',
    }
    stored_payloads = {}
    upsert_calls = []

    async def fake_generate_report(_session):
        return {
            "artifact_type": "verification_report_pdf",
            "file_name": "verification_report.pdf",
            "content_type": "application/pdf",
            "storage_key": "report-key",
            "sha256": "report-sha",
        }

    async def fake_list_artifacts(session_id, tenant_id=None):
        assert session_id == "session-456"
        return artifacts

    async def fake_load_artifact_bytes(storage_key):
        return bytes_by_key[storage_key]

    async def fake_store_session_artifact(tenant_id, session_id, filename, artifact_data, content_type):
        stored_payloads[filename] = {
            "tenant_id": tenant_id,
            "session_id": session_id,
            "content_type": content_type,
            "artifact_data": artifact_data,
        }
        return f"{tenant_id}/sessions/{session_id}/{filename}"

    async def fake_upsert_artifact(**kwargs):
        upsert_calls.append(kwargs)
        return {"artifact_id": "artifact-456", **kwargs}

    monkeypatch.setattr(manager, "generate_report", fake_generate_report)
    monkeypatch.setattr(reporting.artifact_manager, "list_artifacts", fake_list_artifacts)
    monkeypatch.setattr(reporting.storage_manager, "load_artifact_bytes", fake_load_artifact_bytes)
    monkeypatch.setattr(reporting.storage_manager, "store_session_artifact", fake_store_session_artifact)
    monkeypatch.setattr(reporting.artifact_manager, "upsert_artifact", fake_upsert_artifact)

    artifact = await manager.generate_bundle(session)

    assert artifact["artifact_type"] == "artifact_bundle_zip"
    assert artifact["content_type"] == "application/zip"
    assert upsert_calls[0]["metadata"]["included_artifact_types"] == [
        "verification_report_pdf",
        "original_video",
        "imu_telemetry",
        "rekognition_raw",
    ]

    bundle_payload = stored_payloads["verification_artifacts_bundle.zip"]["artifact_data"]
    with ZipFile(io.BytesIO(bundle_payload), "r") as bundle:
        names = sorted(bundle.namelist())
        assert names == [
            "imu_data.json",
            "manifest.json",
            "rekognition_raw.json",
            "verification_report.pdf",
            "video.webm",
        ]
        manifest = json.loads(bundle.read("manifest.json").decode("utf-8"))
        assert manifest["session_id"] == "session-456"
        assert [entry["artifact_type"] for entry in manifest["artifacts"]] == [
            "verification_report_pdf",
            "original_video",
            "imu_telemetry",
            "rekognition_raw",
        ]

