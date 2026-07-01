from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.dependencies import get_current_user
from app.dependencies import get_conn
from app.main import create_app
from tests.conftest import make_dev_user


@pytest.fixture
async def team_client():
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
        "app.api.v1.teams.require_permission",
        side_effect=mock_require_permission,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, mock_conn


@pytest.mark.asyncio
async def test_put_team_member_role(team_client) -> None:
    client, _mock_conn = team_client
    team_id = uuid4()
    user_id = uuid4()

    with patch(
        "app.api.v1.teams.update_team_member_role",
        new_callable=AsyncMock,
    ) as update_role:
        from datetime import UTC, datetime

        from app.schemas.team import TeamMemberResponse

        now = datetime.now(tz=UTC)
        update_role.return_value = TeamMemberResponse(
            team_id=team_id,
            user_id=user_id,
            role="viewer",
            user_email="user@example.com",
            user_name="User",
            created_at=now,
        )
        response = await client.put(
            f"/api/v1/teams/{team_id}/members/{user_id}",
            json={"role": "viewer"},
        )

    assert response.status_code == 200
    assert response.json()["role"] == "viewer"


@pytest.mark.asyncio
async def test_delete_team_member_last_admin_blocked(team_client) -> None:
    client, _mock_conn = team_client
    team_id = uuid4()
    user_id = uuid4()

    with patch(
        "app.api.v1.teams.remove_team_member",
        new_callable=AsyncMock,
        side_effect=ValueError("Cannot remove the last team administrator"),
    ):
        response = await client.delete(
            f"/api/v1/teams/{team_id}/members/{user_id}",
        )

    assert response.status_code == 400
