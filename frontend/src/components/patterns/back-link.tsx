import { Link, type LinkProps } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"

export function BackLink({
  to,
  label = "Back",
  params,
  search,
}: {
  to: LinkProps["to"]
  label?: string
  params?: LinkProps["params"]
  search?: LinkProps["search"]
}) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-0.5 text-xs transition-colors"
    >
      <ChevronLeft className="size-3.5" />
      {label}
    </Link>
  )
}
