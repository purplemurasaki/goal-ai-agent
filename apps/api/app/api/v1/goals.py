from uuid import UUID

from fastapi import APIRouter

from app.core.dependencies import CurrentUserId, DbSession
from app.core.exceptions import AppError
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate
from app.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/current", response_model=GoalResponse)
async def get_current_goal(user_id: CurrentUserId, db: DbSession) -> GoalResponse:
    goal = await GoalService(db).get_current(user_id)
    if goal is None:
        raise AppError("NOT_FOUND", "目標が見つかりません", 404)
    return GoalResponse.model_validate(goal)


@router.post("", response_model=GoalResponse, status_code=201)
async def create_goal(
    body: GoalCreate,
    user_id: CurrentUserId,
    db: DbSession,
) -> GoalResponse:
    goal = await GoalService(db).create(user_id, body)
    return GoalResponse.model_validate(goal)


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID,
    body: GoalUpdate,
    user_id: CurrentUserId,
    db: DbSession,
) -> GoalResponse:
    goal = await GoalService(db).update(goal_id, user_id, body)
    return GoalResponse.model_validate(goal)
