from functools import lru_cache
from uuid import UUID

import jwt
from jwt import PyJWKClient, PyJWTError

from app.core.config import get_settings
from app.core.exceptions import AppError

_ASYMMETRIC_ALGS = ("ES256", "RS256")


@lru_cache
def _jwk_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


def verify_access_token(token: str) -> UUID:
    settings = get_settings()
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg == "HS256":
            # Legacy / test tokens signed with the shared secret.
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        elif alg in _ASYMMETRIC_ALGS:
            # Supabase issues asymmetric (ES256) tokens; verify via JWKS.
            signing_key = _jwk_client(
                settings.supabase_jwks_url
            ).get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
            )
        else:
            raise AppError("UNAUTHORIZED", "認証トークンが無効です", 401)

        sub = payload.get("sub")
        if not sub:
            raise AppError("UNAUTHORIZED", "認証トークンが無効です", 401)
        return UUID(sub)
    except AppError:
        raise
    except (PyJWTError, ValueError) as exc:
        raise AppError("UNAUTHORIZED", "認証トークンが無効です", 401) from exc
