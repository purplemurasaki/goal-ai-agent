from uuid import UUID

import jwt
from jwt import PyJWTError

from app.core.config import get_settings
from app.core.exceptions import AppError


def verify_access_token(token: str) -> UUID:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        sub = payload.get("sub")
        if not sub:
            raise AppError(
                "UNAUTHORIZED",
                "認証トークンが無効です",
                401,
            )
        return UUID(sub)
    except (PyJWTError, ValueError) as exc:
        raise AppError(
            "UNAUTHORIZED",
            "認証トークンが無効です",
            401,
        ) from exc
