export interface UserListItem {
  id: string
  email: string
  name: string
  username: string | null
  auth_source: string
  is_org_admin: boolean
  is_superuser: boolean
  is_active: boolean
  team_names: string
  team_count: number
  created_at: string
}

export interface UserList {
  items: UserListItem[]
  total: number
}

export interface UserTeamMembership {
  team_id: string
  team_name: string
  role: string
  created_at: string
}

export interface UserDetail {
  id: string
  email: string
  name: string
  username: string | null
  auth_source: string
  is_org_admin: boolean
  is_superuser: boolean
  is_active: boolean
  created_at: string
  last_login_at: string | null
  team_memberships: UserTeamMembership[]
}

export type OrgRoleKey = "org_admin" | "org_member"

export type TeamRoleKey = "team_admin" | "member" | "viewer"
