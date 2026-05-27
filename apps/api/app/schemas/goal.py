from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import GoalStatus


class GoalCreate(BaseModel):
    title: str = Field(max_length=200)
    due_date: date
    description: str | None = Field(default=None, max_length=2000)


class GoalUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    due_date: date | None = None
    description: str | None = Field(default=None, max_length=2000)


class GoalResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    due_date: date
    description: str | None
    status: GoalStatus
    decomposition_confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
