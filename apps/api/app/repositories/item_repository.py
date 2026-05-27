from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GoalItem, GoalItemType, TaskStatus


class ItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_goal(self, goal_id: UUID) -> list[GoalItem]:
        result = await self.session.execute(
            select(GoalItem)
            .where(GoalItem.goal_id == goal_id)
            .order_by(GoalItem.sort_order, GoalItem.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id_for_goal(self, item_id: UUID, goal_id: UUID) -> GoalItem | None:
        result = await self.session.execute(
            select(GoalItem).where(GoalItem.id == item_id, GoalItem.goal_id == goal_id)
        )
        return result.scalar_one_or_none()

    async def bulk_insert(
        self,
        goal_id: UUID,
        milestones: list[dict],
    ) -> list[GoalItem]:
        created: list[GoalItem] = []
        for ms in milestones:
            milestone = GoalItem(
                goal_id=goal_id,
                parent_id=None,
                item_type=GoalItemType.milestone,
                title=ms["title"],
                sort_order=ms.get("sort_order", 0),
                status=None,
            )
            self.session.add(milestone)
            await self.session.flush()
            created.append(milestone)
            for task in ms.get("tasks", []):
                task_item = GoalItem(
                    goal_id=goal_id,
                    parent_id=milestone.id,
                    item_type=GoalItemType.task,
                    title=task["title"],
                    sort_order=task.get("sort_order", 0),
                    status=TaskStatus.not_started,
                )
                self.session.add(task_item)
                await self.session.flush()
                created.append(task_item)
        return created
