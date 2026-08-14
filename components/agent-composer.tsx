"use client"

import { ChevronDown, Paperclip, Send } from "lucide-react"
import { useState } from "react"

import { ProviderModelPicker } from "@/components/provider-model-picker"
import { Button } from "@/components/ui/button"
import {
  defaultSelection,
  providerCatalog,
  type AgentProvider,
  type ModelSelection,
} from "@/lib/provider-catalog"

export function AgentComposer({
  providers = providerCatalog,
  selection: controlledSelection,
  onSelectionChange,
  onSubmit,
}: {
  providers?: AgentProvider[]
  selection?: ModelSelection
  onSelectionChange?: (selection: ModelSelection) => void
  onSubmit?: (input: { prompt: string; selection: ModelSelection }) => void
}) {
  const [localSelection, setLocalSelection] = useState(() => defaultSelection(providers))
  const [prompt, setPrompt] = useState("")
  const selection = controlledSelection ?? localSelection

  function changeSelection(next: ModelSelection) {
    if (!controlledSelection) setLocalSelection(next)
    onSelectionChange?.(next)
  }

  return (
    <form
      className="rounded-xl border bg-background p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        const value = prompt.trim()
        if (!value) return
        onSubmit?.({ prompt: value, selection })
        setPrompt("")
      }}
    >
      <label htmlFor="agent-prompt" className="sr-only">Message the agent</label>
      <textarea id="agent-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask the agent to build, debug, or explain..." rows={2} className="block max-h-32 min-h-12 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      <div className="flex min-w-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Attach file"><Paperclip /></Button>
        {providers.length > 0 ? (
          <ProviderModelPicker providers={providers} value={selection} onValueChange={changeSelection} />
        ) : (
          <Button type="button" variant="ghost" size="sm" disabled>No providers</Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="hidden px-2 sm:inline-flex">Full access <ChevronDown /></Button>
        <Button type="submit" size="icon" className="ml-auto" aria-label="Send message" disabled={!prompt.trim() || !selection.instanceId}><Send /></Button>
      </div>
    </form>
  )
}
