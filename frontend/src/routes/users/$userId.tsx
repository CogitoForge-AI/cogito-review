import { createFileRoute } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/AppShell"
import { BackLink } from "@/components/patterns/back-link"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAccessLifecycleSection } from "@/components/users/UserAccessLifecycleSection"
import { UserIdentityCard } from "@/components/users/UserProfileHeader"
import { UserOrgRoleSection } from "@/components/users/UserOrgRoleSection"
import { UserProfileHeader } from "@/components/users/UserProfileHeader"
import { UserTeamMembershipsSection } from "@/components/users/UserTeamMembershipsSection"
import { useUser } from "@/hooks/use-users"
import { requireOrgPermission } from "@/lib/permissions"
import { DEFAULT_USERS_SEARCH } from "@/lib/pagination"

export const Route = createFileRoute("/users/$userId")({
  beforeLoad: requireOrgPermission("user.read"),
  component: UserDetailPage,
})

function UserDetailPage() {
  const { userId } = Route.useParams()
  const userQuery = useUser(userId)
  const user = userQuery.data

  const pageTitle = user ? user.name.trim() || user.email : "User"
  const pageDescription = user && user.name.trim() ? user.email : undefined

  return (
    <AppShell title={pageTitle} description={pageDescription}>
      <BackLink to="/users" label="Back to users" search={DEFAULT_USERS_SEARCH} />

      {userQuery.isPending ? (
        <div className="max-w-5xl space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : userQuery.isError || !user ? (
        <p className="text-destructive text-sm">User not found.</p>
      ) : (
        <div className="max-w-5xl space-y-4">
          <UserProfileHeader user={user} />

          <div className="grid gap-4 lg:grid-cols-2">
            <UserIdentityCard user={user} />
            <UserOrgRoleSection user={user} />
          </div>

          <UserTeamMembershipsSection user={user} />
          <UserAccessLifecycleSection user={user} />
        </div>
      )}
    </AppShell>
  )
}
