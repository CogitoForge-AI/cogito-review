import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"

import type { Review } from "@/api/types"
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
import { useLlmProviders, useRepoIntegration } from "@/hooks/use-settings"
import { useReviews } from "@/hooks/use-reviews"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/repositories/$repoId")({
  component: RepositoryDetailPage,
})

function statusClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    case "failed":
      return "bg-destructive/15 text-destructive"
    case "running":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function lastRunAt(review: Review): string {
  const ts = review.completed_at ?? review.started_at
  if (!ts) return "—"
  return new Date(ts).toLocaleString()
}

function RepositoryDetailPage() {
  const { repoId } = Route.useParams()
  const navigate = useNavigate()
  const repoQuery = useRepoIntegration(repoId)
  const llmProviders = useLlmProviders()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSession, setSettingsSession] = useState(0)

  const repo = repoQuery.data
  const reviews = useReviews(
    repo?.repo_full_name ? { repo: repo.repo_full_name } : undefined,
  )

  const llmList = llmProviders.data ?? []

  const reviewColumns = useMemo<ColumnDef<Review>[]>(
    () => [
      {
        accessorKey: "pr_number",
        header: "PR #",
        cell: ({ row }) => (
          <Link
            to="/reviews/$reviewId"
            params={{ reviewId: row.original.id }}
            className="font-medium hover:underline"
          >
            #{row.original.pr_number}
          </Link>
        ),
      },
      {
        accessorKey: "pr_title",
        header: "PR name",
        cell: ({ row }) => {
          const title = row.original.pr_title.trim()
          if (!title) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <Link
              to="/reviews/$reviewId"
              params={{ reviewId: row.original.id }}
              className="hover:underline"
              title={title}
            >
              <span className="line-clamp-1">{title}</span>
            </Link>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className={cn(statusClass(row.original.status))}
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "findings_count",
        header: "Findings",
        cell: ({ row }) => {
          const count = row.original.findings_count
          return (
            <span
              className={cn(
                "tabular-nums",
                count === 0 && "text-muted-foreground",
              )}
            >
              {count}
            </span>
          )
        },
      },
      {
        id: "last_run",
        header: "Last run",
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap text-xs">
            {lastRunAt(row.original)}
          </span>
        ),
      },
    ],
    [],
  )

  const reviewTable = useReactTable({
    data: reviews.data?.items ?? [],
    columns: reviewColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const title = repo
    ? repo.repo_full_name || "All repositories"
    : "Repository"

  return (
    <AppShell
      title={title}
      description={repo?.name || undefined}
      backTo={{ to: "/repositories", label: "Repositories" }}
      actions={
        repo ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSettingsSession((session) => session + 1)
              setSettingsOpen(true)
            }}
          >
            Settings
          </Button>
        ) : null
      }
    >
      {repo ? (
        <RepoIntegrationDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          repo={repo}
          llmProviders={llmList}
          sessionKey={settingsSession}
          onDeleted={() => navigate({ to: "/repositories" })}
        />
      ) : null}

      {repoQuery.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : repoQuery.isError || !repo ? (
        <p className="text-destructive text-sm">Repository not found.</p>
      ) : (
        <div className="rounded-lg border">
          {reviews.isPending ? (
            <div className="flex flex-col gap-1.5 p-3">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : reviews.isError ? (
            <p className="text-destructive p-3 text-sm">
              Could not load reviews.
            </p>
          ) : (
            <Table>
              <TableHeader>
                {reviewTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {reviewTable.getRowModel().rows.length ? (
                  reviewTable.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={reviewColumns.length}
                      className="text-muted-foreground h-12 text-center"
                    >
                      No reviews yet for this repository.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </AppShell>
  )
}
