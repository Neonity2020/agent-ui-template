"use client"

import { KeyRound, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@agent-ui/ui/button"
import {
  AGNES_DEFAULT_BASE_URL,
  AGNES_MODELS,
  clearSettings,
  defaultSettings,
  saveSettings,
  type AgnesSettings,
} from "@/lib/agnes-settings"

const inputClass =
  "w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"

export function ChatSettings({
  settings,
  onValueChange,
}: {
  settings: AgnesSettings
  onValueChange?: (settings: AgnesSettings) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(settings)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  function toggle() {
    setDraft(settings)
    setOpen((value) => !value)
  }

  function save() {
    const next: AgnesSettings = {
      apiKey: draft.apiKey.trim(),
      baseUrl: draft.baseUrl.trim() || AGNES_DEFAULT_BASE_URL,
      model: draft.model,
    }
    saveSettings(next)
    onValueChange?.(next)
    setOpen(false)
  }

  function clear() {
    clearSettings()
    onValueChange?.(defaultSettings())
    setOpen(false)
  }

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <Button variant="outline" size="sm" onClick={toggle} aria-expanded={open}>
        <KeyRound className="size-3.5" />
        API
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border bg-background p-4 shadow-lg">
          <div className="space-y-3">
            <div>
              <label htmlFor="agnes-api-key" className="mb-1 block text-xs font-medium">
                API Key
              </label>
              <input
                id="agnes-api-key"
                type="password"
                autoComplete="off"
                className={inputClass}
                placeholder="sk-…"
                value={draft.apiKey}
                onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="agnes-base-url" className="mb-1 block text-xs font-medium">
                Base URL
              </label>
              <input
                id="agnes-base-url"
                type="text"
                className={inputClass}
                value={draft.baseUrl}
                onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="agnes-model" className="mb-1 block text-xs font-medium">
                Model
              </label>
              <select
                id="agnes-model"
                className={inputClass}
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              >
                {AGNES_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} — {model.description}
                  </option>
                ))}
              </select>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3 shrink-0 text-emerald-500" />
              Your key is stored only in this browser (localStorage) and sent to the Agnes API through the app
              server. Use a server-side env var instead for production deployments.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" className="flex-1" onClick={save} disabled={!draft.apiKey.trim()}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={clear} aria-label="Clear API settings">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
