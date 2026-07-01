import { useState } from "react"
import { Plus, UsersRound } from "lucide-react"
import { toast } from "sonner"

import type { TeamRoleKey, UserDetail } from "@/api/user-types"
import { ConfirmDialog } from "@/components/patterns/confirm-dialog"
import {
  TABLE_ACTIONS_CELL_CLASS,
  TABLE_ACTIONS_HEAD_CLASS,
  TableRowActions,
} from "@/components/patterns/table-actions"
import { UserAddTeamMembershipDialog } from "@/components/users/UserAddTeamMembershipDialog"
import { UserDetailCard } from "@/components/users/user-detail-layout"
import { Button } from "@/components/ui/button"
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
import { usePermission } from "@/hooks/use-permission"
import {
  useRemoveTeamMember,
  useUpdateTeamMemberRole,
} from "@/hooks/use-teams"

const TEAM_ROLE_LABELS: Record<TeamRoleKey, string> = {
  team_admin: "Team admin",
  member: "Member",
  viewer: "Viewer",
}

type UserTeamMembershipsSectionProps = {
  user: UserDetail
}

type PendingRoleChange = {
  teamId: string
  teamName: string
  role: TeamRoleKey
}

type PendingRemove = {
  teamId: string
  teamName: string
}

export function UserTeamMembershipsSection({
  user,
}: UserTeamMembershipsSectionProps) {
  const canAddAny = usePermission("team.member.add")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogSession, setDialogSession] = useState(0)
  const [pendingRole, setPendingRole] = useState<PendingRoleChange | null>(null)
  const [pendingRemove, setPendingRemove] = useState<PendingRemove | null>(null)

  const activeTeamId = pendingRole?.teamId ?? pendingRemove?.teamId ?? ""
  const updateRole = useUpdateTeamMemberRole(activeTeamId)
  const removeMember = useRemoveTeamMember(activeTeamId)

  function openDialog() {
    setDialogSession((session) => session + 1)
    setDialogOpen(true)
  }

  async function handleRoleConfirm() {
    if (!pendingRole) return
    try {
      await updateRole.mutateAsync({
        userId: user.id,
        role: pendingRole.role,
      })
      toast.success("Team role updated")
      setPendingRole(null)
    } catch {
      toast.error("Failed to update team role")
    }
  }

  async function handleRemoveConfirm() {
    if (!pendingRemove) return
    try {
      await removeMember.mutateAsync(user.id)
      toast.success("Removed from team")
      setPendingRemove(null)
    } catch {
      toast.error("Failed to remove team membership")
    }
  }

  return (
    <>
      <UserDetailCard
        title="Team memberships"
        action={
          canAddAny ? (
            <Button type="button" size="sm" onClick={openDialog}>
              <Plus className="size-3.5" />
              Add membership
            </Button>
          ) : null
        }
      >
        <UserAddTeamMembershipDialog
          userId={user.id}
          existingTeamIds={user.team_memberships.map((m) => m.team_id)}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          sessionKey={dialogSession}
        />

        {user.team_memberships.length ? (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className={TABLE_ACTIONS_HEAD_CLASS}>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.team_memberships.map((membership) => (
                  <MembershipRow
                    key={membership.team_id}
                    membership={membership}
                    onRoleChange={(role) =>
                      setPendingRole({
                        teamId: membership.team_id,
                        teamName: membership.team_name,
                        role,
                      })
                    }
                    onRemove={() =>
                      setPendingRemove({
                        teamId: membership.team_id,
                        teamName: membership.team_name,
                      })
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-10 text-center">
            <div className="bg-muted flex size-10 items-center justify-center rounded-full">
              <UsersRound className="text-muted-foreground size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No team memberships yet</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Add this user to one or more teams to grant team-scoped access.
              </p>
            </div>
            {canAddAny ? (
              <Button type="button" size="sm" variant="outline" onClick={openDialog}>
                <Plus className="size-3.5" />
                Add to team
              </Button>
            ) : null}
          </div>
        )}
      </UserDetailCard>

      <ConfirmDialog
        open={pendingRole !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRole(null)
        }}
        title="Change team role?"
        description={
          pendingRole
            ? `Update ${pendingRole.teamName} role to ${TEAM_ROLE_LABELS[pendingRole.role]}.`
            : ""
        }
        confirmLabel="Update role"
        loading={updateRole.isPending}
        onConfirm={handleRoleConfirm}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        title="Remove team membership?"
        description={
          pendingRemove
            ? `Remove this user from ${pendingRemove.teamName}.`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        loading={removeMember.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </>
  )
}

function MembershipRow({
  membership,
  onRoleChange,
  onRemove,
}: {
  membership: UserDetail["team_memberships"][number]
  onRoleChange: (role: TeamRoleKey) => void
  onRemove: () => void
}) {
  const canUpdate = usePermission("team.member.update_role", membership.team_id)
  const canRemove = usePermission("team.member.remove", membership.team_id)

  function handleRoleSelect(value: TeamRoleKey) {
    if (value === membership.role) return
    onRoleChange(value)
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{membership.team_name}</TableCell>
      <TableCell>
        {canUpdate ? (
          <Select
            value={membership.role}
            onValueChange={(value) => handleRoleSelect(value as TeamRoleKey)}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(Object.keys(TEAM_ROLE_LABELS) as TeamRoleKey[]).map(
                  (role) => (
                    <SelectItem key={role} value={role}>
                      {TEAM_ROLE_LABELS[role]}
                    </SelectItem>
                  ),
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm">
            {TEAM_ROLE_LABELS[membership.role as TeamRoleKey] ??
              membership.role}
          </span>
        )}
      </TableCell>
      <TableCell className={TABLE_ACTIONS_CELL_CLASS}>
        {canRemove ? (
          <TableRowActions>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-8 px-3"
              onClick={onRemove}
            >
              Remove
            </Button>
          </TableRowActions>
        ) : (
          <span className="text-muted-foreground block pr-3 text-sm">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
