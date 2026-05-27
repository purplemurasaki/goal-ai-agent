from uuid import UUID

from fastapi import APIRouter

from app.core.dependencies import CurrentUserId, DbSession
from app.schemas.review import ReviewResponse
from app.services.review_service import ReviewService

router = APIRouter(prefix="/goals/{goal_id}/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewResponse])
async def list_reviews(
    goal_id: UUID,
    user_id: CurrentUserId,
    db: DbSession,
) -> list[ReviewResponse]:
    return await ReviewService(db).list_reviews(goal_id, user_id)


@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    goal_id: UUID,
    user_id: CurrentUserId,
    db: DbSession,
) -> ReviewResponse:
    return await ReviewService(db).create_review(goal_id, user_id)
