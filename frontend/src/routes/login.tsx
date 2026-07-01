import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/forms/Field"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { loginUrl } from "@/hooks/use-auth"
import { useLocalLogin } from "@/hooks/use-install"
import { usePublicIdentityProvider } from "@/hooks/use-identity-provider"

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    return_to: typeof search.return_to === "string" ? search.return_to : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: LoginPage,
})

function AuthDivider() {
  return (
    <div className="relative py-1">
      <div className="border-border/70 absolute inset-x-0 top-1/2 border-t" />
      <p className="text-muted-foreground relative mx-auto w-fit bg-card px-3 text-xs">
        Or sign in locally
      </p>
    </div>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const { return_to: returnTo, error } = Route.useSearch()
  const idp = usePublicIdentityProvider()
  const localLogin = useLocalLogin()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showLocal, setShowLocal] = useState(false)

  const ssoEnabled = idp.data?.enabled ?? false
  const localOnly = !ssoEnabled || error === "idp_not_configured"
  const showLocalForm = showLocal || localOnly
  const buttonLabel =
    ssoEnabled && idp.data?.display_name
      ? `Continue with ${idp.data.display_name}`
      : "Continue with SSO"

  async function handleLocalSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await localLogin.mutateAsync({ username, password })
      void navigate({ to: returnTo ?? "/" })
    } catch {
      toast.error("Invalid username or password")
    }
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="space-y-1.5 text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Cogito Review
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          {error === "idp_not_configured" ? (
            <p className="text-destructive text-sm">
              SSO is not configured. Use your local administrator account.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {ssoEnabled
                ? "Use SSO or your local administrator account."
                : "Sign in with your local administrator account."}
            </p>
          )}
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="space-y-4 p-6">
            {ssoEnabled ? (
              <Button asChild className="w-full">
                <a href={loginUrl(returnTo ?? "/")}>{buttonLabel}</a>
              </Button>
            ) : null}

            {ssoEnabled && showLocalForm ? <AuthDivider /> : null}

            {showLocalForm ? (
              <form className="space-y-3" onSubmit={handleLocalSubmit}>
                <Field label="Username">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="admin"
                    required
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <div className="pt-1">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={localLogin.isPending}
                  >
                    Sign in locally
                  </Button>
                </div>
              </form>
            ) : ssoEnabled ? (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground w-full"
                onClick={() => setShowLocal(true)}
              >
                Local administrator sign-in
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
