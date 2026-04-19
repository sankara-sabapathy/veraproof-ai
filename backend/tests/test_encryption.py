import pytest

from app.encryption import tenant_encryption_manager


@pytest.mark.asyncio
async def test_managed_mode_encrypts_and_decrypts(monkeypatch):
    async def fake_fetch_one(query, tenant_id_value, tenant_id=None):
        return {'encryption_mode': 'managed', 'encryption_key_version': 3}

    monkeypatch.setattr('app.encryption.db_manager.fetch_one', fake_fetch_one)

    plaintext = b'sensitive-verification-payload'
    ciphertext, metadata = await tenant_encryption_manager.encrypt_for_tenant('tenant-123', plaintext)

    assert ciphertext != plaintext
    assert metadata['vp_encrypted'] == '1'
    assert metadata['vp_mode'] == 'managed'
    assert metadata['vp_key_id'] == 'app-managed:tenant-123:v3'

    decrypted = await tenant_encryption_manager.decrypt_for_tenant('tenant-123', ciphertext, metadata)
    assert decrypted == plaintext


@pytest.mark.asyncio
async def test_tenant_managed_mode_requires_runtime_key(monkeypatch):
    async def fake_fetch_one(query, tenant_id_value, tenant_id=None):
        return {'encryption_mode': 'tenant_managed', 'encryption_key_version': 1}

    monkeypatch.setattr('app.encryption.db_manager.fetch_one', fake_fetch_one)
    monkeypatch.setattr('app.encryption.dashboard_session_manager.get_tenant_runtime_key', lambda tenant_id: None)

    with pytest.raises(Exception):
        await tenant_encryption_manager.encrypt_for_tenant('tenant-abc', b'payload')


@pytest.mark.asyncio
async def test_tenant_managed_mode_encrypts_with_runtime_key(monkeypatch):
    async def fake_fetch_one(query, tenant_id_value, tenant_id=None):
        return {'encryption_mode': 'tenant_managed', 'encryption_key_version': 1}

    monkeypatch.setattr('app.encryption.db_manager.fetch_one', fake_fetch_one)
    monkeypatch.setattr('app.encryption.dashboard_session_manager.get_tenant_runtime_key', lambda tenant_id: 'passphrase-123')

    plaintext = b'customer-controlled-payload'
    ciphertext, metadata = await tenant_encryption_manager.encrypt_for_tenant('tenant-456', plaintext)

    assert ciphertext != plaintext
    assert metadata['vp_mode'] == 'tenant_managed'

    decrypted = await tenant_encryption_manager.decrypt_for_tenant('tenant-456', ciphertext, metadata)
    assert decrypted == plaintext
