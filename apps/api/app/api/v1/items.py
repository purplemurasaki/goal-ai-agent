from uuid import UUID

from fastapi import APIRouter

from app.core.dependencies import CurrentUserId, DbSession
from app.schemas.item import (
    GoalItemResponse,
    GoalItemTreeResponse,
    GoalSummaryResponse,
    TaskUpdate,
)
from app.services.item_service import ItemService

router = APIRouter(prefix="/goals/{goal_id}", tags=["items"])


@router.get("/items", response_model=GoalItemTreeResponse)
async def list_items(
    goal_id: UUID,
    user_id: CurrentUserId,
    db: DbSession,
) -> GoalItemTreeResponse:
    return await ItemService(db).get_tree(goal_id, user_id)


@router.patch("/items/{item_id}", response_model=GoalItemResponse)
async def update_item(
    goal_id: UUID,
    item_id: UUID,
    body: TaskUpdate,
    user_id: CurrentUserId,
    db: DbSession,
) -> GoalItemResponse:
    return await ItemService(db).update_task(goal_id, item_id, user_id, body)


@router.post("/items/bulk", response_model=GoalItemTreeResponse)
async def confirm_items_bulk(
    goal_id: UUID,
    user_id: CurrentUserId,
    db: DbSession,
) -> GoalItemTreeResponse:
    return await ItemService(db).confirm_bulk(goal_id, user_id)


@router.get("/summary", response_model=GoalSummaryResponse)
async def get_summary(
    goal_id: UUID,
    user_id: CurrentUserId,
    db: DbSession,
) -> GoalSummaryResponse:
    return await ItemService(db).get_summary(goal_id, user_id)
