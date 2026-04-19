import base64
import hashlib
import os
from typing import Dict, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings
from app.dashboard_auth import dashboard_session_manager
from app.database import db_manager


class EncryptionError(Exception):
    pass


class TenantEncryptionManager:
    def _derive_key(self, material: str) -> bytes:
        return hashlib.sha256(material.encode('utf-8')).digest()

    async def get_tenant_config(self, tenant_id: str) -> Dict[str, object]:
        record = await db_manager.fetch_one(
            "SELECT encryption_mode, encryption_key_version FROM tenants WHERE tenant_id = $1",
            tenant_id,
            tenant_id=tenant_id,
        )
        return {
            'mode': (record or {}).get('encryption_mode') or 'managed',
            'key_version': int((record or {}).get('encryption_key_version') or 1),
        }

    def _get_managed_wrapping_key(self, tenant_id: str, key_version: int) -> bytes:
        return self._derive_key(f"{settings.app_encryption_key}:{tenant_id}:v{key_version}")

    def _get_tenant_supplied_wrapping_key(self, tenant_id: str, passphrase: str) -> bytes:
        return self._derive_key(f"tenant-runtime:{tenant_id}:{passphrase}")

    def _build_encrypted_payload(self, *, wrapping_key: bytes, mode: str, key_id: str, plaintext: bytes) -> Tuple[bytes, Dict[str, str]]:
        data_key = os.urandom(32)
        data_nonce = os.urandom(12)
        wrap_nonce = os.urandom(12)
        ciphertext = AESGCM(data_key).encrypt(data_nonce, plaintext, None)
        wrapped_key = AESGCM(wrapping_key).encrypt(wrap_nonce, data_key, None)
        return ciphertext, {
            'vp_encrypted': '1',
            'vp_mode': mode,
            'vp_alg': 'AES256_GCM',
            'vp_key_id': key_id,
            'vp_data_nonce': base64.urlsafe_b64encode(data_nonce).decode('ascii'),
            'vp_wrap_nonce': base64.urlsafe_b64encode(wrap_nonce).decode('ascii'),
            'vp_wrapped_key': base64.urlsafe_b64encode(wrapped_key).decode('ascii'),
        }

    async def encrypt_for_tenant(self, tenant_id: str, plaintext: bytes) -> Tuple[bytes, Dict[str, str]]:
        config = await self.get_tenant_config(tenant_id)
        mode = str(config['mode'])
        key_version = int(config['key_version'])

        if mode == 'tenant_managed':
            passphrase = dashboard_session_manager.get_tenant_runtime_key(tenant_id)
            if not passphrase:
                raise EncryptionError('Tenant-managed encryption key is not loaded for this tenant')
            wrapping_key = self._get_tenant_supplied_wrapping_key(tenant_id, passphrase)
            return self._build_encrypted_payload(
                wrapping_key=wrapping_key,
                mode=mode,
                key_id=f'tenant:{tenant_id}:runtime',
                plaintext=plaintext,
            )

        wrapping_key = self._get_managed_wrapping_key(tenant_id, key_version)
        return self._build_encrypted_payload(
            wrapping_key=wrapping_key,
            mode='managed',
            key_id=f'app-managed:{tenant_id}:v{key_version}',
            plaintext=plaintext,
        )

    async def decrypt_for_tenant(self, tenant_id: str, ciphertext: bytes, metadata: Dict[str, str]) -> bytes:
        if metadata.get('vp_encrypted') != '1':
            return ciphertext

        mode = metadata.get('vp_mode') or 'managed'
        if mode == 'tenant_managed':
            passphrase = dashboard_session_manager.get_tenant_runtime_key(tenant_id)
            if not passphrase:
                raise EncryptionError('Tenant-managed encryption key is not loaded for this tenant')
            wrapping_key = self._get_tenant_supplied_wrapping_key(tenant_id, passphrase)
        else:
            key_version = 1
            key_id = metadata.get('vp_key_id') or ''
            if ':v' in key_id:
                try:
                    key_version = int(key_id.rsplit(':v', 1)[1])
                except ValueError:
                    key_version = 1
            wrapping_key = self._get_managed_wrapping_key(tenant_id, key_version)

        data_nonce = base64.urlsafe_b64decode(metadata['vp_data_nonce'])
        wrap_nonce = base64.urlsafe_b64decode(metadata['vp_wrap_nonce'])
        wrapped_key = base64.urlsafe_b64decode(metadata['vp_wrapped_key'])
        data_key = AESGCM(wrapping_key).decrypt(wrap_nonce, wrapped_key, None)
        return AESGCM(data_key).decrypt(data_nonce, ciphertext, None)

    def describe_encryption(self, metadata: Dict[str, str]) -> Dict[str, str | None]:
        return {
            'encryption_mode': metadata.get('vp_mode'),
            'encryption_key_id': metadata.get('vp_key_id'),
        }


tenant_encryption_manager = TenantEncryptionManager()
