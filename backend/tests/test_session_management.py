"""
Session Management Tests - Unit and Property-Based
"""
import pytest
from hypothesis import given, strategies as st, settings
from app.session_manager import session_manager
from datetime import datetime, timedelta
import uuid


class TestSessionManagement:
    """Unit tests for session management"""
    
    @pytest.mark.asyncio
    async def test_create_session(self):
        """Test session creation"""
        tenant_id = str(uuid.uuid4())
        metadata = {"user_id": "test-123"}
        return_url = "https://example.com/callback"
        
        session = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata=metadata,
            return_url=return_url
        )
        
        assert session["session_id"] is not None
        assert session["tenant_id"] == tenant_id
        assert session["state"] == "pending"
        assert session["metadata"] == metadata
        assert session["return_url"] == return_url
        assert "expires_at" in session
    
    @pytest.mark.asyncio
    async def test_get_session(self):
        """Test retrieving session"""
        tenant_id = str(uuid.uuid4())
        session = await session_manager.create_session(tenant_id=tenant_id)
        
        retrieved = await session_manager.get_session(session["session_id"])
        
        assert retrieved["session_id"] == session["session_id"]
        assert retrieved["tenant_id"] == tenant_id
    
    @pytest.mark.asyncio
    async def test_update_session_state(self):
        """Test updating session state"""
        tenant_id = str(uuid.uuid4())
        session = await session_manager.create_session(tenant_id=tenant_id)
        
        await session_manager.update_session_state(
            session["session_id"],
            "in_progress"
        )
        
        updated = await session_manager.get_session(session["session_id"])
        assert updated["state"] == "in_progress"
    
    @pytest.mark.asyncio
    async def test_complete_session(self):
        """Test completing session with results"""
        tenant_id = str(uuid.uuid4())
        session = await session_manager.create_session(tenant_id=tenant_id)
        
        await session_manager.complete_session(
            session_id=session["session_id"],
            tier_1_score=92,
            tier_2_score=None,
            final_trust_score=92,
            correlation_value=0.92,
            reasoning="Strong correlation"
        )
        
        completed = await session_manager.get_session(session["session_id"])
        assert completed["state"] == "completed"
        assert completed["tier_1_score"] == 92
        assert completed["final_trust_score"] == 92
        assert completed["correlation_value"] == 0.92


class TestPropertyBasedSessions:
    """Property-based tests for sessions"""
    
    @given(
        tenant_id=st.uuids().map(str),
        metadata=st.dictionaries(
            keys=st.text(min_size=1, max_size=20),
            values=st.text(min_size=1, max_size=100),
            max_size=5
        )
    )
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_session_id_uniqueness(self, tenant_id, metadata):
        """Property 14: Session IDs are unique"""
        session1 = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata=metadata
        )
        session2 = await session_manager.create_session(
            tenant_id=tenant_id,
            metadata=metadata
        )
        
        # Different sessions must have different IDs
        assert session1["session_id"] != session2["session_id"]
    
    @given(
        tenant_id=st.uuids().map(str),
        initial_state=st.sampled_from(["pending", "in_progress", "processing"])
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_session_state_machine(self, tenant_id, initial_state):
        """Property 15: Session state transitions are valid"""
        session = await session_manager.create_session(tenant_id=tenant_id)
        
        # Valid state transitions
        valid_transitions = {
            "pending": ["in_progress", "expired", "failed"],
            "in_progress": ["processing", "failed", "expired"],
            "processing": ["completed", "failed"],
            "completed": [],
            "failed": [],
            "expired": []
        }
        
        # Set initial state
        await session_manager.update_session_state(
            session["session_id"],
            initial_state
        )
        
        # Try valid transition
        if valid_transitions[initial_state]:
            next_state = valid_transitions[initial_state][0]
            await session_manager.update_session_state(
                session["session_id"],
                next_state
            )
            
            updated = await session_manager.get_session(session["session_id"])
            assert updated["state"] == next_state
    
    @given(
        tenant_id=st.uuids().map(str),
        extension_minutes=st.integers(min_value=1, max_value=60)
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_session_expiration_extension(self, tenant_id, extension_minutes):
        """Property 16: Session expiration can be extended"""
        session = await session_manager.create_session(tenant_id=tenant_id)
        
        original_expiry = datetime.fromisoformat(session["expires_at"])
        
        await session_manager.extend_session(
            session["session_id"],
            extension_minutes
        )
        
        extended = await session_manager.get_session(session["session_id"])
        new_expiry = datetime.fromisoformat(extended["expires_at"])
        
        # New expiry should be later than original
        assert new_expiry > original_expiry
        
        # Extension should be approximately correct (within 1 second tolerance)
        expected_extension = timedelta(minutes=extension_minutes)
        actual_extension = new_expiry - original_expiry
        assert abs((actual_extension - expected_extension).total_seconds()) < 1
