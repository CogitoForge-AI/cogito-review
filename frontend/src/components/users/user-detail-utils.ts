export function userInitials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function authSourceLabel(authSource: string): string {
  return authSource === "local" ? "Local account" : "SSO"
}

export function formatUserDate(value: string | null): string {
  if (!value) return "Never"
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
