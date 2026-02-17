from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class SessionState(str, Enum):
    IDLE = "idle"
    BASELINE = "baseline"
    PAN = "pan"
    RETURN = "return"
    ANALYZING = "analyzing"
    COMPLETE = "complete"


class VerificationStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


class IMUData(BaseModel):
    timestamp: float
    acceleration: Dict[str, float]
    rotation_rate: Dict[str, float]


class CreateSessionRequest(BaseModel):
    return_url: str
    metadata: Optional[Dict[str, Any]] = {}


class CreateSessionResponse(BaseModel):
    session_id: str
    session_url: str
    expires_at: datetime


class VerificationResult(BaseModel):
    session_id: str
    status: str
    tier_1_score: int
    tier_2_score: Optional[int] = None
    final_trust_score: int
    correlation_value: float
    reasoning: str
    timestamp: datetime


class WebhookPayload(BaseModel):
    session_id: str
    tier_1_score: int
    tier_2_score: Optional[int]
    final_trust_score: int
    verification_status: str
    timestamp: datetime
    metadata: Dict[str, Any]


class BrandingConfig(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#1E40AF"
    secondary_color: str = "#3B82F6"
    button_color: str = "#10B981"


class UsageStats(BaseModel):
    tenant_id: str
    subscription_tier: str
    monthly_quota: int
    current_usage: int
    remaining_quota: int
    billing_cycle_start: Optional[datetime]
    billing_cycle_end: Optional[datetime]
    usage_percentage: float


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
