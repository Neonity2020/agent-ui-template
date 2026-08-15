"use client"

import { ChevronDown, Paperclip, Send, X } from "lucide-react"
import { useRef, useState } from "react"

import { ProviderModelPicker } from "@/components/provider-model-picker"
import { Button } from "@agent-ui/ui/button"
import {
  defaultSelection,
  providerCatalog,
  type AgentProvider,
  type ModelSelection,
} from "@/lib/provider-catalog"

const MAX_IMAGES = 4

type Attachment = { file: File; url: string }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function ImagePreview({ url, name, onRemove }: { url: string; name: string; onRemove: () => void }) {
  return (
    <div className="relative">
      {/* Data-URL preview — stable, no revoke lifecycle needed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        className="h-16 w-16 rounded-lg border object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
        aria-label="Remove image"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

export function AgentComposer({
  providers = providerCatalog,
  selection: controlledSelection,
  onSelectionChange,
  onSubmit,
  placeholder = "Ask the agent to build, debug, or explain...",
  disabled = false,
}: {
  providers?: AgentProvider[]
  selection?: ModelSelection
  onSelectionChange?: (selection: ModelSelection) => void
  onSubmit?: (input: { prompt: string; files: File[]; selection: ModelSelection }) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [localSelection, setLocalSelection] = useState(() => defaultSelection(providers))
  const [prompt, setPrompt] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selection = controlledSelection ?? localSelection

  function changeSelection(next: ModelSelection) {
    if (!controlledSelection) setLocalSelection(next)
    onSelectionChange?.(next)
  }

  function addFiles(incoming: Iterable<File>) {
    const images = Array.from(incoming).filter((file) => file.type.startsWith("image/"))
    if (images.length === 0) return
    // Read in the event handler (not an effect) so the data URLs are stable
    // and unaffected by StrictMode's mount/unmount simulation.
    for (const file of images) {
      void fileToDataUrl(file).then((url) => {
        setAttachments((current) => {
          if (current.length >= MAX_IMAGES) return current
          return [...current, { file, url }]
        })
      })
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(event.clipboardData?.items ?? [])
    const pasted = items
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)
    if (pasted.length === 0) return
    event.preventDefault()
    addFiles(pasted)
  }

  function submit() {
    const value = prompt.trim()
    if ((!value && attachments.length === 0) || disabled) return
    onSubmit?.({ prompt: value, files: attachments.map((attachment) => attachment.file), selection })
    setPrompt("")
    setAttachments([])
  }

  return (
    <form
      className="rounded-xl border bg-background p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <ImagePreview
              key={`${attachment.file.name}-${index}`}
              url={attachment.url}
              name={attachment.file.name}
              onRemove={() =>
                setAttachments((current) => current.filter((_, i) => i !== index))
              }
            />
          ))}
        </div>
      ) : null}
      <label htmlFor="agent-prompt" className="sr-only">Message the agent</label>
      <textarea
        id="agent-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onPaste={handlePaste}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        placeholder={`${placeholder} (paste images)`}
        rows={2}
        disabled={disabled}
        className="block max-h-32 min-h-12 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      <div className="flex min-w-0 items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files)
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Attach image"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip />
        </Button>
        {providers.length > 0 ? (
          <ProviderModelPicker providers={providers} value={selection} onValueChange={changeSelection} />
        ) : (
          <Button type="button" variant="ghost" size="sm" disabled>No providers</Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="hidden px-2 sm:inline-flex">Full access <ChevronDown /></Button>
        <Button
          type="submit"
          size="icon"
          className="ml-auto"
          aria-label="Send message"
          disabled={disabled || !selection.instanceId || (!prompt.trim() && attachments.length === 0)}
        >
          <Send />
        </Button>
      </div>
    </form>
  )
}
