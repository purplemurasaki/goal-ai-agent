from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Profile


class ProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: UUID) -> Profile | None:
        result = await self.session.execute(select(Profile).where(Profile.id == user_id))
        return result.scalar_one_or_none()
