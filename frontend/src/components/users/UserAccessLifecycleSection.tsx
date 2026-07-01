import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import type { UserDetail } from "@/api/user-types"
import { ConfirmDialog } from "@/components/patterns/confirm-dialog"
import { UserDetailCard } from "@/components/users/user-detail-layout"
import { Button } from "@/components/ui/button"
import { useOrgPermission } from "@/hooks/use-permission"
import {
  useDeactivateUser,
  useReactivateUser,
} from "@/hooks/use-users"

type UserAccessLifecycleSectionProps = {
  user: UserDetail
}

export function UserAccessLifecycleSection({
  user,
}: UserAccessLifecycleSectionProps) {
  const canDeactivate = useOrgPermission("user.deactivate")
  const deactivate = useDeactivateUser(user.id)
  const reactivate = useReactivateUser(user.id)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)

  if (!canDeactivate) {
    return null
  }

  async function handleDeactivate() {
    try {
      await deactivate.mutateAsync()
      toast.success("User deactivated")
      setDeactivateOpen(false)
    } catch {
      toast.error("Failed to deactivate user")
    }
  }

  async function handleReactivate() {
    try {
      await reactivate.mutateAsync()
      toast.success("User reactivated")
      setReactivateOpen(false)
    } catch {
      toast.error("Failed to reactivate user")
    }
  }

  return (
    <>
      <UserDetailCard
        title="Account access"
        description={
          user.is_active
            ? "Suspend product access without deleting roles or team memberships."
            : "This account cannot sign in until it is reactivated."
        }
        className={
          user.is_active
            ? "border-destructive/20 bg-destructive/[0.02]"
            : undefined
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {user.is_active ? (
              <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
            ) : null}
            <p className="text-muted-foreground text-sm leading-relaxed">
              {user.is_active
                ? "Deactivation denies new logins, revokes active sessions, and keeps organization roles and team memberships intact."
                : "Reactivation restores login through the configured authentication flow. Previous roles and memberships remain effective."}
            </p>
          </div>
          {user.is_active ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate account
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => setReactivateOpen(true)}
            >
              Reactivate account
            </Button>
          )}
        </div>
      </UserDetailCard>

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate this account?"
        description={`${user.email} will no longer be able to sign in. Active sessions will be revoked. Organization roles and team memberships are preserved.`}
        confirmLabel="Deactivate"
        variant="destructive"
        loading={deactivate.isPending}
        onConfirm={handleDeactivate}
      />

      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title="Reactivate this account?"
        description={`${user.email} will be able to sign in again through the configured authentication flow.`}
        confirmLabel="Reactivate"
        loading={reactivate.isPending}
        onConfirm={handleReactivate}
      />
    </>
  )
}
