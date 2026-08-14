"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@agent-ui/ui/button"

export function ThemeToggle() {
  useEffect(() => {
    const stored = localStorage.getItem("agent-ui-theme")
    const enabled = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches
    document.documentElement.classList.toggle("dark", enabled)
  }, [])

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("agent-ui-theme", next ? "dark" : "light")
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  )
}
