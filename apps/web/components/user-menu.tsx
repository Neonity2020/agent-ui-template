"use client"

import { LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@agent-ui/ui/button"

export function UserMenu() {
  const { data: session, isPending } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  if (isPending) {
    return <Button variant="ghost" size="sm" className="w-16" disabled>…</Button>
  }

  if (!session) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    )
  }

  const email = session.user.email
  const initials = (session.user.name ?? email)
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={email}
      >
        {initials || "?"}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border bg-background p-2 shadow-lg">
          <div className="border-b px-2.5 pb-2 pt-1">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => void authClient.signOut().then(() => setOpen(false))}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
