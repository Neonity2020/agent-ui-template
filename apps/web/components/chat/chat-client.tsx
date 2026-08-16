"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai"
import { Bot, Plus } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

import { AgentComposer } from "@/components/agent-composer"
import { ChatSettings } from "@/components/chat/chat-settings"
import { MessageRow } from "@/components/chat/message-row"
import { authClient } from "@/lib/auth-client"
import type { ChatAgent } from "@/lib/agents"
import {
  getSettingsSnapshot,
  markSettingsHydrated,
  subscribeSettings,
  updateSettings,
  type AgnesSettings,
} from "@/lib/agnes-settings"
import { cn } from "@/lib/utils"
import { Badge } from "@agent-ui/ui/badge"
import { Button } from "@agent-ui/ui/button"
import { Card } from "@agent-ui/ui/card"
import { Separator } from "@agent-ui/ui/separator"

type Conversation = {
  id: string
  agentId: string
  title: string
  updatedAt: string
}

type ConversationContextMenu = {
  conversation: Conversation
  x: number
  y: number
}

function AgentChat({
  agent,
  settings,
  historyEnabled,
  conversationId,
  onHistoryChanged,
}: {
  agent: ChatAgent
  settings: AgnesSettings
  historyEnabled: boolean
  conversationId?: string
  onHistoryChanged: () => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const loadedConversationId = useRef<string | null>(null)
  const localRunnerUrl = process.env.NEXT_PUBLIC_PI_RUNNER_URL
  const usingLocalRunner = settings.runtime === "pi" && Boolean(localRunnerUrl)
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: usingLocalRunner ? localRunnerUrl : "/api/chat",
      body: () => ({ agentId: agent.id, conversationId, settings, systemPrompt: agent.systemPrompt }),
    }),
    onError: (error) => console.error(`[chat:${agent.id}]`, error),
    onFinish: ({ message, messages, isError }) => {
      void (async () => {
        try {
          if (usingLocalRunner && conversationId && !isError) {
            const response = await fetch("/api/chat/persist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agentId: agent.id, conversationId, messages: [...messages, message] }),
            })
            if (!response.ok) throw new Error(await response.text())
          }
        } catch (error) {
          console.error(`[chat:${agent.id}] local history persistence failed`, error)
        } finally {
          onHistoryChanged()
        }
      })()
    },
  })
  const { setMessages } = chat
  const busy = chat.status === "submitted" || chat.status === "streaming"

  useEffect(() => {
    if (!historyEnabled) {
      loadedConversationId.current = null
      return
    }
    if (!conversationId) {
      setMessages([])
      loadedConversationId.current = null
      return
    }
    if (loadedConversationId.current === conversationId) return

    loadedConversationId.current = conversationId
    let cancelled = false
    setMessages([])
    fetch(`/api/chat?conversationId=${encodeURIComponent(conversationId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load chat history")
        return (await response.json()) as { messages: UIMessage[] }
      })
      .then(({ messages }) => {
        if (!cancelled) setMessages(messages)
      })
      .catch((error) => {
        loadedConversationId.current = null
        console.error(`[chat:${agent.id}] history load failed`, error)
      })
    return () => {
      cancelled = true
    }
  }, [agent.id, conversationId, historyEnabled, setMessages])

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

  const needsConversation = historyEnabled && !conversationId
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
            (usingLocalRunner || settings.apiKey) && !chat.error && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}
        >
          {busy ? "Thinking…" : chat.error ? "Error" : usingLocalRunner ? "Pi Runner" : settings.apiKey ? "Connected" : "No API key"}
        </Badge>
        <ChatSettings settings={settings} onValueChange={updateSettings} />
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {needsConversation ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-sm font-medium">Create a new chat to start</p>
              <p className="text-xs text-muted-foreground">Choose “New chat” in the sidebar for {agent.name}.</p>
            </div>
          </div>
        ) : chat.messages.length === 0 ? (
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
        {chat.error ? <p className="mb-2 text-xs text-destructive">{chat.error.message}</p> : null}
        <AgentComposer
          onSubmit={({ prompt, files }) => void sendMessage(prompt, files)}
          disabled={busy || needsConversation}
          placeholder={needsConversation ? "Create a new chat first" : `Message ${agent.name}…`}
        />
      </div>
    </Card>
  )
}

export function ChatClient({ agents }: { agents: ChatAgent[] }) {
  const [activeId, setActiveId] = useState(agents[0]!.id)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationIds, setSelectedConversationIds] = useState<Record<string, string>>({})
  const [contextMenu, setContextMenu] = useState<ConversationContextMenu | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const settings = useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot)
  const { data: session } = authClient.useSession()
  const visibleConversations = session ? conversations : []

  const refreshConversations = useCallback(async () => {
    if (!session) return false
    try {
      const response = await fetch("/api/conversations")
      if (!response.ok) return false
      const data = (await response.json()) as { conversations: Conversation[] }
      setConversations(data.conversations)
      setSelectedConversationIds((selected) => {
        const next = { ...selected }
        for (const agent of agents) {
          const stillExists = data.conversations.some((item) => item.id === next[agent.id])
          if (!stillExists) {
            const latest = data.conversations.find((item) => item.agentId === agent.id)
            if (latest) next[agent.id] = latest.id
            else delete next[agent.id]
          }
        }
        return next
      })
      return true
    } catch {
      // The chat answer remains valid if Next is recompiling or temporarily
      // unavailable. A later refresh or reload will resynchronize the sidebar.
      return false
    }
  }, [agents, session])

  useEffect(() => {
    markSettingsHydrated()
  }, [])

  useEffect(() => {
    if (!session) return
    // This synchronizes state from the conversations API after authentication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshConversations()
  }, [refreshConversations, session])

  async function createConversation(agentId: string) {
    if (!session) return
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    })
    if (!response.ok) throw new Error("Unable to create conversation")
    const data = (await response.json()) as { conversation: Conversation }
    setConversations((items) => [data.conversation, ...items])
    setSelectedConversationIds((selected) => ({ ...selected, [agentId]: data.conversation.id }))
    setActiveId(agentId)
  }

  function selectConversation(agentId: string, conversationId: string) {
    setActiveId(agentId)
    setSelectedConversationIds((selected) => ({ ...selected, [agentId]: conversationId }))
  }

  async function deleteConversation(target: Conversation) {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/conversations?conversationId=${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Unable to delete conversation")

      setConversations((items) => items.filter((item) => item.id !== target.id))
      setSelectedConversationIds((selected) => {
        if (selected[target.agentId] !== target.id) return selected
        const replacement = conversations.find(
          (item) => item.agentId === target.agentId && item.id !== target.id,
        )
        const next = { ...selected }
        if (replacement) next[target.agentId] = replacement.id
        else delete next[target.agentId]
        return next
      })
      setDeleteTarget(null)
    } catch (error) {
      console.error("[chat] conversation delete failed", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-[1400px] gap-4 p-4 sm:px-6">
      <Card className="hidden w-64 shrink-0 flex-col overflow-hidden p-3 md:flex">
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="text-xs font-medium text-muted-foreground">Agents & chats</p>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => void createConversation(activeId)} disabled={!session} aria-label="New chat">
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {agents.map((agent) => {
            const agentConversations = visibleConversations.filter((item) => item.agentId === agent.id)
            return (
              <section key={agent.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveId(agent.id)}
                  aria-pressed={agent.id === activeId}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    agent.id === activeId && "bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium"><Bot className="size-4" /> {agent.name}</span>
                  <span className="text-xs text-muted-foreground">{agent.role}</span>
                </button>
                <div className="space-y-0.5 pl-3">
                  {agentConversations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectConversation(agent.id, item.id)}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setContextMenu({ conversation: item, x: event.clientX, y: event.clientY })
                      }}
                      className={cn(
                        "block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
                        selectedConversationIds[agent.id] === item.id && "bg-accent text-foreground",
                      )}
                      title={item.title}
                    >
                      {item.title}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void createConversation(agent.id)}
                    disabled={!session}
                    className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="size-3" /> New chat
                  </button>
                </div>
              </section>
            )
          })}
        </div>
        <Separator className="my-2" />
        <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
          {session ? "Chats are saved to your account." : "Sign in to save and restore chats."}
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
          {session ? <Button type="button" size="sm" variant="ghost" onClick={() => void createConversation(activeId)}><Plus /> New chat</Button> : null}
        </div>
        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          {agents.map((agent) => (
            <div key={agent.id} className={cn("min-h-0 flex-1", agent.id !== activeId && "hidden")}>
              <AgentChat
                key={`${agent.id}-${settings.runtime}`}
                agent={agent}
                settings={settings}
                historyEnabled={Boolean(session)}
                conversationId={session ? selectedConversationIds[agent.id] : undefined}
                onHistoryChanged={() => {
                  void refreshConversations()
                }}
              />
            </div>
          ))}
        </div>
      </div>
      {contextMenu ? (
        <div
          role="menu"
          tabIndex={-1}
          className="fixed z-50 min-w-32 rounded-lg border bg-background p-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-md px-2.5 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              setDeleteTarget(contextMenu.conversation)
              setContextMenu(null)
            }}
          >
            Delete chat
          </button>
        </div>
      ) : null}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-chat-title" className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl">
            <h2 id="delete-chat-title" className="text-base font-semibold">Delete this chat?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              “{deleteTarget.title}” and all of its messages will be permanently deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
              <Button type="button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void deleteConversation(deleteTarget)} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
