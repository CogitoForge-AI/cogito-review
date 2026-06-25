import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import type { LlmProvider } from "@/api/settings-types"
import { AppShell } from "@/components/layout/AppShell"
import { LlmProviderDialog } from "@/components/settings/LlmProviderDialog"
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
import { useDeleteLlmProvider, useLlmProviders } from "@/hooks/use-settings"

export const Route = createFileRoute("/llm-providers/")({
  component: LlmProvidersPage,
})

function LlmProvidersPage() {
  const providers = useLlmProviders()
  const deleteLlm = useDeleteLlmProvider()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogSession, setDialogSession] = useState(0)
  const [editingProvider, setEditingProvider] = useState<LlmProvider | null>(
    null,
  )

  const providerList = providers.data ?? []

  function openCreate() {
    setEditingProvider(null)
    setDialogSession((session) => session + 1)
    setDialogOpen(true)
  }

  function openEdit(provider: LlmProvider) {
    setEditingProvider(provider)
    setDialogSession((session) => session + 1)
    setDialogOpen(true)
  }

  return (
    <AppShell
      title="LLM Providers"
      description={`${providerList.length} provider${providerList.length === 1 ? "" : "s"} · OpenCode model endpoints`}
      actions={
        <Button type="button" size="sm" onClick={openCreate}>
          Add provider
        </Button>
      }
    >
      <LlmProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        provider={editingProvider}
        sessionKey={dialogSession}
        canDelete={providerList.length > 1}
      />

      <div className="rounded-lg border">
        {providers.isPending ? (
          <div className="flex flex-col gap-1.5 p-3">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : providers.isError ? (
          <p className="text-destructive p-3 text-sm">
            Could not load LLM providers. Run{" "}
            <code className="text-xs">make dev</code> first.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {providerList.length ? (
                providerList.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() => openEdit(provider)}
                      >
                        {provider.name}
                      </button>
                      <p className="text-muted-foreground text-xs">
                        {provider.provider_id}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {provider.resolved_opencode_model}
                    </TableCell>
                    <TableCell>
                      {provider.is_default ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        >
                          Default
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => openEdit(provider)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-7 px-2"
                          disabled={providerList.length <= 1}
                          onClick={async () => {
                            if (
                              !confirm(
                                `Delete LLM provider "${provider.name}"?`,
                              )
                            ) {
                              return
                            }
                            try {
                              await deleteLlm.mutateAsync(provider.id)
                              toast.success("LLM provider deleted")
                            } catch {
                              toast.error("Failed to delete LLM provider")
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
                    colSpan={4}
                    className="text-muted-foreground h-12 text-center"
                  >
                    No LLM providers yet. Click &quot;Add provider&quot; to get
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
