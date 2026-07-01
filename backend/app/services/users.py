from uuid import UUID

from fastapi import HTTPException, status

from app.auth.session import revoke_all_sessions_for_user
from app.rbac.catalog import RoleKey
from app.rbac.repositories import RbacRepository
from app.repositories.team_members import TeamMemberRepository
from app.repositories.users import UserListFilters, UserRepository, UserRow
from app.schemas.user import (
    UserDetailResponse,
    UserListItemResponse,
    UserListResponse,
    UserTeamMembershipResponse,
)
from app.services.audit import log_audit_event


class UserManagementError(ValueError):
    pass


async def list_users_paginated(
    conn,
    *,
    search: str | None,
    auth_source: str | None,
    org_role: str | None,
    status: str | None,
    team_id: UUID | None,
    limit: int,
    offset: int,
) -> UserListResponse:
    repo = UserRepository(conn)
    filters = UserListFilters(
        search=(search or "").strip(),
        auth_source=auth_source,
        org_role=org_role,
        status=status,
        team_id=team_id,
    )
    rows = await repo.list_paginated(filters=filters, limit=limit, offset=offset)
    total = await repo.count(filters=filters)
    return UserListResponse(
        items=[
            UserListItemResponse(
                id=row.id,
                email=row.email,
                name=row.name,
                username=row.username,
                auth_source=row.auth_source,
                is_org_admin=row.is_org_admin,
                is_superuser=row.is_superuser,
                is_active=row.is_active,
                team_names=row.team_names,
                team_count=row.team_count,
                created_at=row.created_at,
            )
            for row in rows
        ],
        total=total,
    )


async def get_user_detail(conn, user_id: UUID) -> UserDetailResponse | None:
    repo = UserRepository(conn)
    user = await repo.get(user_id)
    if user is None:
        return None
    memberships = await TeamMemberRepository(conn).list_for_user(user_id)
    return UserDetailResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        username=user.username,
        auth_source=user.auth_source,
        is_org_admin=user.is_org_admin,
        is_superuser=user.is_superuser,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        team_memberships=[
            UserTeamMembershipResponse(
                team_id=membership.team_id,
                team_name=membership.team_name,
                role=membership.role,
                created_at=membership.created_at,
            )
            for membership in memberships
        ],
    )


async def update_organization_role(
    conn,
    *,
    actor: UserRow,
    user_id: UUID,
    role_key: str,
) -> UserRow:
    repo = UserRepository(conn)
    user = await repo.get(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    role = RoleKey(role_key)
    if user.is_superuser and role != RoleKey.ORG_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote superuser",
        )

    if role == RoleKey.ORG_MEMBER and user.is_org_admin and user.is_active:
        active_admins = await repo.count_active_org_admins()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active organization admin",
            )
        if actor.id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove your own organization admin access",
            )

    rbac = RbacRepository(conn)
    before_roles = await rbac.get_organization_roles_for_user(user_id)
    await rbac.set_organization_role(user_id, role)
    await log_audit_event(
        conn,
        actor_user_id=actor.id,
        event_type="organization_role.changed",
        target_type="user",
        target_id=str(user_id),
        before_state={"roles": [r.role_key for r in before_roles]},
        after_state={"role": role_key},
    )
    refreshed = await repo.get(user_id)
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return refreshed


async def deactivate_user(
    conn,
    *,
    actor: UserRow,
    user_id: UUID,
) -> UserRow:
    repo = UserRepository(conn)
    user = await repo.get(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already deactivated",
        )
    if user.is_org_admin:
        active_admins = await repo.count_active_org_admins()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active organization admin",
            )

    updated = await repo.set_active(user_id, is_active=False)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    await revoke_all_sessions_for_user(user_id)
    await log_audit_event(
        conn,
        actor_user_id=actor.id,
        event_type="user.deactivated",
        target_type="user",
        target_id=str(user_id),
        before_state={"is_active": True},
        after_state={"is_active": False},
    )
    return updated


async def reactivate_user(
    conn,
    *,
    actor: UserRow,
    user_id: UUID,
) -> UserRow:
    repo = UserRepository(conn)
    user = await repo.get(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active",
        )

    updated = await repo.set_active(user_id, is_active=True)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    await log_audit_event(
        conn,
        actor_user_id=actor.id,
        event_type="user.reactivated",
        target_type="user",
        target_id=str(user_id),
        before_state={"is_active": False},
        after_state={"is_active": True},
    )
    return updated


def assert_user_can_login(user: UserRow) -> None:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account deactivated",
        )
