from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AiUsageDaily


class AiUsageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def utc_today() -> date:
        return datetime.now(timezone.utc).date()

    async def get_count(self, user_id: UUID, usage_date: date | None = None) -> int:
        usage_date = usage_date or self.utc_today()
        result = await self.session.execute(
            select(AiUsageDaily.request_count).where(
                AiUsageDaily.user_id == user_id,
                AiUsageDaily.usage_date == usage_date,
            )
        )
        row = result.scalar_one_or_none()
        return row or 0

    async def increment(self, user_id: UUID, usage_date: date | None = None) -> int:
        usage_date = usage_date or self.utc_today()
        stmt = (
            insert(AiUsageDaily)
            .values(user_id=user_id, usage_date=usage_date, request_count=1)
            .on_conflict_do_update(
                index_elements=[AiUsageDaily.user_id, AiUsageDaily.usage_date],
                set_={
                    "request_count": AiUsageDaily.request_count + 1,
                },
            )
            .returning(AiUsageDaily.request_count)
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())
