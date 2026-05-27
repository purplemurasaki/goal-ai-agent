from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ReviewSession


class ReviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_goal(self, goal_id: UUID) -> list[ReviewSession]:
        result = await self.session.execute(
            select(ReviewSession)
            .where(ReviewSession.goal_id == goal_id)
            .order_by(ReviewSession.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        goal_id: UUID,
        feedback_text: str,
        context_snapshot: dict | None,
    ) -> ReviewSession:
        review = ReviewSession(
            goal_id=goal_id,
            feedback_text=feedback_text,
            context_snapshot=context_snapshot,
        )
        self.session.add(review)
        await self.session.flush()
        await self.session.refresh(review)
        return review
