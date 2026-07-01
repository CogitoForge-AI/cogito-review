import {
  CalendarClock,
  KeyRound,
  Mail,
  Shield,
  UserRound,
} from "lucide-react"

import type { UserDetail } from "@/api/user-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  UserDetailCard,
  UserDetailField,
  UserDetailFieldGrid,
} from "@/components/users/user-detail-layout"
import {
  authSourceLabel,
  formatUserDate,
  userInitials,
} from "@/components/users/user-detail-utils"
import { cn } from "@/lib/utils"

type UserProfileHeaderProps = {
  user: UserDetail
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const displayName = user.name.trim() || user.email

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              user.is_active
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
            aria-hidden
          >
            {userInitials(user.name, user.email)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {displayName}
              </h1>
              <Badge variant={user.is_active ? "secondary" : "destructive"}>
                {user.is_active ? "Active" : "Deactivated"}
              </Badge>
              {user.is_org_admin ? (
                <Badge variant="outline">Org admin</Badge>
              ) : null}
              {user.is_superuser ? (
                <Badge variant="outline">Superuser</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {user.email}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function UserIdentityCard({ user }: UserProfileHeaderProps) {
  return (
    <UserDetailCard
      title="Profile details"
    >
      <UserDetailFieldGrid>
          <UserDetailField icon={Mail} label="Email">
            {user.email}
          </UserDetailField>
          <UserDetailField icon={UserRound} label="Display name">
            {user.name || "—"}
          </UserDetailField>
          <UserDetailField icon={KeyRound} label="Auth source">
            {authSourceLabel(user.auth_source)}
          </UserDetailField>
          {user.username ? (
            <UserDetailField icon={UserRound} label="Username" mono>
              {user.username}
            </UserDetailField>
          ) : null}
          <UserDetailField icon={CalendarClock} label="Joined">
            {new Date(user.created_at).toLocaleDateString()}
          </UserDetailField>
          <UserDetailField icon={Shield} label="Last login">
            {formatUserDate(user.last_login_at)}
          </UserDetailField>
        </UserDetailFieldGrid>
    </UserDetailCard>
  )
}
