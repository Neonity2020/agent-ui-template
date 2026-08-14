"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { Button } from "@agent-ui/ui/button"

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Button variant="ghost" size="icon" className="absolute right-2 top-2 size-8" aria-label="Copy code" onClick={copy}>
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}
