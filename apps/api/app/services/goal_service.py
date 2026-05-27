from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.db.models import Goal
from app.repositories.goal_repository import GoalRepository
from app.schemas.goal import GoalCreate, GoalUpdate


class GoalService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = GoalRepository(session)

    async def require_owned_goal(self, goal_id: UUID, user_id: UUID) -> Goal:
        goal = await self.repo.get_by_id_for_user(goal_id, user_id)
        if goal is None:
            raise AppError("NOT_FOUND", "目標が見つかりません", 404)
        return goal

    async def get_current(self, user_id: UUID) -> Goal | None:
        return await self.repo.get_current_for_user(user_id)

    async def create(self, user_id: UUID, data: GoalCreate) -> Goal:
        if await self.repo.count_for_user(user_id) > 0:
            raise AppError(
                "GOAL_ALREADY_EXISTS",
                "ユーザーは既に目標を持っています",
                409,
            )
        return await self.repo.create(
            user_id=user_id,
            title=data.title,
            due_date=data.due_date,
            description=data.description,
        )

    async def update(self, goal_id: UUID, user_id: UUID, data: GoalUpdate) -> Goal:
        goal = await self.require_owned_goal(goal_id, user_id)
        return await self.repo.update(
            goal,
            title=data.title,
            due_date=data.due_date,
            description=data.description,
        )
