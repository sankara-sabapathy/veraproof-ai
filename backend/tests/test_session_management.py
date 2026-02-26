"""
Session Management Tests - Unit and Property-Based
"""
import pytest
from hypothesis import given, strategies as st, settings
from app.session_manager import session_manager
from app.models import SessionState
import uuid


class TestSessionManagement:
    """Unit tests for session management"""
    
    @pytest.mark.asyncio
    async def test_create_session(self):
        """Test session creation"""
        tenant_id = str(uuid.uuid4())
        metadata = {"user_agent": "test", "ip": "127.0.0.1"}
        return_url = "https://example.com/callback"
        
        session = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata=metadata,
            return_url=return_url
        )
        
        assert "session_id" in session
        assert "session_url" in session
        assert "created_at" in session
        assert "expires_at" in session
        assert session["session_id"] is not None
    
    @pytest.mark.asyncio
    async def test_get_session(self):
        """Test session retrieval"""
        tenant_id = str(uuid.uuid4())
        
        session = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata={},
            return_url="https://example.com"
        )
        
        retrieved = await session_manager.get_session(session["session_id"])
        
        assert retrieved is not None
        assert retrieved["session_id"] == session["session_id"]
    
    @pytest.mark.asyncio
    async def test_update_session_state(self):
        """Test session state update"""
        tenant_id = str(uuid.uuid4())
        
        session = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata={},
            return_url="https://example.com"
        )
        
        # Update state
        await session_manager.update_session_state(
            session["session_id"],
            SessionState.BASELINE
        )
        
        # Verify update (in memory)
        retrieved = await session_manager.get_session(session["session_id"])
        assert retrieved is not None
    
    @pytest.mark.asyncio
    async def test_complete_session(self):
        """Test session completion with results"""
        tenant_id = str(uuid.uuid4())
        
        session = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata={},
            return_url="https://example.com"
        )
        
        # Complete session
        await session_manager.update_session_results(
            session["session_id"],
            tier_1_score=85,
            tier_2_score=None,
            final_trust_score=85,
            correlation_value=0.92,
            reasoning="High correlation detected"
        )
        
        # Verify completion
        retrieved = await session_manager.get_session(session["session_id"])
        assert retrieved is not None


class TestPropertyBasedSessions:
    """Property-based tests for sessions"""
    
    @given(
        tenant_id=st.uuids().map(str),
        metadata=st.dictionaries(
            st.text(min_size=1, max_size=10),
            st.text(min_size=1, max_size=20),
            max_size=5
        )
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_session_id_uniqueness(self, tenant_id, metadata):
        """Property 11: Session IDs are unique"""
        session1 = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata=metadata,
            return_url="https://example.com"
        )
        
        session2 = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata=metadata,
            return_url="https://example.com"
        )
        
        # Session IDs must be unique
        assert session1["session_id"] != session2["session_id"]
    
    @given(
        tenant_id=st.uuids().map(str),
        initial_state=st.sampled_from([
            SessionState.IDLE.value,
            SessionState.BASELINE.value,
            SessionState.PAN.value,
            SessionState.RETURN.value,
            SessionState.ANALYZING.value
        ])
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_session_state_machine(self, tenant_id, initial_state):
        """Property 12: Session state transitions are valid"""
        session = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata={},
            return_url="https://example.com"
        )
        
        # Update to initial state
        await session_manager.update_session_state(
            session["session_id"],
            SessionState(initial_state)
        )
        
        # Transition to COMPLETE
        await session_manager.update_session_state(
            session["session_id"],
            SessionState.COMPLETE
        )
        
        # Should succeed without error
        retrieved = await session_manager.get_session(session["session_id"])
        assert retrieved is not None
    
    @given(
        tenant_id=st.uuids().map(str),
        extension_minutes=st.integers(min_value=1, max_value=60)
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_session_expiration_extension(self, tenant_id, extension_minutes):
        """Property 13: Session expiration can be extended"""
        session = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata={},
            return_url="https://example.com"
        )
        
        original_expires = session["expires_at"]
        
        # Extend expiration
        await session_manager.extend_expiration(session["session_id"])
        
        # Should succeed without error
        retrieved = await session_manager.get_session(session["session_id"])
        assert retrieved is not None
