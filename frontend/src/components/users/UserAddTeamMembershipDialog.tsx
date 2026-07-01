import { useState } from "react"
import { toast } from "sonner"

import type { TeamRoleKey } from "@/api/user-types"
import { Field } from "@/components/forms/Field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePermission } from "@/hooks/use-permission"
import { useAddTeamMember, useTeams } from "@/hooks/use-teams"

type UserAddTeamMembershipDialogProps = {
  userId: string
  existingTeamIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionKey: number
}

export function UserAddTeamMembershipDialog({
  userId,
  existingTeamIds,
  open,
  onOpenChange,
  sessionKey,
}: UserAddTeamMembershipDialogProps) {
  const teams = useTeams()
  const [teamId, setTeamId] = useState("")
  const [role, setRole] = useState<TeamRoleKey>("member")
  const addMember = useAddTeamMember(teamId)

  const selectableTeams = (teams.data?.items ?? []).filter(
    (team) => !existingTeamIds.includes(team.id),
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!teamId) return
    try {
      await addMember.mutateAsync({ user_id: userId, role })
      toast.success("Team membership added")
      setTeamId("")
      setRole("member")
      onOpenChange(false)
    } catch {
      toast.error("Failed to add team membership")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form key={sessionKey} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add team membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Field label="Team">
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {selectableTeams.map((team) => (
                      <TeamOption key={team.id} teamId={team.id} name={team.name} />
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Role">
              <Select
                value={role}
                onValueChange={(value) => setRole(value as TeamRoleKey)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="team_admin">Team admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addMember.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!teamId || addMember.isPending}>
              Add membership
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TeamOption({ teamId, name }: { teamId: string; name: string }) {
  const canAdd = usePermission("team.member.add", teamId)
  if (!canAdd) return null
  return <SelectItem value={teamId}>{name}</SelectItem>
}
