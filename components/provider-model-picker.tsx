"use client"

import { Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { PROVIDER_ICON_BY_DRIVER } from "@/components/provider-icons"
import { cn } from "@/lib/utils"
import {
  defaultSelection,
  selectionForProvider,
  type AgentProvider,
  type ModelSelection,
} from "@/lib/provider-catalog"

export function ProviderModelPicker({
  value,
  onValueChange,
  providers,
}: {
  value: ModelSelection
  onValueChange: (selection: ModelSelection) => void
  providers: AgentProvider[]
}) {
  const [open, setOpen] = useState(false)
  const [activeInstanceId, setActiveInstanceId] = useState(value.instanceId)
  const [query, setQuery] = useState("")
  const [rememberedModels, setRememberedModels] = useState<Record<string, string>>({
    [value.instanceId]: value.model,
  })
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", close)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  const selectedProvider = providers.find((provider) => provider.instanceId === value.instanceId)
  const selectedModel = selectedProvider?.models.find((model) => model.id === value.model)
  const activeProvider = providers.find((provider) => provider.instanceId === activeInstanceId) ?? providers[0]!
  const models = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return activeProvider.models
    return activeProvider.models.filter((model) =>
      `${model.name} ${model.id} ${model.description}`.toLowerCase().includes(normalized),
    )
  }, [activeProvider, query])

  function chooseProvider(instanceId: string) {
    setActiveInstanceId(instanceId)
    setQuery("")
    onValueChange(selectionForProvider(providers, instanceId, rememberedModels))
  }

  function chooseModel(model: string) {
    const selection = { instanceId: activeProvider.instanceId, model }
    setRememberedModels((current) => ({ ...current, [activeProvider.instanceId]: model }))
    onValueChange(selection)
    setOpen(false)
  }

  const fallback = defaultSelection(providers)
  const triggerProvider = selectedProvider ?? providers.find((provider) => provider.instanceId === fallback.instanceId)!

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="max-w-52 gap-1.5 px-2"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActiveInstanceId(value.instanceId)
          setOpen((current) => !current)
        }}
      >
        <ProviderLogo provider={triggerProvider} className="size-4" />
        <span className="truncate">{selectedModel?.name ?? value.model}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </Button>

      {open ? (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-40 flex h-[320px] w-[min(520px,calc(100vw-3rem))] overflow-hidden rounded-xl border bg-background shadow-2xl">
          <div className="flex w-14 shrink-0 flex-col gap-1 border-r bg-muted/30 p-1.5">
            {providers.map((provider) => (
              <button
                key={provider.instanceId}
                type="button"
                className={cn(
                  "relative grid aspect-square w-full place-items-center rounded-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeInstanceId === provider.instanceId && "bg-background shadow-sm",
                )}
                aria-label={provider.name}
                aria-pressed={activeInstanceId === provider.instanceId}
                disabled={provider.status !== "ready"}
                onClick={() => chooseProvider(provider.instanceId)}
              >
                <ProviderLogo provider={provider} />
                {activeInstanceId === provider.instanceId ? <span className="absolute -right-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" /> : null}
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 p-2">
            <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
              <div><p className="text-sm font-medium">{activeProvider.name}</p><p className="text-[11px] text-muted-foreground">{activeProvider.models.length} models · Connected</p></div>
            </div>
            <label className="mb-2 flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-2.5">
              <Search className="size-3.5 text-muted-foreground" />
              <span className="sr-only">Search models</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
            </label>
            <div className="max-h-[228px] space-y-1 overflow-y-auto" role="listbox" aria-label={`${activeProvider.name} models`}>
              {models.map((model) => {
                const selected = value.instanceId === activeProvider.instanceId && value.model === model.id
                return (
                  <button key={model.id} type="button" role="option" aria-selected={selected} onClick={() => chooseModel(model.id)} className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected && "bg-accent") }>
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-xs font-medium">{model.name}</span>{model.badges?.map((badge) => <span key={badge} className="rounded border px-1 py-px text-[9px] font-medium text-muted-foreground">{badge}</span>)}</div><p className="mt-1 truncate text-[11px] text-muted-foreground">{model.description}</p></div>
                    {selected ? <Check className="size-4 shrink-0" /> : null}
                  </button>
                )
              })}
              {models.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No models found.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProviderLogo({ provider, className }: { provider: AgentProvider; className?: string }) {
  const Icon = PROVIDER_ICON_BY_DRIVER[provider.driver]
  if (Icon) return <Icon className={cn("size-6", className)} aria-hidden="true" />
  return <span className={cn("grid size-6 place-items-center text-[9px] font-semibold", className)}>{provider.name.slice(0, 2).toUpperCase()}</span>
}
