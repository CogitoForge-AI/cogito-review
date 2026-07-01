from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services.users import (
    assert_user_can_login,
    deactivate_user,
    reactivate_user,
    update_organization_role,
)
from tests.conftest import make_dev_user


@pytest.mark.asyncio
async def test_assert_user_can_login_blocks_deactivated() -> None:
    user = make_dev_user(is_active=False)
    with pytest.raises(HTTPException) as exc:
        assert_user_can_login(user)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_update_organization_role_blocks_last_active_admin() -> None:
    conn = AsyncMock()
    actor = make_dev_user()
    target_id = uuid4()
    target = make_dev_user(id=target_id, is_org_admin=True, is_active=True)

    with (
        patch("app.services.users.UserRepository") as repo_cls,
        patch("app.services.users.RbacRepository"),
        patch("app.services.users.log_audit_event", new_callable=AsyncMock),
    ):
        repo = repo_cls.return_value
        repo.get = AsyncMock(return_value=target)
        repo.count_active_org_admins = AsyncMock(return_value=1)

        with pytest.raises(HTTPException) as exc:
            await update_organization_role(
                conn,
                actor=actor,
                user_id=target_id,
                role_key="org_member",
            )
    assert exc.value.status_code == 400
    assert "last active" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_update_organization_role_blocks_self_demotion() -> None:
    conn = AsyncMock()
    actor = make_dev_user(is_org_admin=True, is_active=True)
    target = actor

    with patch("app.services.users.UserRepository") as repo_cls:
        repo = repo_cls.return_value
        repo.get = AsyncMock(return_value=target)
        repo.count_active_org_admins = AsyncMock(return_value=2)

        with pytest.raises(HTTPException) as exc:
            await update_organization_role(
                conn,
                actor=actor,
                user_id=actor.id,
                role_key="org_member",
            )
    assert exc.value.status_code == 400
    assert "your own" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_deactivate_user_blocks_last_active_admin() -> None:
    conn = AsyncMock()
    actor = make_dev_user()
    target_id = uuid4()
    target = make_dev_user(id=target_id, is_org_admin=True, is_active=True)

    with patch("app.services.users.UserRepository") as repo_cls:
        repo = repo_cls.return_value
        repo.get = AsyncMock(return_value=target)
        repo.count_active_org_admins = AsyncMock(return_value=1)

        with pytest.raises(HTTPException) as exc:
            await deactivate_user(conn, actor=actor, user_id=target_id)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_deactivate_user_revokes_sessions() -> None:
    conn = AsyncMock()
    actor = make_dev_user()
    target_id = uuid4()
    target = make_dev_user(id=target_id, is_org_admin=False, is_active=True)
    updated = make_dev_user(id=target_id, is_active=False)

    with (
        patch("app.services.users.UserRepository") as repo_cls,
        patch(
            "app.services.users.revoke_all_sessions_for_user",
            new_callable=AsyncMock,
        ) as revoke,
        patch("app.services.users.log_audit_event", new_callable=AsyncMock),
    ):
        repo = repo_cls.return_value
        repo.get = AsyncMock(return_value=target)
        repo.set_active = AsyncMock(return_value=updated)

        result = await deactivate_user(conn, actor=actor, user_id=target_id)

    assert result.is_active is False
    revoke.assert_awaited_once_with(target_id)


@pytest.mark.asyncio
async def test_reactivate_user_sets_active() -> None:
    conn = AsyncMock()
    actor = make_dev_user()
    target_id = uuid4()
    target = make_dev_user(id=target_id, is_active=False)
    updated = make_dev_user(id=target_id, is_active=True)

    with (
        patch("app.services.users.UserRepository") as repo_cls,
        patch("app.services.users.log_audit_event", new_callable=AsyncMock),
    ):
        repo = repo_cls.return_value
        repo.get = AsyncMock(side_effect=[target, updated])
        repo.set_active = AsyncMock(return_value=updated)

        result = await reactivate_user(conn, actor=actor, user_id=target_id)

    assert result.is_active is True
