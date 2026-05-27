from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Goal, GoalStatus


class GoalRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id_for_user(self, goal_id: UUID, user_id: UUID) -> Goal | None:
        result = await self.session.execute(
            select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_current_for_user(self, user_id: UUID) -> Goal | None:
        result = await self.session.execute(
            select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at.desc())
        )
        return result.scalars().first()

    async def count_for_user(self, user_id: UUID) -> int:
        from sqlalchemy import func

        result = await self.session.execute(
            select(func.count()).select_from(Goal).where(Goal.user_id == user_id)
        )
        return int(result.scalar_one())

    async def create(
        self,
        user_id: UUID,
        title: str,
        due_date: date,
        description: str | None,
    ) -> Goal:
        goal = Goal(
            user_id=user_id,
            title=title,
            due_date=due_date,
            description=description,
            status=GoalStatus.draft,
        )
        self.session.add(goal)
        await self.session.flush()
        await self.session.refresh(goal)
        return goal

    async def update(
        self,
        goal: Goal,
        *,
        title: str | None = None,
        due_date: date | None = None,
        description: str | None = None,
        status: GoalStatus | None = None,
        decomposition_confirmed_at: datetime | None = None,
    ) -> Goal:
        if title is not None:
            goal.title = title
        if due_date is not None:
            goal.due_date = due_date
        if description is not None:
            goal.description = description
        if status is not None:
            goal.status = status
        if decomposition_confirmed_at is not None:
            goal.decomposition_confirmed_at = decomposition_confirmed_at
        goal.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(goal)
        return goal

    async def delete_items_for_goal(self, goal_id: UUID) -> None:
        from app.db.models import GoalItem

        await self.session.execute(delete(GoalItem).where(GoalItem.goal_id == goal_id))
