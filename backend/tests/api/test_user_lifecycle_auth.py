from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.dependencies import SESSION_COOKIE
from app.dependencies import get_conn
from app.main import create_app
from tests.conftest import make_dev_user


@pytest.mark.asyncio
async def test_local_login_blocked_for_deactivated_user() -> None:
    app = create_app()
    mock_conn = AsyncMock()
    user = make_dev_user(is_active=False)

    async def override_get_conn():
        yield mock_conn

    app.dependency_overrides[get_conn] = override_get_conn

    transport = ASGITransport(app=app)
    with patch(
        "app.api.v1.auth.authenticate_local_user",
        new_callable=AsyncMock,
        return_value=user,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/local/login",
                json={"username": "admin", "password": "secret"},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 401
    assert response.json()["detail"] == "Account deactivated"


@pytest.mark.asyncio
async def test_get_current_user_rejects_deactivated_session_user() -> None:
    app = create_app()
    mock_conn = AsyncMock()
    user = make_dev_user(is_active=False)
    session_id = "test-session"

    async def override_get_conn():
        yield mock_conn

    app.dependency_overrides[get_conn] = override_get_conn

    transport = ASGITransport(app=app)
    with (
        patch(
            "app.auth.dependencies.get_session_user_id",
            new_callable=AsyncMock,
            return_value=user.id,
        ),
        patch(
            "app.auth.dependencies.UserRepository",
        ) as repo_cls,
    ):
        repo_cls.return_value.get = AsyncMock(return_value=user)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/me",
                cookies={SESSION_COOKIE: session_id},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 401
