from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChatMessage, ChatRole, ChatSessionKind


class ChatRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_goal(
        self,
        goal_id: UUID,
        session_kind: ChatSessionKind | None = None,
    ) -> list[ChatMessage]:
        query = select(ChatMessage).where(ChatMessage.goal_id == goal_id)
        if session_kind is not None:
            query = query.where(ChatMessage.session_kind == session_kind)
        query = query.order_by(ChatMessage.created_at)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_latest_decompose_metadata(self, goal_id: UUID) -> dict | None:
        result = await self.session.execute(
            select(ChatMessage)
            .where(
                ChatMessage.goal_id == goal_id,
                ChatMessage.session_kind == ChatSessionKind.decompose,
                ChatMessage.role == ChatRole.assistant,
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        message = result.scalar_one_or_none()
        if message is None or not message.metadata_:
            return None
        return message.metadata_

    async def create(
        self,
        goal_id: UUID,
        role: ChatRole,
        content: str,
        session_kind: ChatSessionKind,
        metadata: dict | None = None,
    ) -> ChatMessage:
        message = ChatMessage(
            goal_id=goal_id,
            role=role,
            content=content,
            session_kind=session_kind,
            metadata_=metadata,
        )
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message
