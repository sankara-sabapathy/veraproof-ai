import pytest

from app.artifact_manager import artifact_manager


@pytest.mark.asyncio
async def test_upsert_artifact_casts_nullable_encryption_mode(monkeypatch):
    captured = {}

    async def fake_fetch_one(query, *args, **kwargs):
        captured["query"] = query
        captured["args"] = args
        captured["kwargs"] = kwargs
        return {
            "artifact_id": "artifact-123",
            "session_id": "session-123",
            "tenant_id": "tenant-123",
            "artifact_type": "verification_report_pdf",
            "metadata": {},
        }

    monkeypatch.setattr("app.artifact_manager.db_manager.fetch_one", fake_fetch_one)

    artifact = await artifact_manager.upsert_artifact(
        session_id="session-123",
        tenant_id="tenant-123",
        artifact_type="verification_report_pdf",
        file_name="verification_report.pdf",
        content_type="application/pdf",
        storage_key="tenant-123/sessions/session-123/verification_report.pdf",
        size_bytes=1024,
        sha256="abc123",
        metadata={"generated_at": "2026-03-09T00:00:00Z"},
        encryption_mode=None,
        encryption_key_id=None,
    )

    assert artifact["artifact_id"] == "artifact-123"
    assert "CASE WHEN $12::varchar IS NULL THEN NULL ELSE NOW() END" in captured["query"]
    assert captured["args"][11] is None
    assert captured["args"][12] is None
    assert captured["kwargs"]["tenant_id"] == "tenant-123"


@pytest.mark.asyncio
async def test_normalize_artifact_stringifies_uuid_fields():
    import uuid
    from datetime import datetime, timezone

    artifact = artifact_manager._normalize_artifact(
        {
            "artifact_id": uuid.uuid4(),
            "session_id": uuid.uuid4(),
            "tenant_id": uuid.uuid4(),
            "artifact_type": "original_video",
            "metadata": "{}",
            "created_at": datetime.now(timezone.utc),
        }
    )

    assert isinstance(artifact["artifact_id"], str)
    assert isinstance(artifact["session_id"], str)
    assert isinstance(artifact["tenant_id"], str)
    assert artifact["metadata"] == {}
