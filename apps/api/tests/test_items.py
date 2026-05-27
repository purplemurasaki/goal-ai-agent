from datetime import date, timedelta
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChatMessage, ChatRole, ChatSessionKind
from tests.conftest import run_db


@pytest.mark.asyncio
async def test_summary_and_task_update(
    client: AsyncClient,
    auth_headers: dict[str, str],
    seeded_user,
    clean_goals,
) -> None:
    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "title": "進捗テスト",
            "due_date": (date.today() + timedelta(days=14)).isoformat(),
        },
        headers=auth_headers,
    )
    goal_id = UUID(goal_resp.json()["id"])

    metadata = {
        "proposal_version": 1,
        "milestones": [
            {
                "title": "中項目1",
                "sort_order": 0,
                "tasks": [
                    {"title": "タスクA", "sort_order": 0},
                    {"title": "タスクB", "sort_order": 1},
                ],
            }
        ],
    }

    async def seed_decompose(session: AsyncSession) -> None:
        session.add(
            ChatMessage(
                goal_id=goal_id,
                role=ChatRole.assistant,
                content="分解案",
                session_kind=ChatSessionKind.decompose,
                metadata_=metadata,
            )
        )

    await run_db(seed_decompose)

    bulk = await client.post(
        f"/api/v1/goals/{goal_id}/items/bulk",
        headers=auth_headers,
    )
    assert bulk.status_code == 200
    tasks = bulk.json()["milestones"][0]["tasks"]
    task_id = tasks[0]["id"]

    patch = await client.patch(
        f"/api/v1/goals/{goal_id}/items/{task_id}",
        json={"status": "completed"},
        headers=auth_headers,
    )
    assert patch.status_code == 200

    summary = await client.get(
        f"/api/v1/goals/{goal_id}/summary",
        headers=auth_headers,
    )
    assert summary.status_code == 200
    body = summary.json()
    assert body["task_total"] == 2
    assert body["task_completed"] == 1
    assert body["completion_rate_pct"] == 50.0


@pytest.mark.asyncio
async def test_bulk_rejects_too_many_milestones(
    client: AsyncClient,
    auth_headers: dict[str, str],
    seeded_user,
    clean_goals,
) -> None:
    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "title": "上限テスト",
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
        },
        headers=auth_headers,
    )
    goal_id = UUID(goal_resp.json()["id"])

    milestones = [
        {"title": f"MS{i}", "sort_order": i, "tasks": []} for i in range(21)
    ]

    async def seed_many(session: AsyncSession) -> None:
        session.add(
            ChatMessage(
                goal_id=goal_id,
                role=ChatRole.assistant,
                content="too many",
                session_kind=ChatSessionKind.decompose,
                metadata_={"proposal_version": 1, "milestones": milestones},
            )
        )

    await run_db(seed_many)

    response = await client.post(
        f"/api/v1/goals/{goal_id}/items/bulk",
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert response.json()["code"] == "VALIDATION_ERROR"
