from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import ChatRole, ChatSessionKind


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1)
    session_kind: ChatSessionKind


class ChatMessageResponse(BaseModel):
    id: UUID
    goal_id: UUID
    role: ChatRole
    content: str
    session_kind: ChatSessionKind
    metadata: dict | None = Field(default=None, validation_alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}
