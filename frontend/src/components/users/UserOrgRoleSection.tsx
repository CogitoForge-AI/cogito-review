import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import type { OrgRoleKey, UserDetail } from "@/api/user-types"
import { ConfirmDialog } from "@/components/patterns/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserDetailCard } from "@/components/users/user-detail-layout"
import { useOrgPermission } from "@/hooks/use-permission"
import { useUpdateUserOrgRole } from "@/hooks/use-users"

const ROLE_DESCRIPTIONS: Record<OrgRoleKey, string> = {
  org_admin:
    "Manage users, teams, settings, and organization-wide configuration.",
  org_member:
    "Access assigned teams and resources without organization admin powers.",
}

type UserOrgRoleSectionProps = {
  user: UserDetail
}

export function UserOrgRoleSection({ user }: UserOrgRoleSectionProps) {
  const canAssign = useOrgPermission("user.assign_org_admin")
  const updateRole = useUpdateUserOrgRole(user.id)
  const currentRole: OrgRoleKey = user.is_org_admin ? "org_admin" : "org_member"
  const [pendingRole, setPendingRole] = useState<OrgRoleKey | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleRoleSelect(value: OrgRoleKey) {
    if (value === currentRole) return
    setPendingRole(value)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!pendingRole) return
    try {
      await updateRole.mutateAsync(pendingRole)
      toast.success("Organization role updated")
      setConfirmOpen(false)
      setPendingRole(null)
    } catch {
      toast.error("Failed to update organization role")
    }
  }

  const confirmTitle =
    pendingRole === "org_admin"
      ? "Promote to organization admin?"
      : "Demote to organization member?"

  const confirmDescription =
    pendingRole === "org_admin"
      ? `${user.email} will gain organization-wide administrative privileges.`
      : `${user.email} will lose organization-wide administrative privileges.`

  return (
    <>
      <UserDetailCard
        title="Organization access"
        description="Controls organization-wide administration privileges."
        action={
          canAssign && !user.is_superuser ? (
            <Select value={currentRole} onValueChange={handleRoleSelect}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="org_admin">Org admin</SelectItem>
                  <SelectItem value="org_member">Org member</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null
        }
      >
        <div className="bg-muted/40 flex items-start gap-3 rounded-md border border-border/60 p-3">
          <ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {currentRole === "org_admin"
                  ? "Organization administrator"
                  : "Organization member"}
              </span>
              {user.is_superuser ? (
                <Badge variant="outline">Superuser</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {user.is_superuser
                ? "Superuser accounts always retain organization admin access."
                : ROLE_DESCRIPTIONS[currentRole]}
            </p>
          </div>
        </div>
      </UserDetailCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Change role"
        loading={updateRole.isPending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
