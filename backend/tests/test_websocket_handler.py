import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.websocket_handler import VerificationWebSocket


@pytest.mark.asyncio
async def test_wait_for_recording_finalization_returns_after_signal():
    handler = VerificationWebSocket()
    session_id = "session-123"
    handler.session_data[session_id] = {
        "video_chunks": [{"data": b"one"}],
        "recording_finalized": False,
        "recording_finalized_at": None,
    }

    async def finalize():
        await asyncio.sleep(0.01)
        await handler.handle_message(session_id, {"type": "recording_complete"})

    waiter = asyncio.create_task(handler._wait_for_recording_finalization(session_id, timeout_seconds=0.5))
    signaler = asyncio.create_task(finalize())

    await signaler
    await waiter

    assert handler.session_data[session_id]["recording_finalized"] is True
    assert handler.session_data[session_id]["recording_finalized_at"] is not None


@pytest.mark.asyncio
async def test_wait_for_recording_finalization_times_out_without_signal():
    handler = VerificationWebSocket()
    session_id = "session-timeout"
    handler.session_data[session_id] = {
        "video_chunks": [{"data": b"one"}],
        "recording_finalized": False,
        "recording_finalized_at": None,
    }

    await handler._wait_for_recording_finalization(session_id, timeout_seconds=0.01)

    assert handler.session_data[session_id]["recording_finalized"] is False


@pytest.mark.asyncio
async def test_recording_complete_waits_for_declared_chunks_before_finalizing():
    handler = VerificationWebSocket()
    session_id = "session-finalize"
    handler.session_data[session_id] = {
        "video_chunks": [],
        "recording_finalized": False,
        "recording_finalized_at": None,
    }
    handler.send_message = AsyncMock()

    await handler.handle_message(session_id, {"type": "video_chunk", "payload": {"sequence": 1, "size": 3}})
    await handler.handle_video_chunk(session_id, b"one")
    await handler.handle_message(
        session_id,
        {
            "type": "recording_complete",
            "payload": {"chunk_count": 2, "byte_count": 6, "last_sequence": 2},
        },
    )

    assert handler.session_data[session_id]["recording_finalized"] is False

    await handler.handle_message(session_id, {"type": "video_chunk", "payload": {"sequence": 2, "size": 3}})
    await handler.handle_video_chunk(session_id, b"two")

    assert handler.session_data[session_id]["recording_finalized"] is True
    assert handler._build_video_payload(handler.session_data[session_id]) == b"onetwo"
    assert handler.send_message.await_args_list[-1].args == (
        session_id,
        {
            "type": "recording_finalized",
            "payload": {"chunk_count": 2, "byte_count": 6, "last_sequence": 2},
        },
    )


@pytest.mark.asyncio
async def test_recording_complete_can_finalize_empty_capture():
    handler = VerificationWebSocket()
    session_id = "session-empty-finalize"
    handler.session_data[session_id] = {
        "video_chunks": [],
        "recording_finalized": False,
        "recording_finalized_at": None,
    }
    handler.send_message = AsyncMock()

    await handler.handle_message(
        session_id,
        {
            "type": "recording_complete",
            "payload": {"chunk_count": 0, "byte_count": 0, "last_sequence": 0},
        },
    )

    assert handler.session_data[session_id]["recording_finalized"] is True
    assert handler.send_message.await_args.args == (
        session_id,
        {
            "type": "recording_finalized",
            "payload": {"chunk_count": 0, "byte_count": 0, "last_sequence": 0},
        },
    )


@pytest.mark.asyncio
async def test_video_chunk_metadata_queue_preserves_pending_descriptors():
    handler = VerificationWebSocket()
    session_id = "session-metadata-queue"
    handler.session_data[session_id] = {
        "video_chunks": [],
        "recording_finalized": False,
        "recording_finalized_at": None,
    }

    await handler.handle_message(session_id, {"type": "video_chunk", "payload": {"sequence": 1, "size": 3}})
    await handler.handle_message(session_id, {"type": "video_chunk", "payload": {"sequence": 2, "size": 3}})
    await handler.handle_video_chunk(session_id, b"one")
    await handler.handle_video_chunk(session_id, b"two")

    assert [chunk["sequence"] for chunk in handler.session_data[session_id]["video_chunks"]] == [1, 2]
    assert handler._build_video_payload(handler.session_data[session_id]) == b"onetwo"


def test_build_video_payload_orders_chunks_by_sequence():
    handler = VerificationWebSocket()
    session_data = {
        "video_chunks": [
            {"data": b"two", "sequence": 2, "timestamp": 2.0},
            {"data": b"one", "sequence": 1, "timestamp": 1.0},
        ]
    }

    assert handler._build_video_payload(session_data) == b"onetwo"


@pytest.mark.asyncio
async def test_run_ai_verification_background_skips_genai_when_no_frames(monkeypatch):
    handler = VerificationWebSocket()
    session_id = "session-123"
    session_data = {
        "video_chunks": [{"data": b"fake-webm-data", "timestamp": 0.0}],
        "gyro_gamma": [0.0, 5.0, 10.0, 15.0, 20.0],
        "imu_data": [],
    }
    session_db = {
        "session_id": session_id,
        "tenant_id": "tenant-123",
        "tenant_environment_id": None,
        "environment": None,
        "metadata": {},
        "physics_score": 80.0,
        "correlation_value": 0.8,
    }

    vision_engine = MagicMock()
    vision_engine.extract_context = AsyncMock(return_value=(False, {"status": "success"}))
    genai_engine = MagicMock()
    genai_engine.evaluate_trust = AsyncMock(return_value=(12.0, {"summary": "should not run"}))

    update_results = AsyncMock()
    decrement_quota = AsyncMock()

    async def no_sleep(*_args, **_kwargs):
        return None

    monkeypatch.setattr("app.video_utils.extract_sparse_keyframes", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("app.ai_provider.get_ai_pipeline", lambda: (vision_engine, genai_engine))
    monkeypatch.setattr("app.websocket_handler.asyncio.sleep", no_sleep)
    monkeypatch.setattr("app.websocket_handler.session_manager.get_session", AsyncMock(return_value=session_db))
    monkeypatch.setattr("app.websocket_handler.session_manager.update_session_results", update_results)
    monkeypatch.setattr("app.database.db_manager.set_request_context", MagicMock())
    monkeypatch.setattr("app.database.db_manager.fetch_all", AsyncMock(return_value=[]))
    monkeypatch.setattr("app.quota.quota_manager.decrement_quota", decrement_quota)
    monkeypatch.setattr(handler, "_wait_for_recording_finalization", AsyncMock())
    monkeypatch.setattr(handler, "_store_json_session_artifact", AsyncMock())

    await handler.run_ai_verification_background(session_id, session_data)

    vision_engine.extract_context.assert_not_awaited()
    genai_engine.evaluate_trust.assert_not_awaited()
    decrement_quota.assert_awaited_once_with("tenant-123")

    kwargs = update_results.await_args.kwargs
    assert kwargs["session_id"] == session_id
    assert kwargs["tier_2_score"] == 0
    assert kwargs["ai_score"] == -1.0
    assert kwargs["final_trust_score"] == 80
    assert kwargs["unified_score"] == 80.0
    assert kwargs["verification_status"] == "success"
    assert "skipped because the recorded video could not be decoded" in kwargs["ai_explanation"]["summary"]
