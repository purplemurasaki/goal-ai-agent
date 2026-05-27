from collections.abc import AsyncIterator
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChatRole, ChatSessionKind
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services.ai_usage_service import AiUsageService
from app.services.goal_service import GoalService
from app.agents.runner import AgentRunner
from app.agents.moderation import check_moderation


class ChatService:
    def __init__(self, session: AsyncSession, agent_runner: AgentRunner | None = None) -> None:
        self.session = session
        self.repo = ChatRepository(session)
        self.goal_service = GoalService(session)
        self.ai_usage = AiUsageService(session)
        self.agent_runner = agent_runner or AgentRunner()

    async def list_messages(
        self,
        goal_id: UUID,
        user_id: UUID,
        session_kind: ChatSessionKind | None = None,
    ) -> list[ChatMessageResponse]:
        await self.goal_service.require_owned_goal(goal_id, user_id)
        messages = await self.repo.list_for_goal(goal_id, session_kind)
        return [ChatMessageResponse.model_validate(m) for m in messages]

    async def stream_response(
        self,
        goal_id: UUID,
        user_id: UUID,
        data: ChatMessageCreate,
    ) -> AsyncIterator[str]:
        await self.goal_service.require_owned_goal(goal_id, user_id)
        await check_moderation(data.content)
        await self.ai_usage.check_and_increment(user_id)

        await self.repo.create(
            goal_id=goal_id,
            role=ChatRole.user,
            content=data.content,
            session_kind=data.session_kind,
        )

        history = await self.repo.list_for_goal(goal_id, data.session_kind)
        full_response = ""
        metadata: dict | None = None

        async for chunk in self.agent_runner.stream_chat(
            session_kind=data.session_kind,
            user_message=data.content,
            history=history,
        ):
            if chunk.get("type") == "token":
                token = chunk.get("content", "")
                full_response += token
                yield token
            elif chunk.get("type") == "metadata":
                metadata = chunk.get("content")

        await self.repo.create(
            goal_id=goal_id,
            role=ChatRole.assistant,
            content=full_response,
            session_kind=data.session_kind,
            metadata=metadata,
        )
