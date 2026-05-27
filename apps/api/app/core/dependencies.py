from collections.abc import AsyncGenerator
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_access_token
from app.db.session import get_session


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> UUID:
    if not authorization or not authorization.startswith("Bearer "):
        from app.core.exceptions import AppError

        raise AppError("UNAUTHORIZED", "認証が必要です", 401)
    token = authorization.removeprefix("Bearer ").strip()
    return verify_access_token(token)


CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
DbSession = Annotated[AsyncSession, Depends(get_session)]
