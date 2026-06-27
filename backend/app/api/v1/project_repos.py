from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.pagination import PaginationParams
from app.auth.dependencies import require_team_member
from app.dependencies import get_conn
from app.schemas.repo_integration import (
    RepoIntegrationCreate,
    RepoIntegrationListResponse,
    RepoIntegrationResponse,
    RepoIntegrationUpdate,
)
from app.services.projects import get_project
from app.services.repo_integrations import (
    create_repo_integration,
    delete_repo_integration,
    get_repo_integration,
    list_repo_integrations_for_project_paginated,
    update_repo_integration,
)

router = APIRouter()


async def _assert_project_in_team(
    conn: asyncpg.Connection,
    team_id: UUID,
    project_id: UUID,
) -> None:
    try:
        project = await get_project(conn, project_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if project.team_id != team_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.get("", response_model=RepoIntegrationListResponse)
async def get_repos(
    team_id: UUID,
    project_id: UUID,
    q: str | None = Query(None, max_length=200),
    enabled: bool | None = Query(None),
    pagination: PaginationParams = Depends(),
    conn: asyncpg.Connection = Depends(get_conn),
    _user=Depends(require_team_member),
) -> RepoIntegrationListResponse:
    await _assert_project_in_team(conn, team_id, project_id)
    try:
        return await list_repo_integrations_for_project_paginated(
            conn,
            project_id,
            search=q,
            enabled=enabled,
            limit=pagination.limit,
            offset=pagination.offset,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.post(
    "",
    response_model=RepoIntegrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_repo(
    team_id: UUID,
    project_id: UUID,
    payload: RepoIntegrationCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _user=Depends(require_team_member),
) -> RepoIntegrationResponse:
    await _assert_project_in_team(conn, team_id, project_id)
    try:
        return await create_repo_integration(conn, project_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{integration_id}", response_model=RepoIntegrationResponse)
async def get_repo(
    team_id: UUID,
    project_id: UUID,
    integration_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _user=Depends(require_team_member),
) -> RepoIntegrationResponse:
    await _assert_project_in_team(conn, team_id, project_id)
    try:
        row = await get_repo_integration(conn, integration_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return row


@router.put("/{integration_id}", response_model=RepoIntegrationResponse)
async def put_repo(
    team_id: UUID,
    project_id: UUID,
    integration_id: UUID,
    payload: RepoIntegrationUpdate,
    conn: asyncpg.Connection = Depends(get_conn),
    _user=Depends(require_team_member),
) -> RepoIntegrationResponse:
    await _assert_project_in_team(conn, team_id, project_id)
    try:
        row = await get_repo_integration(conn, integration_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    try:
        return await update_repo_integration(conn, integration_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repo(
    team_id: UUID,
    project_id: UUID,
    integration_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _user=Depends(require_team_member),
) -> None:
    await _assert_project_in_team(conn, team_id, project_id)
    try:
        row = await get_repo_integration(conn, integration_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    await delete_repo_integration(conn, integration_id)
