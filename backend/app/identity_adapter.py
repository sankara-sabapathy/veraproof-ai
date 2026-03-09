import secrets
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.config import settings


class IdentityAdapterError(Exception):
    pass


@dataclass
class ExternalIdentityProfile:
    provider: str
    subject: str
    email: str
    email_verified: bool
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class BaseIdentityAdapter:
    provider_name = "base"

    def is_enabled(self) -> bool:
        return False

    async def build_login_url(self, state: str) -> str:
        raise NotImplementedError

    async def exchange_code(self, code: str) -> ExternalIdentityProfile:
        raise NotImplementedError

    def issue_state(self) -> str:
        return secrets.token_urlsafe(32)


class GoogleOIDCAdapter(BaseIdentityAdapter):
    provider_name = "google"
    authorize_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    token_endpoint = "https://oauth2.googleapis.com/token"
    userinfo_endpoint = "https://openidconnect.googleapis.com/v1/userinfo"

    def is_enabled(self) -> bool:
        return bool(
            settings.google_oauth_enabled
            and settings.google_client_id
            and settings.google_client_secret
            and settings.google_redirect_uri
        )

    async def build_login_url(self, state: str) -> str:
        if not self.is_enabled():
            raise IdentityAdapterError("Google OIDC is not configured")

        query = urlencode(
            {
                "client_id": settings.google_client_id,
                "redirect_uri": settings.google_redirect_uri,
                "response_type": "code",
                "scope": settings.google_oauth_scopes,
                "access_type": "offline",
                "include_granted_scopes": "true",
                "prompt": "select_account",
                "state": state,
            }
        )
        return f"{self.authorize_endpoint}?{query}"

    async def exchange_code(self, code: str) -> ExternalIdentityProfile:
        if not self.is_enabled():
            raise IdentityAdapterError("Google OIDC is not configured")

        async with httpx.AsyncClient(timeout=15.0) as client:
            token_response = await client.post(
                self.token_endpoint,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if token_response.status_code >= 400:
                raise IdentityAdapterError(token_response.text)

            token_payload = token_response.json()
            access_token = token_payload.get("access_token")
            if not access_token:
                raise IdentityAdapterError("Google token response did not include an access token")

            userinfo_response = await client.get(
                self.userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_response.status_code >= 400:
                raise IdentityAdapterError(userinfo_response.text)

            userinfo = userinfo_response.json()
            email = userinfo.get("email")
            subject = userinfo.get("sub")
            if not email or not subject:
                raise IdentityAdapterError("Google user profile did not include email/sub")

            return ExternalIdentityProfile(
                provider=self.provider_name,
                subject=subject,
                email=email,
                email_verified=bool(userinfo.get("email_verified")),
                full_name=userinfo.get("name"),
                avatar_url=userinfo.get("picture"),
            )


def get_identity_adapter() -> Optional[BaseIdentityAdapter]:
    adapter = GoogleOIDCAdapter()
    if adapter.is_enabled():
        return adapter
    return None
