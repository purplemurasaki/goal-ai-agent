from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import GoalItemType, TaskStatus


class GoalItemResponse(BaseModel):
    id: UUID
    goal_id: UUID
    parent_id: UUID | None
    item_type: GoalItemType
    title: str
    sort_order: int
    status: TaskStatus | None
    note: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoalItemTreeResponse(BaseModel):
    milestones: list["MilestoneNode"]


class TaskNode(BaseModel):
    id: UUID
    title: str
    sort_order: int
    status: TaskStatus
    note: str | None


class MilestoneNode(BaseModel):
    id: UUID
    title: str
    sort_order: int
    tasks: list[TaskNode]


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    note: str | None = Field(default=None, max_length=500)


class NextTask(BaseModel):
    id: UUID
    title: str


class GoalSummaryResponse(BaseModel):
    completion_rate_pct: float
    task_total: int
    task_completed: int
    task_in_progress: int
    task_not_started: int
    next_task: NextTask | None
