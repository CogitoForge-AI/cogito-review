from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

import asyncpg


@dataclass(frozen=True, slots=True)
class UserRow:
    id: UUID
    oidc_sub: str
    email: str
    name: str
    is_org_admin: bool
    auth_source: str
    username: str | None
    is_superuser: bool
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class UserListRow:
    id: UUID
    oidc_sub: str
    email: str
    name: str
    is_org_admin: bool
    auth_source: str
    username: str | None
    is_superuser: bool
    is_active: bool
    team_names: str
    team_count: int
    created_at: datetime


@dataclass(frozen=True, slots=True)
class LocalUserCredentials:
    id: UUID
    username: str
    password_hash: str
    is_superuser: bool
    is_org_admin: bool


@dataclass(frozen=True, slots=True)
class UserListFilters:
    search: str = ""
    auth_source: str | None = None
    org_role: str | None = None
    status: str | None = None
    team_id: UUID | None = None


_USER_SELECT = """
    id, oidc_sub, email, name, is_org_admin,
    auth_source, username, is_superuser, is_active, last_login_at, created_at
"""


_USER_LIST_SELECT = """
    u.id, u.oidc_sub, u.email, u.name, u.is_org_admin,
    u.auth_source, u.username, u.is_superuser, u.is_active, u.created_at,
    COALESCE(
        (
            SELECT string_agg(t.name, ', ' ORDER BY t.name)
            FROM team_members tm
            JOIN teams t ON t.id = tm.team_id
            WHERE tm.user_id = u.id
        ),
        ''
    ) AS team_names,
    COALESCE(
        (
            SELECT COUNT(*)::int
            FROM team_members tm
            WHERE tm.user_id = u.id
        ),
        0
    ) AS team_count
"""


def _list_where_clause(filters: UserListFilters) -> tuple[str, list[object]]:
    conditions: list[str] = []
    params: list[object] = []
    index = 1

    if filters.search:
        pattern = f"%{filters.search}%"
        conditions.append(
            f"(u.email ILIKE ${index} OR u.name ILIKE ${index} "
            f"OR COALESCE(u.username, '') ILIKE ${index})"
        )
        params.append(pattern)
        index += 1

    if filters.auth_source:
        conditions.append(f"u.auth_source = ${index}")
        params.append(filters.auth_source)
        index += 1

    if filters.org_role == "org_admin":
        conditions.append("u.is_org_admin = true")
    elif filters.org_role == "org_member":
        conditions.append("u.is_org_admin = false")

    if filters.status == "active":
        conditions.append("u.is_active = true")
    elif filters.status == "deactivated":
        conditions.append("u.is_active = false")

    if filters.team_id is not None:
        conditions.append(
            f"EXISTS (SELECT 1 FROM team_members tm "
            f"WHERE tm.user_id = u.id AND tm.team_id = ${index})"
        )
        params.append(filters.team_id)
        index += 1

    if not conditions:
        return "", params
    return " WHERE " + " AND ".join(conditions), params


class UserRepository:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn

    async def get(self, user_id: UUID) -> UserRow | None:
        row = await self._conn.fetchrow(
            f"""
            SELECT {_USER_SELECT}
            FROM users WHERE id = $1
            """,
            user_id,
        )
        return _row_to_user(row) if row else None

    async def get_by_oidc_sub(self, oidc_sub: str) -> UserRow | None:
        row = await self._conn.fetchrow(
            f"""
            SELECT {_USER_SELECT}
            FROM users WHERE oidc_sub = $1
            """,
            oidc_sub,
        )
        return _row_to_user(row) if row else None

    async def get_local_by_username(self, username: str) -> LocalUserCredentials | None:
        row = await self._conn.fetchrow(
            """
            SELECT id, username, password_hash, is_superuser, is_org_admin
            FROM users
            WHERE auth_source = 'local'
              AND username = $1
            """,
            username.strip().lower(),
        )
        if row is None or not row["password_hash"]:
            return None
        return LocalUserCredentials(
            id=row["id"],
            username=row["username"],
            password_hash=row["password_hash"],
            is_superuser=row["is_superuser"],
            is_org_admin=row["is_org_admin"],
        )

    async def has_local_superuser(self) -> bool:
        val = await self._conn.fetchval(
            """
            SELECT 1 FROM users
            WHERE auth_source = 'local' AND is_superuser = true
            LIMIT 1
            """
        )
        return val is not None

    async def list_all(self) -> list[UserRow]:
        rows = await self._conn.fetch(
            f"""
            SELECT {_USER_SELECT}
            FROM users
            ORDER BY email ASC
            """
        )
        return [_row_to_user(row) for row in rows]

    async def list_paginated(
        self,
        *,
        filters: UserListFilters,
        limit: int,
        offset: int,
    ) -> list[UserListRow]:
        where_sql, params = _list_where_clause(filters)
        limit_index = len(params) + 1
        offset_index = len(params) + 2
        rows = await self._conn.fetch(
            f"""
            SELECT {_USER_LIST_SELECT}
            FROM users u
            {where_sql}
            ORDER BY u.email ASC
            LIMIT ${limit_index} OFFSET ${offset_index}
            """,
            *params,
            limit,
            offset,
        )
        return [_row_to_list_user(row) for row in rows]

    async def count(self, *, filters: UserListFilters) -> int:
        where_sql, params = _list_where_clause(filters)
        return await self._conn.fetchval(
            f"SELECT COUNT(*)::int FROM users u {where_sql}",
            *params,
        )

    async def count_org_admins(self) -> int:
        return await self._conn.fetchval(
            "SELECT COUNT(*)::int FROM users WHERE is_org_admin = true"
        )

    async def count_active_org_admins(self) -> int:
        return await self._conn.fetchval(
            """
            SELECT COUNT(*)::int FROM users
            WHERE is_org_admin = true AND is_active = true
            """
        )

    async def record_login(self, user_id: UUID) -> None:
        await self._conn.execute(
            "UPDATE users SET last_login_at = now() WHERE id = $1",
            user_id,
        )

    async def set_active(self, user_id: UUID, *, is_active: bool) -> UserRow | None:
        row = await self._conn.fetchrow(
            f"""
            UPDATE users SET is_active = $2
            WHERE id = $1
            RETURNING {_USER_SELECT}
            """,
            user_id,
            is_active,
        )
        return _row_to_user(row) if row else None

    async def create_local_superuser(
        self,
        *,
        username: str,
        password_hash: str,
        email: str,
        name: str,
    ) -> UserRow:
        external_id = f"local:{username}"
        row = await self._conn.fetchrow(
            f"""
            INSERT INTO users (
                oidc_sub, email, name, is_org_admin,
                auth_source, username, password_hash, is_superuser
            )
            VALUES ($1, $2, $3, true, 'local', $4, $5, true)
            RETURNING {_USER_SELECT}
            """,
            external_id,
            email,
            name,
            username,
            password_hash,
        )
        if row is None:
            msg = "failed to create local superuser"
            raise RuntimeError(msg)
        user = _row_to_user(row)
        from app.rbac.catalog import RoleKey
        from app.rbac.repositories import RbacRepository

        rbac = RbacRepository(self._conn)
        await rbac.set_organization_role(user.id, RoleKey.ORG_ADMIN)
        return await self.get(user.id) or user

    async def upsert_external_user(
        self,
        *,
        external_id: str,
        email: str,
        name: str,
        is_org_admin: bool = False,
    ) -> UserRow:
        row = await self._conn.fetchrow(
            f"""
            INSERT INTO users (oidc_sub, email, name, is_org_admin, auth_source)
            VALUES ($1, $2, $3, $4, 'sso')
            ON CONFLICT (oidc_sub) DO UPDATE
            SET email = EXCLUDED.email,
                name = CASE
                    WHEN EXCLUDED.name <> '' THEN EXCLUDED.name
                    ELSE users.name
                END
            RETURNING {_USER_SELECT}
            """,
            external_id,
            email,
            name,
            is_org_admin,
        )
        if row is None:
            msg = "failed to upsert user"
            raise RuntimeError(msg)
        user = _row_to_user(row)
        from app.rbac.catalog import RoleKey
        from app.rbac.repositories import RbacRepository

        rbac = RbacRepository(self._conn)
        existing_roles = await rbac.get_organization_roles_for_user(user.id)
        if not existing_roles:
            role = RoleKey.ORG_ADMIN if is_org_admin else RoleKey.ORG_MEMBER
            await rbac.set_organization_role(user.id, role)
        return user

    async def upsert_oidc_user(
        self,
        *,
        oidc_sub: str,
        email: str,
        name: str,
        is_org_admin: bool = False,
    ) -> UserRow:
        return await self.upsert_external_user(
            external_id=oidc_sub,
            email=email,
            name=name,
            is_org_admin=is_org_admin,
        )

    async def set_org_admin(
        self, user_id: UUID, *, is_org_admin: bool
    ) -> UserRow | None:
        from app.rbac.catalog import RoleKey
        from app.rbac.repositories import RbacRepository

        await RbacRepository(self._conn).set_organization_role(
            user_id,
            RoleKey.ORG_ADMIN if is_org_admin else RoleKey.ORG_MEMBER,
        )
        return await self.get(user_id)


def _row_to_list_user(row: asyncpg.Record) -> UserListRow:
    return UserListRow(
        id=row["id"],
        oidc_sub=row["oidc_sub"],
        email=row["email"],
        name=row["name"],
        is_org_admin=row["is_org_admin"],
        auth_source=row.get("auth_source", "sso"),
        username=row.get("username"),
        is_superuser=row.get("is_superuser", False),
        is_active=row.get("is_active", True),
        team_names=row.get("team_names") or "",
        team_count=row.get("team_count") or 0,
        created_at=row["created_at"],
    )


def _row_to_user(row: asyncpg.Record) -> UserRow:
    return UserRow(
        id=row["id"],
        oidc_sub=row["oidc_sub"],
        email=row["email"],
        name=row["name"],
        is_org_admin=row["is_org_admin"],
        auth_source=row.get("auth_source", "sso"),
        username=row.get("username"),
        is_superuser=row.get("is_superuser", False),
        is_active=row.get("is_active", True),
        last_login_at=row.get("last_login_at"),
        created_at=row["created_at"],
    )
