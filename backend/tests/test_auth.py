import pytest_asyncio

from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from api.main import app
from api.security import hash_password
from database.config import settings
from database.database import get_db
from database.models import User, UserRole


TEST_USERNAME = "test_auth_user"
TEST_PASSWORD = "super-secret-123"


_test_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

_TestingSession = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def _override_get_db():
    async with _TestingSession() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(scope="session", autouse=True)
async def test_user():
    """Create a test user before the session, remove it afterwards."""
    async with _TestingSession() as session:
        await session.execute(delete(User).where(User.username == TEST_USERNAME))
        await session.commit()

        user = User(
            username=TEST_USERNAME,
            email="test_auth@example.com",
            hashed_password=hash_password(TEST_PASSWORD),
            role=UserRole.RESIDENT,
        )
        session.add(user)
        await session.commit()

    yield

    async with _TestingSession() as session:
        await session.execute(delete(User).where(User.username == TEST_USERNAME))
        await session.commit()

    await _test_engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _login(client: AsyncClient, username: str, password: str):
    return await client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_login_success_returns_token():
    """Correct credentials → 200 with a JWT access_token."""
    async with _client() as client:
        response = await _login(client, TEST_USERNAME, TEST_PASSWORD)

    assert response.status_code == 200, response.text
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 10


async def test_login_wrong_password_returns_401():
    """Wrong password → 401 Unauthorized."""
    async with _client() as client:
        response = await _login(client, TEST_USERNAME, "wrong-password")

    assert response.status_code == 401


async def test_login_nonexistent_user_returns_401():
    """Non-existent username → 401 (not 500, not username enumeration)."""
    async with _client() as client:
        response = await _login(client, "ghost_user_xyz_404", TEST_PASSWORD)

    assert response.status_code == 401


async def test_protected_endpoint_without_token_returns_401():
    """GET /api/users/me without a token → 401 Unauthorized."""
    async with _client() as client:
        response = await client.get("/api/users/me")

    assert response.status_code == 401


async def test_protected_endpoint_with_valid_token_returns_200():
    """GET /api/users/me with a valid token → 200 with user data."""
    async with _client() as client:
        login_response = await _login(client, TEST_USERNAME, TEST_PASSWORD)
        assert login_response.status_code == 200, login_response.text
        token = login_response.json()["access_token"]

        response = await client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["username"] == TEST_USERNAME
    assert "hashed_password" not in body  # passwords must never leak
