from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProfileResponse(BaseModel):
    id: UUID
    email: str | None
    display_name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
