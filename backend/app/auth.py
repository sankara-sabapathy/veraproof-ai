from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from jose import JWTError, jwt
import hashlib
from opentelemetry import trace
from app.config import settings
import uuid
import logging

logger = logging.getLogger(__name__)


class LocalAuthManager:
    """Local authentication manager for development"""
    
    def __init__(self):
        # Keep in-memory cache for performance, but sync with database
        self.users: Dict[str, Dict] = {}
        self.api_keys: Dict[str, Dict] = {}
    
    def hash_password(self, password: str) -> str:
        """Hash a password using SHA256 (simple for dev)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against hash"""
        return self.hash_password(plain_password) == hashed_password
    
    async def signup(self, email: str, password: str, tenant_id: Optional[str] = None) -> Dict:
        """Create a new user account"""
        from app.database import db_manager
        
        # Check in-memory cache first
        if email in self.users:
            raise ValueError("User already exists")
        
        # Check if user already exists in database
        check_query = "SELECT user_id FROM users WHERE email = $1"
        existing_user = await db_manager.fetch_one(check_query, email)
        
        if existing_user:
            raise ValueError("User already exists")
        
        user_id = str(uuid.uuid4())
        if not tenant_id:
            tenant_id = str(uuid.uuid4())
        
        password_hash = self.hash_password(password)
        
        # Create tenant record in database first
        try:
            tenant_query = """
                INSERT INTO tenants (
                    tenant_id, email, subscription_tier, 
                    monthly_quota, current_usage, billing_cycle_start, billing_cycle_end
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (tenant_id) DO NOTHING
            """
            await db_manager.execute_query(
                tenant_query,
                tenant_id,
                email,
                'Sandbox',
                100,  # Default quota
                0,
                datetime.utcnow().date(),
                (datetime.utcnow() + timedelta(days=30)).date()
            )
            logger.info("Tenant record created in database", extra={"tenant_id": tenant_id, "email": email})
            
            span = trace.get_current_span()
            if span and span.is_recording():
                span.set_attribute("tenant.id", tenant_id)
        except Exception as e:
            logger.error(f"Failed to create tenant record: {e}", extra={"tenant_id": tenant_id})
            raise ValueError(f"Failed to create tenant: {e}")
        
        role = "Master_Admin" if email.lower() == "superuser@veraproof.ai" else "Admin"
        
        # Create user record in database
        try:
            user_query = """
                INSERT INTO users (
                    user_id, tenant_id, email, password_hash, role, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """
            await db_manager.execute_query(
                user_query,
                user_id,
                tenant_id,
                email,
                password_hash,
                role,
                datetime.utcnow()
            )
            logger.info("User created in database", extra={"user_id": user_id, "tenant_id": tenant_id, "email": email})
            
            span = trace.get_current_span()
            if span and span.is_recording():
                span.set_attribute("user.id", user_id)
        except Exception as e:
            logger.error(f"Failed to create user record: {e}", extra={"email": email})
            raise ValueError(f"Failed to create user: {e}")
        
        # Cache in memory
        user = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "email": email,
            "password_hash": password_hash,
            "role": role,
            "created_at": datetime.utcnow().isoformat()
        }
        self.users[email] = user
        
        return {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "email": email,
            "role": role
        }
    
    async def login(self, email: str, password: str) -> Dict:
        """Authenticate user and return JWT tokens"""
        from app.database import db_manager
        
        # Try to get from cache first
        user = self.users.get(email)
        
        # If not in cache, fetch from database
        if not user:
            query = "SELECT user_id, tenant_id, email, password_hash, role FROM users WHERE email = $1"
            user_record = await db_manager.fetch_one(query, email)
            
            if user_record:
                user = {
                    "user_id": str(user_record['user_id']),
                    "tenant_id": str(user_record['tenant_id']),
                    "email": user_record['email'],
                    "password_hash": user_record['password_hash'],
                    "role": user_record['role']
                }
                # Cache it
                self.users[email] = user
                logger.info("User loaded from database", extra={"user_id": user["user_id"], "tenant_id": user["tenant_id"]})
        
        if not user or not self.verify_password(password, user["password_hash"]):
            logger.warning("Invalid credentials attempted", extra={"email": email})
            raise ValueError("Invalid credentials")
            
        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute("user.id", user["user_id"])
            span.set_attribute("tenant.id", user["tenant_id"])
        
        # Generate access token
        access_token = self.create_access_token({
            "user_id": user["user_id"],
            "tenant_id": user["tenant_id"],
            "email": user["email"],
            "role": user["role"]
        })
        
        # Generate refresh token
        refresh_token = self.create_refresh_token({
            "user_id": user["user_id"],
            "tenant_id": user["tenant_id"]
        })
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "user_id": user["user_id"],
                "tenant_id": user["tenant_id"],
                "email": user["email"],
                "role": user["role"]
            }
        }
    
    def create_access_token(self, data: dict) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
        to_encode.update({"exp": expire, "type": "access"})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm
        )
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expiration_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm
        )
        return encoded_jwt
    
    async def verify_jwt(self, token: str) -> Dict:
        """Verify JWT token and extract payload"""
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm]
            )
            return payload
        except JWTError as e:
            logger.error(f"JWT verification failed: {e}")
            raise ValueError("Invalid token")
    
    async def refresh_token(self, refresh_token: str) -> Dict:
        """Refresh access token using refresh token"""
        payload = await self.verify_jwt(refresh_token)
        
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        
        # Find user
        user = None
        for u in self.users.values():
            if u["user_id"] == payload["user_id"]:
                user = u
                break
        
        if not user:
            raise ValueError("User not found")
        
        # Generate new access token
        access_token = self.create_access_token({
            "user_id": user["user_id"],
            "tenant_id": user["tenant_id"],
            "email": user["email"],
            "role": user["role"]
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    async def logout(self, refresh_token: str):
        """Logout user (revoke refresh token)"""
        # In local auth, we just validate the token
        await self.verify_jwt(refresh_token)
        logger.info("User logged out")


class APIKeyManager:
    """API key manager interfacing directly with Postges via db_manager"""
    
    async def generate_key(self, tenant_id: str, environment: str) -> Dict:
        """Generate new API key. Store hashed secret in DB, return raw key once."""
        from app.database import db_manager
        
        # Enforce quota: Max 5 active keys
        quota_query = "SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1 AND revoked_at IS NULL"
        active_keys_count = await db_manager.fetch_val(quota_query, tenant_id)
        if active_keys_count and active_keys_count >= 5:
            raise ValueError("Maximum limit of 5 active API keys reached")

        key_id = str(uuid.uuid4())
        raw_token = f"vp_{environment}_{uuid.uuid4().hex}"
        
        # Securely hash the secret token before storing
        hashed_secret = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Create a masked label for display purposes
        display_label = f"vp_{environment}_...{raw_token[-4:]}"
        
        created_at = datetime.utcnow()
        
        insert_query = """
            INSERT INTO api_keys (key_id, tenant_id, api_key, api_secret, environment, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        await db_manager.execute_query(
            insert_query,
            key_id,
            tenant_id,
            display_label,
            hashed_secret,
            environment,
            created_at
        )
        
        logger.info("API key generated", extra={"tenant_id": tenant_id, "key_id": key_id, "environment": environment})
        
        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute("tenant.id", tenant_id)
            span.set_attribute("api_key.id", key_id)
        
        # Return the actual raw token ONLY once
        return {
            "key_id": key_id,
            "api_key": raw_token,
            "environment": environment
        }
    
    async def validate_key(self, raw_token: str) -> Tuple[str, str]:
        """Validate API key via hashed token against DB and return (tenant_id, environment)"""
        from app.database import db_manager
        
        hashed_secret = hashlib.sha256(raw_token.encode()).hexdigest()
        
        query = """
            SELECT tenant_id, environment 
            FROM api_keys 
            WHERE api_secret = $1 AND revoked_at IS NULL
        """
        
        key_data = await db_manager.fetch_one(query, hashed_secret)
        
        if not key_data:
            logger.warning("Invalid or revoked API key validation attempt")
            raise ValueError("Invalid or revoked API key")
            
        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute("tenant.id", str(key_data["tenant_id"]))
            span.set_attribute("api_key.environment", key_data["environment"])
        
        return str(key_data["tenant_id"]), key_data["environment"]
    
    async def revoke_key(self, key_id: str):
        """Revoke API key in DB"""
        from app.database import db_manager
        
        query = """
            UPDATE api_keys 
            SET revoked_at = $1 
            WHERE key_id = $2 AND revoked_at IS NULL
            RETURNING tenant_id
        """
        result = await db_manager.fetch_one(query, datetime.utcnow(), key_id)
        
        if result:
            logger.info("API key revoked", extra={"key_id": key_id, "tenant_id": str(result["tenant_id"])})
            span = trace.get_current_span()
            if span and span.is_recording():
                span.set_attribute("api_key.action", "revoke")
        else:
            logger.warning("Attempted to revoke non-existent or already revoked API key", extra={"key_id": key_id})
            raise ValueError("API key not found or already revoked")


# Global instances
local_auth_manager = LocalAuthManager()
api_key_manager = APIKeyManager()
