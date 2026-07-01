import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { AppShell } from "@/components/layout/AppShell"
import { EmptyState } from "@/components/patterns/empty-state"
import { PaginatedListPanel } from "@/components/patterns/paginated-list-panel"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTeams } from "@/hooks/use-teams"
import { useUsersPage } from "@/hooks/use-users"
import { requireOrgPermission } from "@/lib/permissions"
import { parsePageSearch } from "@/lib/pagination"

type UsersSearch = {
  page: number
  q: string
  auth_source: "all" | "sso" | "local"
  org_role: "all" | "org_admin" | "org_member"
  status: "all" | "active" | "deactivated"
  team_id: string
}

function parseUsersSearch(search: Record<string, unknown>): UsersSearch {
  const base = parsePageSearch(search)
  const authSource = search.auth_source
  const orgRole = search.org_role
  const status = search.status
  const teamId = search.team_id
  return {
    ...base,
    auth_source:
      authSource === "sso" || authSource === "local" ? authSource : "all",
    org_role:
      orgRole === "org_admin" || orgRole === "org_member" ? orgRole : "all",
    status:
      status === "active" || status === "deactivated" ? status : "all",
    team_id: typeof teamId === "string" ? teamId : "",
  }
}

export const Route = createFileRoute("/users/")({
  beforeLoad: requireOrgPermission("user.read"),
  validateSearch: parseUsersSearch,
  component: UsersPage,
})

function authSourceLabel(authSource: string): string {
  return authSource === "local" ? "Local" : "SSO"
}

function UserSearchInput({
  q,
  onQueryChange,
}: {
  q: string
  onQueryChange: (value: string) => void
}) {
  const [searchInput, setSearchInput] = useState(q)

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === q) {
      return
    }
    const timeout = window.setTimeout(() => {
      onQueryChange(trimmed)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput, q, onQueryChange])

  return (
    <Input
      value={searchInput}
      onChange={(event) => setSearchInput(event.target.value)}
      placeholder="Search email, name, username…"
      className="max-w-md"
    />
  )
}

function UsersPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { page, q, auth_source, org_role, status, team_id } = search
  const users = useUsersPage({
    page,
    q,
    auth_source,
    org_role,
    status,
    team_id: team_id || undefined,
  })
  const teams = useTeams()

  const total = users.data?.total ?? 0

  const description =
    total === 0
      ? "No users"
      : q.trim()
        ? `${total} user${total === 1 ? "" : "s"} matching filters`
        : `${total} user${total === 1 ? "" : "s"}`

  function updateSearch(patch: Partial<UsersSearch>) {
    void navigate({
      search: { ...search, page: 1, ...patch },
      replace: true,
    })
  }

  function goToPage(nextPage: number) {
    void navigate({ search: { ...search, page: nextPage } })
  }

  return (
    <AppShell title="Users" description={description}>
      <div className="border-border/70 bg-muted/20 mb-4 flex flex-col gap-3 rounded-lg border p-3">
        <UserSearchInput
          key={q}
          q={q}
          onQueryChange={(trimmed) => updateSearch({ q: trimmed })}
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={auth_source}
            onValueChange={(value) =>
              updateSearch({
                auth_source: value as UsersSearch["auth_source"],
              })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Auth source" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All auth</SelectItem>
                <SelectItem value="sso">SSO</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={org_role}
            onValueChange={(value) =>
              updateSearch({ org_role: value as UsersSearch["org_role"] })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Org role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All org roles</SelectItem>
                <SelectItem value="org_admin">Org admin</SelectItem>
                <SelectItem value="org_member">Org member</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) =>
              updateSearch({ status: value as UsersSearch["status"] })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={team_id || "all"}
            onValueChange={(value) =>
              updateSearch({ team_id: value === "all" ? "" : value })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All teams</SelectItem>
                {(teams.data?.items ?? []).map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PaginatedListPanel query={users} page={page} onPageChange={goToPage}>
        {(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Org role</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Link
                        to="/users/$userId"
                        params={{ userId: user.id }}
                        className="font-medium hover:underline"
                      >
                        {user.email}
                      </Link>
                    </TableCell>
                    <TableCell>{user.name || "—"}</TableCell>
                    <TableCell>{authSourceLabel(user.auth_source)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.is_org_admin ? (
                          <Badge variant="secondary">Org admin</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Member
                          </span>
                        )}
                        {user.is_superuser ? (
                          <Badge variant="outline">Superuser</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.team_count}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? "secondary" : "destructive"}
                      >
                        {user.is_active ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyState colSpan={7}>
                  {q.trim() ||
                  auth_source !== "all" ||
                  org_role !== "all" ||
                  status !== "all" ||
                  team_id
                    ? "No users match your filters."
                    : "No users in the system yet."}
                </EmptyState>
              )}
            </TableBody>
          </Table>
        )}
      </PaginatedListPanel>
    </AppShell>
  )
}
