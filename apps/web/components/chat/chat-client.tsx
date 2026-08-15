"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type FileUIPart } from "ai"
import { Bot } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"

import { AgentComposer } from "@/components/agent-composer"
import { ChatSettings } from "@/components/chat/chat-settings"
import { MessageRow } from "@/components/chat/message-row"
import { Badge } from "@agent-ui/ui/badge"
import { Button } from "@agent-ui/ui/button"
import { Card } from "@agent-ui/ui/card"
import { Separator } from "@agent-ui/ui/separator"
import { cn } from "@/lib/utils"
import type { ChatAgent } from "@/lib/agents"
import {
  getSettingsSnapshot,
  markSettingsHydrated,
  subscribeSettings,
  updateSettings,
  type AgnesSettings,
} from "@/lib/agnes-settings"

/**
 * One chat panel per agent. Kept mounted even when hidden so each agent's
 * conversation history survives switching.
 */
function AgentChat({ agent, settings }: { agent: ChatAgent; settings: AgnesSettings }) {
  const listRef = useRef<HTMLDivElement>(null)
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Evaluated per request, so the latest settings are always used.
      body: () => ({ agentId: agent.id, settings }),
    }),
    onError: (error) => console.error(`[chat:${agent.id}]`, error),
  })
  const busy = chat.status === "submitted" || chat.status === "streaming"

  async function sendMessage(prompt: string, files: File[]) {
    if (files.length === 0) {
      await chat.sendMessage({ text: prompt })
      return
    }
    const fileParts: FileUIPart[] = await Promise.all(
      files.map(async (file) => ({
        type: "file" as const,
        mediaType: file.type,
        filename: file.name,
        url: await fileToDataUrl(file),
      })),
    )
    await chat.sendMessage({ text: prompt, files: fileParts })
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [chat.messages])

  return (
    <Card className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{agent.name}</p>
          <p className="truncate text-xs text-muted-foreground">{agent.description}</p>
        </div>
        <Badge
          className={cn(
            "ml-auto shrink-0",
            settings.apiKey &&
              !chat.error &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}
        >
          {busy ? "Thinking…" : chat.error ? "Error" : settings.apiKey ? "Connected" : "No API key"}
        </Badge>
        <ChatSettings settings={settings} onValueChange={updateSettings} />
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {chat.messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-sm font-medium">Start a conversation with {agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.description}</p>
            </div>
          </div>
        ) : (
          chat.messages.map((message) => <MessageRow key={message.id} message={message} />)
        )}
      </div>

      <div className="border-t p-3">
        {chat.error ? (
          <p className="mb-2 text-xs text-destructive">{chat.error.message}</p>
        ) : null}
        <AgentComposer
          onSubmit={({ prompt, files }) => void sendMessage(prompt, files)}
          disabled={busy}
          placeholder={`Message ${agent.name}…`}
        />
      </div>
    </Card>
  )
}

export function ChatClient({ agents }: { agents: ChatAgent[] }) {
  const [activeId, setActiveId] = useState(agents[0]!.id)
  const settings = useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot)

  useEffect(() => {
    // After hydration the snapshot can switch from the server-safe default to
    // the settings actually stored in localStorage.
    markSettingsHydrated()
  }, [])

  return (
    <div className="mx-auto flex h-full max-w-[1400px] gap-4 p-4 sm:px-6">
      <Card className="hidden w-60 shrink-0 flex-col gap-1 p-3 md:flex">
        <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Agents</p>
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => setActiveId(agent.id)}
            aria-pressed={agent.id === activeId}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              agent.id === activeId && "bg-accent",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4" /> {agent.name}
            </span>
            <span className="text-xs text-muted-foreground">{agent.role}</span>
          </button>
        ))}
        <Separator className="my-2" />
        <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
          Each agent keeps its own conversation. Switch anytime — history is preserved.
        </p>
      </Card>

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <div className="mb-3 flex gap-1.5 overflow-x-auto rounded-xl border bg-background p-2 md:hidden">
          {agents.map((agent) => (
            <Button
              key={agent.id}
              type="button"
              variant={agent.id === activeId ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveId(agent.id)}
            >
              {agent.name}
            </Button>
          ))}
        </div>
        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          {agents.map((agent) => (
            <div key={agent.id} className={cn("min-h-0 flex-1", agent.id !== activeId && "hidden")}>
              <AgentChat agent={agent} settings={settings} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
