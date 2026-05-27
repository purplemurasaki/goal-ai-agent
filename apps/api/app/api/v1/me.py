from fastapi import APIRouter

from app.core.dependencies import CurrentUserId, DbSession
from app.core.exceptions import AppError
from app.repositories.profile_repository import ProfileRepository
from app.schemas.profile import ProfileResponse

router = APIRouter(tags=["me"])


@router.get("/me", response_model=ProfileResponse)
async def get_me(user_id: CurrentUserId, db: DbSession) -> ProfileResponse:
    profile = await ProfileRepository(db).get_by_id(user_id)
    if profile is None:
        raise AppError("NOT_FOUND", "プロフィールが見つかりません", 404)
    return ProfileResponse.model_validate(profile)
