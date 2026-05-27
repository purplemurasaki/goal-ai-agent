from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.review_repository import ReviewRepository
from app.schemas.review import ReviewResponse
from app.services.ai_usage_service import AiUsageService
from app.services.goal_service import GoalService
from app.services.item_service import ItemService
from app.agents.runner import AgentRunner
from app.agents.moderation import check_moderation_optional


class ReviewService:
    def __init__(self, session: AsyncSession, agent_runner: AgentRunner | None = None) -> None:
        self.session = session
        self.repo = ReviewRepository(session)
        self.goal_service = GoalService(session)
        self.item_service = ItemService(session)
        self.ai_usage = AiUsageService(session)
        self.agent_runner = agent_runner or AgentRunner()

    async def list_reviews(self, goal_id: UUID, user_id: UUID) -> list[ReviewResponse]:
        await self.goal_service.require_owned_goal(goal_id, user_id)
        reviews = await self.repo.list_for_goal(goal_id)
        return [ReviewResponse.model_validate(r) for r in reviews]

    async def create_review(self, goal_id: UUID, user_id: UUID) -> ReviewResponse:
        goal = await self.goal_service.require_owned_goal(goal_id, user_id)
        summary = await self.item_service.get_summary(goal_id, user_id)
        context = {
            "goal_title": goal.title,
            "due_date": goal.due_date.isoformat(),
            "completion_rate": summary.completion_rate_pct,
            "task_summary": {
                "total": summary.task_total,
                "completed": summary.task_completed,
                "in_progress": summary.task_in_progress,
                "not_started": summary.task_not_started,
            },
        }
        await check_moderation_optional(goal.title)
        await self.ai_usage.check_and_increment(user_id)
        feedback = await self.agent_runner.generate_review(context)
        review = await self.repo.create(
            goal_id=goal_id,
            feedback_text=feedback,
            context_snapshot=context,
        )
        return ReviewResponse.model_validate(review)
