"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@agent-ui/ui/button"

const inputClass =
  "w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        })
        if (signUpError) {
          setError(signUpError.message ?? "Failed to create an account.")
          return
        }
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
        })
        if (signInError) {
          setError(signInError.message ?? "Failed to sign in.")
          return
        }
      }
      router.push("/chat")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {mode === "sign-up" ? (
        <div>
          <label htmlFor="auth-name" className="mb-1 block text-xs font-medium">
            Name
          </label>
          <input
            id="auth-name"
            type="text"
            autoComplete="name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
      ) : null}
      <div>
        <label htmlFor="auth-email" className="mb-1 block text-xs font-medium">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="auth-password" className="mb-1 block text-xs font-medium">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          className={inputClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {mode === "sign-up" ? "Create account" : "Sign in"}
      </Button>
    </form>
  )
}
