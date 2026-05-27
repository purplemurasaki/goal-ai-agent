from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.repositories.ai_usage_repository import AiUsageRepository


class AiUsageService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = AiUsageRepository(session)
        self.limit = get_settings().ai_daily_limit

    async def check_and_increment(self, user_id: UUID) -> None:
        count = await self.repo.get_count(user_id)
        if count >= self.limit:
            raise AppError(
                "AI_QUOTA_EXCEEDED",
                "本日のAI利用上限に達しました",
                429,
            )
        await self.repo.increment(user_id)
