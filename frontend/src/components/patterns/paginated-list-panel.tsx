import type { UseQueryResult } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { DataPanel } from "@/components/patterns/data-panel"
import { ListPagination } from "@/components/patterns/list-pagination"
import {
  DEFAULT_PAGE_SIZE,
  type PaginatedList,
} from "@/lib/pagination"

type PaginatedListPanelProps<T> = {
  query: UseQueryResult<PaginatedList<T>>
  page: number
  onPageChange: (page: number) => void
  pageSize?: number
  children: (items: T[]) => ReactNode
}

export function PaginatedListPanel<T>({
  query,
  page,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
  children,
}: PaginatedListPanelProps<T>) {
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0

  return (
    <DataPanel loading={query.isPending} error={query.isError}>
      {children(items)}
      <ListPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
        isFetching={query.isFetching}
      />
    </DataPanel>
  )
}
