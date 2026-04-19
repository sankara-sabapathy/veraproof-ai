from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import hashlib
import logging
import uuid

from jose import JWTError, jwt
from opentelemetry import trace

from app.config import settings
from app.database import db_manager
from app.tenant_environment import (
    DEFAULT_ENVIRONMENT,
    PRODUCTION_ENVIRONMENT,
    ensure_tenant_environments,
    get_tenant_environment,
)

logger = logging.getLogger(__name__)


class LocalAuthManager:
    """Local authentication manager for development"""

    def __init__(self):
        self.users: Dict[str, Dict] = {}
        self.api_keys: Dict[str, Dict] = {}

    def hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.hash_password(plain_password) == hashed_password

    async def _ensure_org_shape(self, tenant_id: str, user_id: str, email: str, role_slug: str = 'org_admin'):
        await db_manager.execute_query(
            """
            INSERT INTO organizations (org_id, tenant_id, display_name, contact_email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (org_id) DO NOTHING
            """,
            tenant_id,
            tenant_id,
            email.split('@')[0],
            email,
        )
        await db_manager.execute_query(
            """
            INSERT INTO org_memberships (membership_id, org_id, user_id, role_slug, status, created_at)
            VALUES ($1, $2, $3, $4, 'active', NOW())
            ON CONFLICT (org_id, user_id) DO UPDATE SET role_slug = EXCLUDED.role_slug, status = 'active'
            """,
            str(uuid.uuid4()),
            tenant_id,
            user_id,
            role_slug,
        )
        await ensure_tenant_environments(tenant_id)

    async def signup(self, email: str, password: str, tenant_id: Optional[str] = None) -> Dict:
        if email in self.users:
            raise ValueError('User already exists')

        existing_user = await db_manager.fetch_one('SELECT user_id FROM users WHERE email = $1', email)
        if existing_user:
            raise ValueError('User already exists')

        user_id = str(uuid.uuid4())
        if not tenant_id:
            tenant_id = str(uuid.uuid4())

        password_hash = self.hash_password(password)

        try:
            await db_manager.execute_query(
                """
                INSERT INTO tenants (
                    tenant_id, email, subscription_tier,
                    monthly_quota, current_usage, billing_cycle_start, billing_cycle_end
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (tenant_id) DO NOTHING
                """,
                tenant_id,
                email,
                'Sandbox',
                100,
                0,
                datetime.utcnow().date(),
                (datetime.utcnow() + timedelta(days=30)).date(),
            )
            logger.info('Tenant record created in database', extra={'tenant_id': tenant_id, 'email': email})

            span = trace.get_current_span()
            if span and span.is_recording():
                span.set_attribute('tenant.id', tenant_id)
        except Exception as e:
            logger.error(f'Failed to create tenant record: {e}', extra={'tenant_id': tenant_id})
            raise ValueError(f'Failed to create tenant: {e}')

        role = 'Master_Admin' if email.lower() == 'superuser@veraproof.ai' else 'Admin'
        role_slug = 'platform_admin' if role == 'Master_Admin' else 'org_admin'

        try:
            await db_manager.execute_query(
                """
                INSERT INTO users (
                    user_id, tenant_id, email, password_hash, role, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                """,
                user_id,
                tenant_id,
                email,
                password_hash,
                role,
                datetime.utcnow(),
            )
            await self._ensure_org_shape(tenant_id, user_id, email, role_slug=role_slug)
            logger.info('User created in database', extra={'user_id': user_id, 'tenant_id': tenant_id, 'email': email})
        except Exception as e:
            logger.error(f'Failed to create user record: {e}', extra={'email': email})
            raise ValueError(f'Failed to create user: {e}')

        user = {
            'user_id': user_id,
            'tenant_id': tenant_id,
            'email': email,
            'password_hash': password_hash,
            'role': role,
            'created_at': datetime.utcnow().isoformat(),
        }
        self.users[email] = user

        return {
            'user_id': user_id,
            'tenant_id': tenant_id,
            'email': email,
            'role': role,
        }

    async def login(self, email: str, password: str) -> Dict:
        user = self.users.get(email)
        if not user:
            user_record = await db_manager.fetch_one(
                'SELECT user_id, tenant_id, email, password_hash, role FROM users WHERE email = $1',
                email,
            )
            if user_record:
                user = {
                    'user_id': str(user_record['user_id']),
                    'tenant_id': str(user_record['tenant_id']),
                    'email': user_record['email'],
                    'password_hash': user_record['password_hash'],
                    'role': user_record['role'],
                }
                self.users[email] = user
                logger.info('User loaded from database', extra={'user_id': user['user_id'], 'tenant_id': user['tenant_id']})

        if not user or not self.verify_password(password, user['password_hash']):
            logger.warning('Invalid credentials attempted', extra={'email': email})
            raise ValueError('Invalid credentials')

        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute('user.id', user['user_id'])
            span.set_attribute('tenant.id', user['tenant_id'])

        access_token = self.create_access_token(
            {
                'user_id': user['user_id'],
                'tenant_id': user['tenant_id'],
                'email': user['email'],
                'role': user['role'],
            }
        )
        refresh_token = self.create_refresh_token(
            {
                'user_id': user['user_id'],
                'tenant_id': user['tenant_id'],
            }
        )

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'user': {
                'user_id': user['user_id'],
                'tenant_id': user['tenant_id'],
                'email': user['email'],
                'role': user['role'],
            },
        }

    async def ensure_development_bootstrap_user(self):
        if not settings.use_local_auth or settings.environment.lower() not in {'development', 'local'}:
            return
        if not settings.dev_local_admin_email or not settings.dev_local_admin_password:
            return
        if not db_manager.pool:
            logger.warning('Skipping development bootstrap user creation because database is unavailable')
            return

        email = settings.dev_local_admin_email.strip().lower()
        password_hash = self.hash_password(settings.dev_local_admin_password)
        existing_user = await db_manager.fetch_one(
            """
            SELECT user_id, tenant_id, email, password_hash, role
            FROM users
            WHERE email = $1
            """,
            email,
        )
        if existing_user:
            role = existing_user['role'] or 'Admin'
            role_slug = 'platform_admin' if role == 'Master_Admin' else 'org_admin'
            if existing_user['password_hash'] != password_hash:
                await db_manager.execute_query(
                    """
                    UPDATE users
                    SET password_hash = $1, updated_at = NOW()
                    WHERE user_id = $2
                    """,
                    password_hash,
                    existing_user['user_id'],
                )
            await self._ensure_org_shape(str(existing_user['tenant_id']), str(existing_user['user_id']), email, role_slug=role_slug)
            self.users[email] = {
                'user_id': str(existing_user['user_id']),
                'tenant_id': str(existing_user['tenant_id']),
                'email': email,
                'password_hash': password_hash,
                'role': role,
            }
            logger.info('Development bootstrap user synchronized', extra={'email': email, 'tenant_id': str(existing_user['tenant_id'])})
            return

        user = await self.signup(email, settings.dev_local_admin_password)
        logger.info('Development bootstrap user created', extra={'email': email, 'tenant_id': user['tenant_id']})

    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
        to_encode.update({'exp': expire, 'type': 'access'})
        return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expiration_days)
        to_encode.update({'exp': expire, 'type': 'refresh'})
        return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    async def verify_jwt(self, token: str) -> Dict:
        try:
            return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        except JWTError as e:
            logger.error(f'JWT verification failed: {e}')
            raise ValueError('Invalid token')

    async def refresh_token(self, refresh_token: str) -> Dict:
        payload = await self.verify_jwt(refresh_token)
        if payload.get('type') != 'refresh':
            raise ValueError('Invalid token type')

        user = None
        for candidate in self.users.values():
            if candidate['user_id'] == payload['user_id']:
                user = candidate
                break

        if not user:
            raise ValueError('User not found')

        access_token = self.create_access_token(
            {
                'user_id': user['user_id'],
                'tenant_id': user['tenant_id'],
                'email': user['email'],
                'role': user['role'],
            }
        )
        return {'access_token': access_token, 'token_type': 'bearer'}

    async def logout(self, refresh_token: str):
        await self.verify_jwt(refresh_token)
        logger.info('User logged out')


class APIKeyManager:
    """API key manager interfacing directly with Postgres via db_manager"""

    async def generate_key(self, tenant_id: str, environment: str) -> Dict:
        await ensure_tenant_environments(tenant_id)
        environment_slug = environment if environment in {'sandbox', 'production'} else DEFAULT_ENVIRONMENT
        environment_record = await get_tenant_environment(tenant_id, slug=environment_slug)
        if not environment_record:
            raise ValueError('Environment is not configured for this tenant')

        active_keys_count = await db_manager.fetch_val(
            """
            SELECT COUNT(*)
            FROM api_keys
            WHERE tenant_id = $1 AND tenant_environment_id = $2 AND revoked_at IS NULL
            """,
            tenant_id,
            environment_record['environment_id'],
            tenant_id=tenant_id,
            context={'environment_id': environment_record['environment_id'], 'environment_slug': environment_slug},
        )
        if active_keys_count and active_keys_count >= 5:
            raise ValueError(f'Maximum limit of 5 active API keys reached for {environment_slug}')

        key_id = str(uuid.uuid4())
        raw_token = f'vp_{environment_slug}_{uuid.uuid4().hex}'
        hashed_secret = hashlib.sha256(raw_token.encode()).hexdigest()
        display_label = f'vp_{environment_slug}_...{raw_token[-4:]}'
        created_at = datetime.utcnow()

        await db_manager.execute_query(
            """
            INSERT INTO api_keys (
                key_id,
                tenant_id,
                tenant_environment_id,
                api_key,
                api_secret,
                environment,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            key_id,
            tenant_id,
            environment_record['environment_id'],
            display_label,
            hashed_secret,
            environment_slug,
            created_at,
            tenant_id=tenant_id,
            context={'environment_id': environment_record['environment_id'], 'environment_slug': environment_slug},
        )

        logger.info('API key generated', extra={'tenant_id': tenant_id, 'key_id': key_id, 'environment': environment_slug})
        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute('tenant.id', tenant_id)
            span.set_attribute('api_key.id', key_id)
            span.set_attribute('api_key.environment', environment_slug)

        return {
            'key_id': key_id,
            'api_key': raw_token,
            'environment': environment_slug,
        }

    async def validate_key(self, raw_token: str) -> Tuple[str, str, str]:
        hashed_secret = hashlib.sha256(raw_token.encode()).hexdigest()
        key_data = await db_manager.fetch_one(
            """
            SELECT tenant_id,
                   COALESCE(environment, $2) AS environment,
                   tenant_environment_id
            FROM api_keys
            WHERE api_secret = $1 AND revoked_at IS NULL
            """,
            hashed_secret,
            DEFAULT_ENVIRONMENT,
        )
        if not key_data:
            logger.warning('Invalid or revoked API key validation attempt')
            raise ValueError('Invalid or revoked API key')

        environment_id = str(key_data['tenant_environment_id']) if key_data.get('tenant_environment_id') else None
        environment_slug = key_data['environment'] or DEFAULT_ENVIRONMENT

        if not environment_id:
            await ensure_tenant_environments(str(key_data['tenant_id']))
            environment_record = await get_tenant_environment(str(key_data['tenant_id']), slug=environment_slug)
            if not environment_record:
                raise ValueError('Environment is not configured for this API key')
            environment_id = environment_record['environment_id']
            await db_manager.execute_query(
                "UPDATE api_keys SET tenant_environment_id = $1 WHERE api_secret = $2",
                environment_id,
                hashed_secret,
            )

        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute('tenant.id', str(key_data['tenant_id']))
            span.set_attribute('api_key.environment', environment_slug)

        return str(key_data['tenant_id']), environment_slug, environment_id

    async def revoke_key(self, key_id: str, tenant_id: Optional[str] = None):
        query = """
            UPDATE api_keys
            SET revoked_at = $1
            WHERE key_id = $2 AND revoked_at IS NULL
        """
        params = [datetime.utcnow(), key_id]
        if tenant_id:
            query += ' AND tenant_id = $3'
            params.append(tenant_id)

        query += ' RETURNING tenant_id'
        result = await db_manager.fetch_one(query, *params, tenant_id=tenant_id)

        if result:
            logger.info('API key revoked', extra={'key_id': key_id, 'tenant_id': str(result['tenant_id'])})
            span = trace.get_current_span()
            if span and span.is_recording():
                span.set_attribute('api_key.action', 'revoke')
        else:
            logger.warning('Attempted to revoke non-existent or unauthorized API key', extra={'key_id': key_id, 'tenant_id': tenant_id})
            raise ValueError('API key not found or already revoked')


local_auth_manager = LocalAuthManager()
api_key_manager = APIKeyManager()
