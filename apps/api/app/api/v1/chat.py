from uuid import UUID

from fastapi import APIRouter, Query
from sse_starlette.sse import EventSourceResponse

from app.core.dependencies import CurrentUserId, DbSession
from app.db.models import ChatSessionKind
from app.db.session import session_scope
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/goals/{goal_id}/chat", tags=["chat"])


@router.get("/messages", response_model=list[ChatMessageResponse])
async def list_chat_messages(
    goal_id: UUID,
    user_id: CurrentUserId,
    db: DbSession,
    session_kind: ChatSessionKind | None = Query(default=None),
) -> list[ChatMessageResponse]:
    return await ChatService(db).list_messages(goal_id, user_id, session_kind)


@router.post("/messages")
async def post_chat_message(
    goal_id: UUID,
    body: ChatMessageCreate,
    user_id: CurrentUserId,
) -> EventSourceResponse:
    async def event_generator():
        async for session in session_scope():
            service = ChatService(session)
            async for token in service.stream_response(goal_id, user_id, body):
                yield {"event": "token", "data": token}
            yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator(), media_type="text/event-stream")
