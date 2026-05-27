from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.core.config import get_settings


@pytest.mark.asyncio
async def test_chat_sse_mock(
    client: AsyncClient,
    auth_headers: dict[str, str],
    seeded_user,
    clean_goals,
) -> None:
    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "title": "チャットテスト",
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
        },
        headers=auth_headers,
    )
    goal_id = goal_resp.json()["id"]

    async with client.stream(
        "POST",
        f"/api/v1/goals/{goal_id}/chat/messages",
        json={"content": "目標を具体化したい", "session_kind": "coaching"},
        headers=auth_headers,
    ) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

    messages = await client.get(
        f"/api/v1/goals/{goal_id}/chat/messages",
        headers=auth_headers,
    )
    assert messages.status_code == 200
    assert len(messages.json()) >= 2


@pytest.mark.asyncio
async def test_ai_quota_exceeded(
    client: AsyncClient,
    auth_headers: dict[str, str],
    seeded_user,
    clean_goals,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    monkeypatch.setenv("AI_DAILY_LIMIT", "0")
    get_settings.cache_clear()

    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "title": "上限テスト",
            "due_date": (date.today() + timedelta(days=3)).isoformat(),
        },
        headers=auth_headers,
    )
    goal_id = goal_resp.json()["id"]

    response = await client.post(
        f"/api/v1/goals/{goal_id}/reviews",
        headers=auth_headers,
    )
    assert response.status_code == 429
    assert response.json()["code"] == "AI_QUOTA_EXCEEDED"

    monkeypatch.setenv("AI_DAILY_LIMIT", "50")
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_moderation_flagged() -> None:
    from app.agents.moderation import check_moderation
    from app.core.exceptions import AppError

    mock_result = AsyncMock()
    mock_result.results = [AsyncMock(flagged=True)]

    with patch("openai.AsyncOpenAI") as mock_client:
        mock_client.return_value.moderations.create = AsyncMock(return_value=mock_result)
        with patch("app.agents.moderation.get_settings") as mock_settings:
            mock_settings.return_value.openai_api_key = "test-key"
            with pytest.raises(AppError) as exc:
                await check_moderation("bad content")
            assert exc.value.code == "VALIDATION_ERROR"
