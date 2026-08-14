"use client"

import { Bot, User } from "lucide-react"
import { useRef, useState } from "react"

import { AgentComposer } from "@/components/agent-composer"
import { Badge } from "@agent-ui/ui/badge"
import { Button } from "@agent-ui/ui/button"
import { Card } from "@agent-ui/ui/card"
import { Separator } from "@agent-ui/ui/separator"
import { cn } from "@/lib/utils"
import type { ChatAgent } from "@/lib/agents"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  agentId?: string
  content: string
}

export function ChatClient({ agents }: { agents: ChatAgent[] }) {
  const [activeId, setActiveId] = useState(agents[0]!.id)
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({})
  const [streaming, setStreaming] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const active = agents.find((agent) => agent.id === activeId) ?? agents[0]!
  const messages = threads[activeId] ?? []

  function patchThread(agentId: string, updater: (thread: ChatMessage[]) => ChatMessage[]) {
    setThreads((current) => ({ ...current, [agentId]: updater(current[agentId] ?? []) }))
  }

  async function send(prompt: string) {
    if (streaming) return
    const history = [...messages, { id: crypto.randomUUID(), role: "user" as const, content: prompt }]
    patchThread(activeId, () => history)
    setStreaming(true)

    const assistantId = crypto.randomUUID()
    patchThread(activeId, (thread) => [
      ...thread,
      { id: assistantId, role: "assistant", agentId: activeId, content: "" },
    ])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeId,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      })
      if (!response.ok || !response.body) throw new Error(`Request failed: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        patchThread(activeId, (thread) =>
          thread.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + chunk }
              : message,
          ),
        )
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
      }
    } catch (error) {
      patchThread(activeId, (thread) =>
        thread.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  message.content ||
                  `Sorry, something went wrong: ${error instanceof Error ? error.message : "unknown error"}`,
              }
            : message,
        ),
      )
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-[1400px] gap-4 p-4 sm:px-6">
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

      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{active.name}</p>
            <p className="truncate text-xs text-muted-foreground">{active.description}</p>
          </div>
          <Badge className="ml-auto shrink-0 text-muted-foreground">
            {streaming ? "Thinking…" : "Ready"}
          </Badge>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b px-3 py-2 md:hidden">
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

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div className="max-w-sm space-y-2">
                <p className="text-sm font-medium">Start a conversation with {active.name}</p>
                <p className="text-xs text-muted-foreground">{active.description}</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-2.5",
                  message.role === "user" && "flex-row-reverse",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    message.role === "user"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                </span>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {message.content || <span className="animate-pulse">…</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t p-3">
          <AgentComposer
            onSubmit={({ prompt }) => void send(prompt)}
            disabled={streaming}
            placeholder={`Message ${active.name}…`}
          />
        </div>
      </Card>
    </div>
  )
}
