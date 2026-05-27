from datetime import date, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_duplicate_goal(
    client: AsyncClient,
    auth_headers: dict[str, str],
    seeded_user,
    clean_goals,
) -> None:
    payload = {
        "title": "テスト目標",
        "due_date": (date.today() + timedelta(days=30)).isoformat(),
        "description": "説明",
    }
    created = await client.post("/api/v1/goals", json=payload, headers=auth_headers)
    assert created.status_code == 201
    goal_id = created.json()["id"]

    duplicate = await client.post("/api/v1/goals", json=payload, headers=auth_headers)
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "GOAL_ALREADY_EXISTS"

    current = await client.get("/api/v1/goals/current", headers=auth_headers)
    assert current.status_code == 200
    assert current.json()["id"] == goal_id

    patch = await client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"title": "更新後タイトル"},
        headers=auth_headers,
    )
    assert patch.status_code == 200
    assert patch.json()["title"] == "更新後タイトル"


@pytest.mark.asyncio
async def test_goal_not_found_for_other_user(
    client: AsyncClient,
    auth_headers: dict[str, str],
    other_auth_headers: dict[str, str],
    seeded_user,
    clean_goals,
) -> None:
    payload = {
        "title": "所有者テスト",
        "due_date": (date.today() + timedelta(days=7)).isoformat(),
    }
    created = await client.post("/api/v1/goals", json=payload, headers=auth_headers)
    goal_id = created.json()["id"]

    forbidden = await client.get(
        f"/api/v1/goals/{goal_id}/summary",
        headers=other_auth_headers,
    )
    assert forbidden.status_code == 404
