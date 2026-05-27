from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.db.models import GoalItemType, GoalStatus, TaskStatus
from app.repositories.chat_repository import ChatRepository
from app.repositories.goal_repository import GoalRepository
from app.repositories.item_repository import ItemRepository
from app.schemas.item import (
    GoalItemTreeResponse,
    GoalItemResponse,
    GoalSummaryResponse,
    MilestoneNode,
    NextTask,
    TaskNode,
    TaskUpdate,
)
from app.services.goal_service import GoalService

MAX_ITEMS_PER_TYPE = 20


class ItemService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.item_repo = ItemRepository(session)
        self.goal_repo = GoalRepository(session)
        self.chat_repo = ChatRepository(session)
        self.goal_service = GoalService(session)

    async def list_items(self, goal_id: UUID, user_id: UUID) -> list[GoalItemResponse]:
        await self.goal_service.require_owned_goal(goal_id, user_id)
        items = await self.item_repo.list_for_goal(goal_id)
        return [GoalItemResponse.model_validate(i) for i in items]

    def build_tree(self, items: list) -> GoalItemTreeResponse:
        milestones_raw = [i for i in items if i.item_type == GoalItemType.milestone]
        tasks_raw = [i for i in items if i.item_type == GoalItemType.task]
        milestones: list[MilestoneNode] = []
        for ms in sorted(milestones_raw, key=lambda x: x.sort_order):
            tasks = [
                TaskNode(
                    id=t.id,
                    title=t.title,
                    sort_order=t.sort_order,
                    status=t.status or TaskStatus.not_started,
                    note=t.note,
                )
                for t in sorted(tasks_raw, key=lambda x: x.sort_order)
                if t.parent_id == ms.id
            ]
            milestones.append(
                MilestoneNode(id=ms.id, title=ms.title, sort_order=ms.sort_order, tasks=tasks)
            )
        return GoalItemTreeResponse(milestones=milestones)

    async def get_tree(self, goal_id: UUID, user_id: UUID) -> GoalItemTreeResponse:
        await self.goal_service.require_owned_goal(goal_id, user_id)
        items = await self.item_repo.list_for_goal(goal_id)
        return self.build_tree(items)

    async def update_task(
        self, goal_id: UUID, item_id: UUID, user_id: UUID, data: TaskUpdate
    ) -> GoalItemResponse:
        await self.goal_service.require_owned_goal(goal_id, user_id)
        item = await self.item_repo.get_by_id_for_goal(item_id, goal_id)
        if item is None:
            raise AppError("NOT_FOUND", "項目が見つかりません", 404)
        if item.item_type != GoalItemType.task:
            raise AppError(
                "VALIDATION_ERROR",
                "タスクのみ進捗を更新できます",
                400,
            )
        if data.status is not None:
            item.status = data.status
        if data.note is not None:
            item.note = data.note
        item.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(item)
        return GoalItemResponse.model_validate(item)

    async def get_summary(self, goal_id: UUID, user_id: UUID) -> GoalSummaryResponse:
        await self.goal_service.require_owned_goal(goal_id, user_id)
        items = await self.item_repo.list_for_goal(goal_id)
        tasks = [i for i in items if i.item_type == GoalItemType.task]
        total = len(tasks)
        if total == 0:
            return GoalSummaryResponse(
                completion_rate_pct=0.0,
                task_total=0,
                task_completed=0,
                task_in_progress=0,
                task_not_started=0,
                next_task=None,
            )
        completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
        in_progress = sum(1 for t in tasks if t.status == TaskStatus.in_progress)
        not_started = sum(1 for t in tasks if t.status == TaskStatus.not_started)
        next_task_item = next(
            (
                t
                for t in sorted(tasks, key=lambda x: x.sort_order)
                if t.status != TaskStatus.completed
            ),
            None,
        )
        next_task = (
            NextTask(id=next_task_item.id, title=next_task_item.title)
            if next_task_item
            else None
        )
        return GoalSummaryResponse(
            completion_rate_pct=round((completed / total) * 100, 1),
            task_total=total,
            task_completed=completed,
            task_in_progress=in_progress,
            task_not_started=not_started,
            next_task=next_task,
        )

    def _validate_proposal(self, metadata: dict) -> list[dict]:
        milestones = metadata.get("milestones")
        if not isinstance(milestones, list) or not milestones:
            raise AppError(
                "VALIDATION_ERROR",
                "分解提案の形式が不正です",
                400,
            )
        if len(milestones) > MAX_ITEMS_PER_TYPE:
            raise AppError(
                "VALIDATION_ERROR",
                f"中項目は最大{MAX_ITEMS_PER_TYPE}件までです",
                400,
            )
        for ms in milestones:
            tasks = ms.get("tasks", [])
            if len(tasks) > MAX_ITEMS_PER_TYPE:
                raise AppError(
                    "VALIDATION_ERROR",
                    f"タスクは最大{MAX_ITEMS_PER_TYPE}件までです",
                    400,
                )
        return milestones

    async def confirm_bulk(self, goal_id: UUID, user_id: UUID) -> GoalItemTreeResponse:
        goal = await self.goal_service.require_owned_goal(goal_id, user_id)
        metadata = await self.chat_repo.get_latest_decompose_metadata(goal_id)
        if metadata is None:
            raise AppError(
                "VALIDATION_ERROR",
                "確定可能な分解提案がありません",
                400,
            )
        milestones = self._validate_proposal(metadata)
        await self.goal_repo.delete_items_for_goal(goal_id)
        await self.item_repo.bulk_insert(goal_id, milestones)
        await self.goal_repo.update(
            goal,
            status=GoalStatus.active,
            decomposition_confirmed_at=datetime.now(timezone.utc),
        )
        items = await self.item_repo.list_for_goal(goal_id)
        return self.build_tree(items)
