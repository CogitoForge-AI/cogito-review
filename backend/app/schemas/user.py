from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.pagination import PaginatedResponse


class UserListItemResponse(BaseModel):
    id: UUID
    email: str
    name: str
    username: str | None
    auth_source: str
    is_org_admin: bool
    is_superuser: bool
    is_active: bool
    team_names: str
    team_count: int
    created_at: datetime


class UserListResponse(PaginatedResponse[UserListItemResponse]):
    pass


class UserTeamMembershipResponse(BaseModel):
    team_id: UUID
    team_name: str
    role: str
    created_at: datetime


class UserDetailResponse(BaseModel):
    id: UUID
    email: str
    name: str
    username: str | None
    auth_source: str
    is_org_admin: bool
    is_superuser: bool
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None
    team_memberships: list[UserTeamMembershipResponse]
