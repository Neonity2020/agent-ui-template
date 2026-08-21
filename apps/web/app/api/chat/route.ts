import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { and, asc, eq } from "drizzle-orm"
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
  type UIMessageChunk,
} from "ai"

import { getDb } from "@/db"
import { chatMessage, conversation } from "@/db/schema"
import { getAuth } from "@/lib/auth"
import { agentById, chatAgents } from "@/lib/agents"
import { agentTools } from "@/lib/agent-tools"

export const runtime = "nodejs"

const AGNES_DEFAULT_BASE_URL = "https://apihub.agnes-ai.com/v1"

type ChatBody = {
  agentId?: string
  conversationId?: string
  messages?: UIMessage[]
  settings?: { apiKey?: string; baseUrl?: string; model?: string }
}

type StoredConversation = { id: string; agentId: string; messages: UIMessage[] }

/** Returns null when auth/database have not been configured (guest chat mode). */
async function currentUserId(request: Request): Promise<string | null> {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null
  const session = await getAuth().api.getSession({ headers: request.headers })
  return session?.user.id ?? null
}

async function loadConversation(userId: string, conversationId: string): Promise<StoredConversation | null> {
  const db = getDb()
  const rows = await db
    .select({
      conversationId: conversation.id,
      agentId: conversation.agentId,
      id: chatMessage.id,
      role: chatMessage.role,
      parts: chatMessage.parts,
    })
    .from(conversation)
    .leftJoin(chatMessage, eq(chatMessage.conversationId, conversation.id))
    .where(and(eq(conversation.userId, userId), eq(conversation.id, conversationId)))
    .orderBy(asc(chatMessage.createdAt))

  if (!rows[0]) return null
  return {
    id: rows[0].conversationId,
    agentId: rows[0].agentId,
    messages: rows.flatMap((row) =>
      row.id && row.role && row.parts
        ? [{ id: row.id, role: row.role as UIMessage["role"], parts: row.parts }]
        : [],
    ),
  }
}

async function saveMessage(conversationId: string, message: UIMessage) {
  const db = getDb()
  await db
    .insert(chatMessage)
    .values({ id: message.id, conversationId, role: message.role, parts: message.parts })
    .onConflictDoNothing()
  await db.update(conversation).set({ updatedAt: new Date() }).where(eq(conversation.id, conversationId))
}

export async function GET(request: Request) {
  const conversationId = new URL(request.url).searchParams.get("conversationId")
  if (!conversationId) return Response.json({ error: "Missing conversation" }, { status: 400 })

  const userId = await currentUserId(request)
  if (!userId) return Response.json({ error: "Sign in to load chat history" }, { status: 401 })

  const stored = await loadConversation(userId, conversationId)
  return Response.json({ messages: stored?.messages ?? [] })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatBody | null
  const agent = agentById(body?.agentId ?? "")
  const requestedMessages = (body?.messages ?? []).filter(
    (message) => message.role === "user" || message.role === "assistant",
  )
  const userMessage = requestedMessages.at(-1)
  if (!userMessage || userMessage.role !== "user" || !chatAgents.some((item) => item.id === agent.id)) {
    return new Response("Invalid request", { status: 400 })
  }

  const userId = await currentUserId(request)
  let stored: StoredConversation | null = null
  if (userId) {
    if (!body?.conversationId) return new Response("Missing conversation", { status: 400 })
    const existing = await loadConversation(userId, body.conversationId)
    if (!existing || existing.agentId !== agent.id) return new Response("Invalid conversation", { status: 404 })

    await saveMessage(existing.id, userMessage)
    if (existing.messages.length === 0) {
      await getDb()
        .update(conversation)
        .set({ title: titleFromMessage(userMessage), updatedAt: new Date() })
        .where(eq(conversation.id, existing.id))
    }
    stored = await loadConversation(userId, existing.id)
  }

  // Never trust client-provided history for signed-in users. It can be stale,
  // incomplete, or belong to another browser; use the user-owned DB record.
  const messages = stored?.messages ?? requestedMessages
  const persistAssistantText = async (text: string) => {
    if (!stored || !text.trim()) return
    try {
      await saveMessage(stored.id, {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text }],
      })
    } catch (error) {
      // Persistence must not turn a successful streamed answer into a failed
      // request, but it should remain visible in server logs for recovery.
      console.error("[chat] assistant persistence failed", error)
    }
  }

  const apiKey = body?.settings?.apiKey?.trim()
  const baseUrl = (body?.settings?.baseUrl?.trim() || AGNES_DEFAULT_BASE_URL).replace(/\/+$/, "")
  const model = body?.settings?.model?.trim() || "agnes-2.5-flash"

  if (apiKey) {
    if (!baseUrl.startsWith("https://")) return new Response("Base URL must use https://", { status: 400 })
    const agnes = createOpenAICompatible({ name: "agnes", baseURL: baseUrl, apiKey })
    const result = streamText({
      model: agnes(model),
      system: agentInstructions(agent.systemPrompt),
      messages: await convertToModelMessages(messages),
      tools: agentTools,
      stopWhen: stepCountIs(5),
      onError: (error) => console.error("[chat] Agnes stream error", error),
      onFinish: ({ text }) => persistAssistantText(text),
    })
    return result.toUIMessageStreamResponse()
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
    })
    const result = streamText({
      model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
      system: agentInstructions(agent.systemPrompt),
      messages: await convertToModelMessages(messages),
      tools: agentTools,
      stopWhen: stepCountIs(5),
      onFinish: ({ text }) => persistAssistantText(text),
    })
    return result.toUIMessageStreamResponse()
  }

  const reply = mockReply(agent.id, lastUserText(messages))
  await persistAssistantText(reply)
  const stream = createUIMessageStream({
    execute: ({ writer }) => writer.merge(createMockStream(reply)),
  })
  return createUIMessageStreamResponse({ stream })
}

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i]!.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")
    if (text.trim()) return text
  }
  return ""
}

function titleFromMessage(message: UIMessage): string {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  return text ? text.slice(0, 48) : "New chat"
}

function agentInstructions(systemPrompt: string): string {
  return `${systemPrompt}\n\nYou are an autonomous assistant with access to safe server-side tools. Use tools when they improve factual accuracy (for example calculations, current time, or agent configuration). After a tool returns, incorporate its result into a clear final answer. Never claim to have used a tool unless its result is present.`
}

async function* mockChunks(text: string): AsyncGenerator<UIMessageChunk> {
  const id = `mock-${crypto.randomUUID()}`
  yield { type: "text-start", id }
  let remaining = text
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, 6)
    remaining = remaining.slice(6)
    await new Promise((resolve) => setTimeout(resolve, 20))
    yield { type: "text-delta", id, delta: chunk }
  }
  yield { type: "text-end", id }
}

function createMockStream(text: string): ReadableStream<UIMessageChunk> {
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of mockChunks(text)) controller.enqueue(chunk)
      controller.close()
    },
  })
}

function mockReply(agentId: string, prompt: string): string {
  const trimmed = prompt.length > 80 ? `${prompt.slice(0, 80)}…` : prompt
  switch (agentId) {
    case "byte":
      return `Here's how I'd approach "${trimmed}":\n\n1. Reproduce it in the smallest possible case.\n2. bisect the change that introduced it.\n3. Patch, then add a regression test.\n\n(Set an API key in the chat header to get real answers from Agnes.)`
    case "sage":
      return `On "${trimmed}", here's a structured take:\n\n- Pro: iterating quickly validates assumptions.\n- Con: premature structure locks in the wrong design.\n- Bottom line: prototype first, formalize once the shape is clear.\n\n(Set an API key in the chat header to get real answers from Agnes.)`
    default:
      return `Good question about "${trimmed}"! In this template I'm a mock endpoint, so here's a short placeholder answer. Set an API key in the chat header and I'll reply with a real model instead.`
  }
}
