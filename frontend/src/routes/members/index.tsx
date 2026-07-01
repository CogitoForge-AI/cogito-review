import { createFileRoute, redirect } from "@tanstack/react-router"

import { DEFAULT_USERS_SEARCH } from "@/lib/pagination"

export const Route = createFileRoute("/members/")({
  beforeLoad: () => {
    throw redirect({ to: "/users", search: DEFAULT_USERS_SEARCH })
  },
})
