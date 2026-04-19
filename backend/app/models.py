from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SessionState(str, Enum):
    IDLE = 'idle'
    BASELINE = 'baseline'
    PAN = 'pan'
    RETURN = 'return'
    ANALYZING = 'analyzing'
    COMPLETE = 'complete'


class VerificationStatus(str, Enum):
    PENDING_AI = 'pending_ai'
    SUCCESS = 'success'
    FAILED = 'failed'
    TIMEOUT = 'timeout'
    CANCELLED = 'cancelled'


class MediaAnalysisStatus(str, Enum):
    PENDING = 'pending'
    ANALYZING = 'analyzing'
    COMPLETED = 'completed'
    FAILED = 'failed'


class IMUData(BaseModel):
    timestamp: float
    acceleration: Dict[str, float]
    rotation_rate: Dict[str, float]


class VerificationCommand(BaseModel):
    text: str
    lens: str = 'user'
    duration: int


class CreateSessionRequest(BaseModel):
    return_url: str
    session_duration: Optional[int] = Field(default=15)
    verification_commands: Optional[list[VerificationCommand]] = []
    metadata: Optional[Dict[str, Any]] = {}


class CreateSessionResponse(BaseModel):
    session_id: str
    session_url: str
    expires_at: datetime
    ws_token: Optional[str] = None


class SessionArtifactRecord(BaseModel):
    artifact_id: str
    session_id: str
    tenant_id: str
    artifact_type: str
    provider: Optional[str] = None
    file_name: str
    content_type: str
    storage_key: str
    size_bytes: Optional[int] = None
    sha256: Optional[str] = None
    metadata: Dict[str, Any] = {}
    encryption_mode: Optional[str] = None
    encryption_key_id: Optional[str] = None
    created_at: datetime


class VerificationResult(BaseModel):
    session_id: str
    status: str
    tier_1_score: int
    tier_2_score: Optional[int] = None
    final_trust_score: int
    correlation_value: float
    reasoning: str
    ai_score: Optional[float] = None
    physics_score: Optional[float] = None
    unified_score: Optional[float] = None
    ai_explanation: Optional[Dict[str, Any]] = None
    timestamp: datetime


class MediaAnalysisJob(BaseModel):
    job_id: str
    tenant_id: str
    status: str
    analysis_outcome: Optional[str] = None
    media_type: str
    content_type: str
    source_filename: str
    file_size_bytes: int
    metadata: Dict[str, Any] = {}
    artifact_s3_key: Optional[str] = None
    tier_2_score: Optional[int] = None
    final_trust_score: Optional[int] = None
    ai_score: Optional[float] = None
    reasoning: Optional[str] = None
    ai_explanation: Optional[Dict[str, Any]] = None
    vision_context: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class WebhookPayload(BaseModel):
    session_id: str
    tier_1_score: int
    tier_2_score: Optional[int]
    final_trust_score: int
    correlation_value: Optional[float] = None
    ai_score: Optional[float] = None
    physics_score: Optional[float] = None
    unified_score: Optional[float] = None
    ai_explanation: Optional[Dict[str, Any]] = None
    verification_status: str
    timestamp: datetime
    metadata: Dict[str, Any]


class BrandingConfig(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = '#1E40AF'
    secondary_color: str = '#3B82F6'
    button_color: str = '#10B981'


class TenantEnvironmentSummary(BaseModel):
    environment_id: str
    slug: str
    display_name: str
    is_default: bool = False
    is_billable: bool = False
    monthly_quota: int = 0
    current_usage: int = 0
    billing_cycle_start: Optional[datetime] = None
    billing_cycle_end: Optional[datetime] = None


class UsageStats(BaseModel):
    tenant_id: str
    subscription_tier: str
    monthly_quota: int
    current_usage: int
    remaining_quota: int
    billing_cycle_start: Optional[datetime]
    billing_cycle_end: Optional[datetime]
    usage_percentage: float
    environment: Optional[TenantEnvironmentSummary] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str


class ColorConfig(BaseModel):
    primary_color: str
    secondary_color: str
    button_color: str


class AuthenticatedUser(BaseModel):
    user_id: str
    tenant_id: str
    email: str
    role: str
    roles: List[str] = []
    permissions: List[str] = []


class AuthSessionResponse(BaseModel):
    authenticated: bool
    user: Optional[AuthenticatedUser] = None
    csrf_token: Optional[str] = None
    auth_type: Optional[str] = None
    active_environment: Optional[TenantEnvironmentSummary] = None
    available_environments: List[TenantEnvironmentSummary] = []
