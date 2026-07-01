import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function UserDetailCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("border-border/70 shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function UserDetailField({
  icon: Icon,
  label,
  children,
  mono,
}: {
  icon?: LucideIcon
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon ? (
        <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      ) : null}
      <div className="min-w-0 flex-1">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd
          className={cn(
            "mt-0.5 text-sm leading-snug break-words",
            mono && "font-mono text-xs",
          )}
        >
          {children}
        </dd>
      </div>
    </div>
  )
}

export function UserDetailFieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">{children}</dl>
}
