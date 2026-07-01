from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.pagination import PaginationParams
from app.auth.dependencies import require_org_action_dep
from app.dependencies import get_conn
from app.rbac.catalog import ActionKey
from app.repositories.users import UserRow
from app.schemas.auth import UserResponse
from app.schemas.user import UserDetailResponse, UserListResponse
from app.services.users import (
    deactivate_user,
    get_user_detail,
    list_users_paginated,
    reactivate_user,
    update_organization_role,
)

router = APIRouter()


class OrganizationRoleUpdate(BaseModel):
    role_key: str = Field(pattern="^(org_admin|org_member)$")


def _user_response(user: UserRow) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        is_org_admin=user.is_org_admin,
        created_at=user.created_at,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    q: str | None = Query(None, max_length=200),
    auth_source: str | None = Query(None, pattern="^(sso|local)$"),
    org_role: str | None = Query(None, pattern="^(org_admin|org_member)$"),
    status: str | None = Query(None, pattern="^(active|deactivated)$"),
    team_id: UUID | None = None,
    pagination: PaginationParams = Depends(),
    conn: asyncpg.Connection = Depends(get_conn),
    _user: UserRow = Depends(require_org_action_dep(ActionKey.USER_READ)),
) -> UserListResponse:
    return await list_users_paginated(
        conn,
        search=q,
        auth_source=auth_source,
        org_role=org_role,
        status=status,
        team_id=team_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _user: UserRow = Depends(require_org_action_dep(ActionKey.USER_READ)),
) -> UserDetailResponse:
    detail = await get_user_detail(conn, user_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return detail


@router.put("/{user_id}/organization-role", response_model=UserResponse)
async def update_organization_role_route(
    user_id: UUID,
    payload: OrganizationRoleUpdate,
    conn: asyncpg.Connection = Depends(get_conn),
    admin: UserRow = Depends(require_org_action_dep(ActionKey.USER_ASSIGN_ORG_ADMIN)),
) -> UserResponse:
    user = await update_organization_role(
        conn,
        actor=admin,
        user_id=user_id,
        role_key=payload.role_key,
    )
    return _user_response(user)


@router.post("/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user_route(
    user_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    admin: UserRow = Depends(require_org_action_dep(ActionKey.USER_DEACTIVATE)),
) -> UserResponse:
    user = await deactivate_user(conn, actor=admin, user_id=user_id)
    return _user_response(user)


@router.post("/{user_id}/reactivate", response_model=UserResponse)
async def reactivate_user_route(
    user_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    admin: UserRow = Depends(require_org_action_dep(ActionKey.USER_DEACTIVATE)),
) -> UserResponse:
    user = await reactivate_user(conn, actor=admin, user_id=user_id)
    return _user_response(user)
