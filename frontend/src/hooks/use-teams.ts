import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/api/client"
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  Team,
  TeamCreate,
  TeamMember,
  TeamMemberCreate,
  TeamRepository,
  OrgRepository,
  TeamUpdate,
} from "@/api/team-types"
import type { User } from "@/api/auth-types"
import type { PaginatedList } from "@/lib/pagination"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useQuery } from "@tanstack/react-query"

const OPTIONS_PAGE_SIZE = 100

export function useTeamsPage(params: { page: number; q?: string }) {
  const query = params.q?.trim() ?? ""
  return usePaginatedList<Team>({
    queryKey: ["teams", query],
    path: "/teams",
    page: params.page,
    filters: query ? { q: query } : undefined,
  })
}

export function useTeams() {
  return usePaginatedList<Team>({
    queryKey: ["teams", "options"],
    path: "/teams",
    page: 1,
    pageSize: OPTIONS_PAGE_SIZE,
  })
}

export function useTeamMembersPage(
  teamId: string,
  params: { page: number; q?: string },
) {
  const query = params.q?.trim() ?? ""
  return usePaginatedList<TeamMember>({
    queryKey: ["teams", teamId, "members", query],
    path: `/teams/${teamId}/members`,
    page: params.page,
    filters: query ? { q: query } : undefined,
    enabled: Boolean(teamId),
  })
}

export function useTeamRepositoriesPage(
  teamId: string,
  params: { page: number; q?: string },
) {
  const query = params.q?.trim() ?? ""
  return usePaginatedList<TeamRepository>({
    queryKey: ["teams", teamId, "repositories", query],
    path: `/teams/${teamId}/repositories`,
    page: params.page,
    filters: query ? { q: query } : undefined,
    enabled: Boolean(teamId),
  })
}

export function useOrgRepositoriesPage(params: {
  page: number
  q?: string
  team_id?: string[]
  enabled?: "all" | "enabled" | "disabled"
  git_provider?: string
}) {
  const query = params.q?.trim() ?? ""
  const filters: Record<string, string | string[] | undefined> = {}
  if (query) filters.q = query
  if (params.team_id?.length) filters.team_id = params.team_id
  if (params.enabled === "enabled") filters.enabled = "true"
  if (params.enabled === "disabled") filters.enabled = "false"
  if (params.git_provider && params.git_provider !== "all") {
    filters.git_provider = params.git_provider
  }
  return usePaginatedList<OrgRepository>({
    queryKey: ["repositories", filters],
    path: "/repositories",
    page: params.page,
    filters,
  })
}

export function useOrgRepositoriesOptions() {
  return usePaginatedList<OrgRepository>({
    queryKey: ["repositories", "options"],
    path: "/repositories",
    page: 1,
    pageSize: OPTIONS_PAGE_SIZE,
  })
}

export function useProjects(teamId: string) {
  return usePaginatedList<Project>({
    queryKey: ["teams", teamId, "projects", "options"],
    path: `/teams/${teamId}/projects`,
    page: 1,
    pageSize: OPTIONS_PAGE_SIZE,
    enabled: Boolean(teamId),
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TeamCreate) =>
      api<Team>("/teams", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })
}

export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TeamUpdate) =>
      api<Team>(`/teams/${teamId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })
}

export function useDeleteTeam(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>(`/teams/${teamId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })
}

export function useProject(teamId: string, projectId: string) {
  return useQuery({
    queryKey: ["teams", teamId, "projects", projectId],
    queryFn: () => api<Project>(`/teams/${teamId}/projects/${projectId}`),
    enabled: Boolean(teamId) && Boolean(projectId),
  })
}

export function useCreateProject(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProjectCreate) =>
      api<Project>(`/teams/${teamId}/projects`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "projects"] })
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "repositories"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })
}

export function useUpdateProject(teamId: string, projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProjectUpdate) =>
      api<Project>(`/teams/${teamId}/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "projects"] })
      queryClient.invalidateQueries({
        queryKey: ["teams", teamId, "projects", projectId],
      })
    },
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ["auth", "users"],
    queryFn: () => api<User[]>("/auth/users"),
  })
}

export function useAddTeamMember(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TeamMemberCreate) =>
      api<TeamMember>(`/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "members"] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })
}

export function useRemoveTeamMember(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api<void>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "members"] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })
}

export type { PaginatedList }
