import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import type { RepoIntegration } from "@/api/settings-types"
import { AppShell } from "@/components/layout/AppShell"
import { RepoIntegrationDialog } from "@/components/settings/RepoIntegrationDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useDeleteRepoIntegration,
  useLlmProviders,
  useRepoIntegrations,
} from "@/hooks/use-settings"

export const Route = createFileRoute("/repositories/")({
  component: RepositoriesPage,
})

function RepositoriesPage() {
  const repos = useRepoIntegrations()
  const llmProviders = useLlmProviders()
  const deleteRepo = useDeleteRepoIntegration()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogSession, setDialogSession] = useState(0)
  const [editingRepo, setEditingRepo] = useState<RepoIntegration | null>(null)

  const llmList = llmProviders.data ?? []
  const repoList = repos.data ?? []
  const loading = repos.isPending || llmProviders.isPending

  function openCreate() {
    setEditingRepo(null)
    setDialogSession((session) => session + 1)
    setDialogOpen(true)
  }

  function openEdit(repo: RepoIntegration) {
    setEditingRepo(repo)
    setDialogSession((session) => session + 1)
    setDialogOpen(true)
  }

  return (
    <AppShell
      title="Repositories"
      description={`${repoList.length} integration${repoList.length === 1 ? "" : "s"} · Webhook POST /api/v1/webhooks/github`}
      actions={
        <Button type="button" size="sm" onClick={openCreate}>
          Add repository
        </Button>
      }
    >
      <RepoIntegrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        repo={editingRepo}
        llmProviders={llmList}
        sessionKey={dialogSession}
      />

      <div className="rounded-lg border">
        {loading ? (
          <div className="flex flex-col gap-1.5 p-3">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : repos.isError ? (
          <p className="text-destructive p-3 text-sm">
            Could not load repositories. Run{" "}
            <code className="text-xs">make dev</code> first.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>LLM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {repoList.length ? (
                repoList.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>
                      <Link
                        to="/repositories/$repoId"
                        params={{ repoId: repo.id }}
                        className="font-medium hover:underline"
                      >
                        {repo.repo_full_name || "All repositories"}
                      </Link>
                      {repo.name ? (
                        <p className="text-muted-foreground text-xs">
                          {repo.name}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {repo.git_provider}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {repo.llm_provider_name ?? "Default"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          repo.enabled
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : ""
                        }
                      >
                        {repo.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => openEdit(repo)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-7 px-2"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Delete repository "${repo.repo_full_name || "All repositories"}"?`,
                              )
                            ) {
                              return
                            }
                            try {
                              await deleteRepo.mutateAsync(repo.id)
                              toast.success("Repository deleted")
                            } catch {
                              toast.error("Failed to delete repository")
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-12 text-center"
                  >
                    No repositories yet. Click &quot;Add repository&quot; to get
                    started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  )
}
