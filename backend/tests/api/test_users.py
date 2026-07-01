from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.dependencies import get_current_user
from app.dependencies import get_conn
from app.main import create_app
from tests.conftest import make_dev_user


@pytest.fixture
async def app_client():
    app = create_app()
    mock_conn = AsyncMock()
    admin = make_dev_user(is_org_admin=True)

    async def override_get_conn():
        yield mock_conn

    async def mock_require_permission(user, conn, action, *, team_id=None):
        if user.is_org_admin:
            return user
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Permission denied")

    app.dependency_overrides[get_conn] = override_get_conn
    app.dependency_overrides[get_current_user] = lambda: admin

    transport = ASGITransport(app=app)
    with patch(
        "app.auth.dependencies.require_permission",
        side_effect=mock_require_permission,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, mock_conn, admin
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_users_paginated(app_client) -> None:
    client, _mock_conn, _admin = app_client
    user_id = uuid4()

    with patch(
        "app.api.v1.users.list_users_paginated",
        new_callable=AsyncMock,
    ) as list_users:
        from datetime import UTC, datetime

        from app.schemas.user import UserListItemResponse, UserListResponse

        now = datetime.now(tz=UTC)
        list_users.return_value = UserListResponse(
            items=[
                UserListItemResponse(
                    id=user_id,
                    email="admin@example.com",
                    name="Admin",
                    username="admin",
                    auth_source="local",
                    is_org_admin=True,
                    is_superuser=True,
                    is_active=True,
                    team_names="Default Team",
                    team_count=1,
                    created_at=now,
                )
            ],
            total=1,
        )
        response = await client.get("/api/v1/users?limit=20&offset=0")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["email"] == "admin@example.com"
    assert body["items"][0]["is_active"] is True
    assert body["items"][0]["team_count"] == 1


@pytest.mark.asyncio
async def test_list_users_forbidden_for_non_admin() -> None:
    app = create_app()
    mock_conn = AsyncMock()
    member = make_dev_user(is_org_admin=False)

    async def override_get_conn():
        yield mock_conn

    async def mock_require_permission(user, conn, action, *, team_id=None):
        if user.is_org_admin:
            return user
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Permission denied")

    app.dependency_overrides[get_conn] = override_get_conn
    app.dependency_overrides[get_current_user] = lambda: member

    transport = ASGITransport(app=app)
    with patch(
        "app.auth.dependencies.require_permission",
        side_effect=mock_require_permission,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/users")

    app.dependency_overrides.clear()
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_user_detail(app_client) -> None:
    client, _mock_conn, _admin = app_client
    user_id = uuid4()

    with patch(
        "app.api.v1.users.get_user_detail",
        new_callable=AsyncMock,
    ) as get_detail:
        from datetime import UTC, datetime

        from app.schemas.user import UserDetailResponse, UserTeamMembershipResponse

        now = datetime.now(tz=UTC)
        team_id = uuid4()
        get_detail.return_value = UserDetailResponse(
            id=user_id,
            email="user@example.com",
            name="User",
            username=None,
            auth_source="sso",
            is_org_admin=False,
            is_superuser=False,
            is_active=True,
            created_at=now,
            last_login_at=now,
            team_memberships=[
                UserTeamMembershipResponse(
                    team_id=team_id,
                    team_name="Default Team",
                    role="member",
                    created_at=now,
                )
            ],
        )
        response = await client.get(f"/api/v1/users/{user_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "user@example.com"
    assert len(body["team_memberships"]) == 1


@pytest.mark.asyncio
async def test_get_user_detail_not_found(app_client) -> None:
    client, _mock_conn, _admin = app_client
    user_id = uuid4()

    with patch(
        "app.api.v1.users.get_user_detail",
        new_callable=AsyncMock,
        return_value=None,
    ):
        response = await client.get(f"/api/v1/users/{user_id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_organization_role_delegates_to_service(app_client) -> None:
    client, _mock_conn, admin = app_client
    user_id = uuid4()

    with patch(
        "app.api.v1.users.update_organization_role",
        new_callable=AsyncMock,
    ) as update_role:
        target = make_dev_user(id=user_id, is_org_admin=True)
        update_role.return_value = target
        response = await client.put(
            f"/api/v1/users/{user_id}/organization-role",
            json={"role_key": "org_member"},
        )

    assert response.status_code == 200
    update_role.assert_awaited_once()
    assert update_role.await_args.kwargs["actor"].id == admin.id


@pytest.mark.asyncio
async def test_deactivate_user_route(app_client) -> None:
    client, _mock_conn, admin = app_client
    user_id = uuid4()

    with patch(
        "app.api.v1.users.deactivate_user",
        new_callable=AsyncMock,
    ) as deactivate:
        target = make_dev_user(id=user_id, is_org_admin=False, is_active=False)
        deactivate.return_value = target
        response = await client.post(f"/api/v1/users/{user_id}/deactivate")

    assert response.status_code == 200
    deactivate.assert_awaited_once()
    assert deactivate.await_args.kwargs["actor"].id == admin.id


@pytest.mark.asyncio
async def test_reactivate_user_route(app_client) -> None:
    client, _mock_conn, _admin = app_client
    user_id = uuid4()

    with patch(
        "app.api.v1.users.reactivate_user",
        new_callable=AsyncMock,
    ) as reactivate:
        target = make_dev_user(id=user_id, is_active=True)
        reactivate.return_value = target
        response = await client.post(f"/api/v1/users/{user_id}/reactivate")

    assert response.status_code == 200
    reactivate.assert_awaited_once()
