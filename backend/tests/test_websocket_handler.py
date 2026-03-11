import asyncio

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

