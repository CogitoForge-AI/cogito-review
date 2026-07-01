import type { ReactNode } from "react"

export const TABLE_ACTIONS_HEAD_CLASS = "w-24 text-right pr-6"
export const TABLE_ACTIONS_CELL_CLASS = "text-right"

export function TableRowActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end">{children}</div>
}
