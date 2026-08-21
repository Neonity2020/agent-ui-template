import { and, desc, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { conversation } from "@/db/schema"
import { getAuth } from "@/lib/auth"
import { chatAgents } from "@/lib/agents"

export const runtime = "nodejs"

async function currentUserId(request: Request): Promise<string | null> {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null
  const session = await getAuth().api.getSession({ headers: request.headers })
  return session?.user.id ?? null
}

export async function GET(request: Request) {
  const userId = await currentUserId(request)
  if (!userId) return Response.json({ error: "Sign in to load conversations" }, { status: 401 })

  const conversations = await getDb()
    .select({
      id: conversation.id,
      agentId: conversation.agentId,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
    })
    .from(conversation)
    .where(eq(conversation.userId, userId))
    .orderBy(desc(conversation.updatedAt))
  return Response.json({ conversations })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { agentId?: string } | null
  const agentId = body?.agentId
  if (!agentId || !chatAgents.some((agent) => agent.id === agentId)) {
    return Response.json({ error: "Invalid agent" }, { status: 400 })
  }

  const userId = await currentUserId(request)
  if (!userId) return Response.json({ error: "Sign in to create conversations" }, { status: 401 })

  const item = {
    id: crypto.randomUUID(),
    userId,
    agentId,
    title: "New chat",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await getDb().insert(conversation).values(item)
  return Response.json({ conversation: item }, { status: 201 })
}

export async function DELETE(request: Request) {
  const conversationId = new URL(request.url).searchParams.get("conversationId")
  if (!conversationId) return Response.json({ error: "Missing conversation" }, { status: 400 })

  const userId = await currentUserId(request)
  if (!userId) return Response.json({ error: "Sign in to delete conversations" }, { status: 401 })

  const db = getDb()
  const filter = and(eq(conversation.id, conversationId), eq(conversation.userId, userId))
  const existing = await db.select({ id: conversation.id }).from(conversation).where(filter).limit(1)
  if (!existing[0]) return Response.json({ error: "Conversation not found" }, { status: 404 })

  // chat_message rows are removed by the conversation foreign key cascade.
  await db.delete(conversation).where(filter)
  return new Response(null, { status: 204 })
}
