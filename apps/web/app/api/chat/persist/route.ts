import { and, eq } from "drizzle-orm"
import type { UIMessage } from "ai"

import { getDb } from "@/db"
import { chatMessage, conversation } from "@/db/schema"
import { getAuth } from "@/lib/auth"
import { chatAgents } from "@/lib/agents"

export const runtime = "nodejs"

type PersistBody = {
  agentId?: string
  conversationId?: string
  messages?: UIMessage[]
}

async function currentUserId(request: Request): Promise<string | null> {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null
  const session = await getAuth().api.getSession({ headers: request.headers })
  return session?.user.id ?? null
}

function titleFromMessage(message: UIMessage): string {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim()
  return text ? text.slice(0, 60) : "New chat"
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PersistBody | null
  const userId = await currentUserId(request)
  if (!userId) return Response.json({ error: "Sign in to save chat history" }, { status: 401 })
  if (!body?.conversationId || !body.agentId || !chatAgents.some((agent) => agent.id === body.agentId)) {
    return Response.json({ error: "Invalid conversation" }, { status: 400 })
  }

  const messages = (body.messages ?? []).filter(
    (message) => message.role === "user" || message.role === "assistant",
  )
  if (!messages.length) return Response.json({ error: "No messages to save" }, { status: 400 })

  const db = getDb()
  const existing = await db
    .select({ id: conversation.id, agentId: conversation.agentId })
    .from(conversation)
    .where(and(eq(conversation.id, body.conversationId), eq(conversation.userId, userId)))
    .limit(1)
  if (!existing[0] || existing[0].agentId !== body.agentId) {
    return Response.json({ error: "Conversation not found" }, { status: 404 })
  }

  // The Neon HTTP driver used by this app does not provide interactive
  // transactions. These inserts are idempotent, so sequential writes retain
  // safe retry behavior without requiring a database transaction.
  for (const message of messages) {
    await db
      .insert(chatMessage)
      .values({ id: message.id, conversationId: body.conversationId, role: message.role, parts: message.parts })
      .onConflictDoNothing()
  }
  const firstUserMessage = messages.find((message) => message.role === "user")
  await db
    .update(conversation)
    .set({
      ...(firstUserMessage ? { title: titleFromMessage(firstUserMessage) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(conversation.id, body.conversationId))

  return new Response(null, { status: 204 })
}
