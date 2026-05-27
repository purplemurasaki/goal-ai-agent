import uuid

import pytest
from httpx import AsyncClient

from app.core.security import verify_access_token
from tests.conftest import TEST_JWT_SECRET, make_token


def test_verify_valid_token() -> None:
    user_id = uuid.uuid4()
    token = make_token(user_id)
    assert verify_access_token(token) == user_id


def test_verify_invalid_token() -> None:
    from app.core.exceptions import AppError

    with pytest.raises(AppError) as exc:
        verify_access_token("invalid.token.here")
    assert exc.value.code == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_health_without_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_unauthorized_without_header(client: AsyncClient) -> None:
    response = await client.get("/api/v1/goals/current")
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"
