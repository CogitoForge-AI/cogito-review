import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/api/client"
import type {
  OrgRoleKey,
  UserDetail,
  UserList,
  UserListItem,
} from "@/api/user-types"
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination"
import { usePaginatedList } from "@/hooks/use-paginated-list"

export { DEFAULT_PAGE_SIZE as PAGE_SIZE }

export type UsersListFilters = {
  q?: string
  auth_source?: "sso" | "local"
  org_role?: OrgRoleKey
  status?: "active" | "deactivated"
  team_id?: string
}

export function useUsersPage(params: {
  page: number
  q?: string
  auth_source?: "sso" | "local" | "all"
  org_role?: OrgRoleKey | "all"
  status?: "active" | "deactivated" | "all"
  team_id?: string
}) {
  const query = params.q?.trim() ?? ""
  const filters: Record<string, string> = {}
  if (query) filters.q = query
  if (params.auth_source && params.auth_source !== "all") {
    filters.auth_source = params.auth_source
  }
  if (params.org_role && params.org_role !== "all") {
    filters.org_role = params.org_role
  }
  if (params.status && params.status !== "all") {
    filters.status = params.status
  }
  if (params.team_id) {
    filters.team_id = params.team_id
  }
  return usePaginatedList<UserListItem>({
    queryKey: ["users", filters],
    path: "/users",
    page: params.page,
    filters: Object.keys(filters).length ? filters : undefined,
  })
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => api<UserDetail>(`/users/${userId}`),
    enabled: Boolean(userId),
  })
}

export function useUpdateUserOrgRole(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (role_key: OrgRoleKey) =>
      api<{ id: string }>(`/users/${userId}/organization-role`, {
        method: "PUT",
        body: JSON.stringify({ role_key }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["users", userId] })
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
    },
  })
}

export function useDeactivateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<void>(`/users/${userId}/deactivate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["users", userId] })
    },
  })
}

export function useReactivateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<void>(`/users/${userId}/reactivate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["users", userId] })
    },
  })
}

export type { UserList }
