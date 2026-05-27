from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ReviewResponse(BaseModel):
    id: UUID
    goal_id: UUID
    feedback_text: str
    context_snapshot: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
