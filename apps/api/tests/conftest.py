import os
import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable

import jwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.db.models import ChatMessage, Goal, GoalItem
from app.db.session import get_session
from app.main import app

TEST_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
OTHER_USER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
TEST_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long"


@pytest.fixture(scope="session", autouse=True)
def configure_test_env() -> None:
    os.environ["DATABASE_URL"] = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres",
    )
    os.environ["SUPABASE_JWT_SECRET"] = TEST_JWT_SECRET
    os.environ["OPENAI_API_KEY"] = ""
    os.environ["AI_DAILY_LIMIT"] = "50"
    get_settings.cache_clear()


def make_token(user_id: uuid.UUID) -> str:
    payload = {
        "sub": str(user_id),
        "aud": "authenticated",
        "role": "authenticated",
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(TEST_USER_ID)}"}


@pytest.fixture
def other_auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(OTHER_USER_ID)}"}


def _test_engine():
    return create_async_engine(get_settings().database_url, poolclass=NullPool)


@pytest_asyncio.fixture
async def db_available() -> bool:
    engine = _test_engine()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        await engine.dispose()


async def ensure_auth_user(session: AsyncSession, user_id: uuid.UUID, email: str) -> None:
    await session.execute(
        text(
            """
            INSERT INTO auth.users (
              instance_id, id, aud, role, email,
              encrypted_password, email_confirmed_at, created_at, updated_at
            )
            VALUES (
              '00000000-0000-0000-0000-000000000000',
              :id, 'authenticated', 'authenticated', :email,
              '', now(), now(), now()
            )
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"id": str(user_id), "email": email},
    )
    await session.execute(
        text(
            """
            INSERT INTO public.profiles (id, email, display_name)
            VALUES (:id, :email, 'Test User')
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"id": str(user_id), "email": email},
    )


async def run_db(
    fn: Callable[[AsyncSession], Awaitable[None]],
) -> None:
    engine = _test_engine()
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await fn(session)
        await session.commit()
    await engine.dispose()


@pytest_asyncio.fixture
async def seeded_user(db_available: bool) -> uuid.UUID:
    if not db_available:
        pytest.skip("Local Supabase database is not available")

    async def setup(session: AsyncSession) -> None:
        await ensure_auth_user(session, TEST_USER_ID, "test-user@example.com")
        await ensure_auth_user(session, OTHER_USER_ID, "other-user@example.com")

    await run_db(setup)
    return TEST_USER_ID


@pytest_asyncio.fixture
async def clean_goals(db_available: bool, seeded_user: uuid.UUID) -> AsyncGenerator[None, None]:
    if not db_available:
        pytest.skip("Local Supabase database is not available")

    async def cleanup(session: AsyncSession) -> None:
        await session.execute(delete(GoalItem))
        await session.execute(delete(ChatMessage))
        await session.execute(delete(Goal))

    await run_db(cleanup)
    yield
    await run_db(cleanup)


@pytest_asyncio.fixture
async def client(db_available: bool) -> AsyncGenerator[AsyncClient, None]:
    if not db_available:
        pytest.skip("Local Supabase database is not available")

    engine = _test_engine()
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    import app.db.session as db_session_module

    original_factory = db_session_module.async_session_factory
    db_session_module.async_session_factory = session_factory
    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    db_session_module.async_session_factory = original_factory
    await engine.dispose()
