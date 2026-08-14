import Link from "next/link"
import { Github, Sparkles } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@agent-ui/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center px-4 sm:px-6">
        <Link href="/" className="mr-6 flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          Agent UI
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          <Link href="/chat" className="font-medium text-foreground transition-colors hover:text-foreground">Chat</Link>
          <Link href="/docs" className="text-muted-foreground transition-colors hover:text-foreground">Docs</Link>
          <Link href="/docs/components/agent-shell" className="text-muted-foreground transition-colors hover:text-foreground">Components</Link>
          <Link href="/docs/theming" className="text-muted-foreground transition-colors hover:text-foreground">Theming</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com" aria-label="GitHub"><Github /></a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
