import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
  type UIMessageChunk,
} from "ai"

import { agentById, chatAgents } from "@/lib/agents"

export const runtime = "nodejs"

const AGNES_DEFAULT_BASE_URL = "https://apihub.agnes-ai.com/v1"

type ChatBody = {
  agentId?: string
  messages?: UIMessage[]
  settings?: { apiKey?: string; baseUrl?: string; model?: string }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatBody | null

  const agent = agentById(body?.agentId ?? "")
  const messages = (body?.messages ?? []).filter(
    (message) => message.role === "user" || message.role === "assistant",
  )
  if (messages.length === 0 || !chatAgents.some((item) => item.id === agent.id)) {
    return new Response("Invalid request", { status: 400 })
  }

  const apiKey = body?.settings?.apiKey?.trim()
  const baseUrl = (body?.settings?.baseUrl?.trim() || AGNES_DEFAULT_BASE_URL).replace(/\/+$/, "")
  const model = body?.settings?.model?.trim() || "agnes-2.5-flash"

  // 1. User-configured Agnes API key (entered in the web UI)
  if (apiKey) {
    if (!baseUrl.startsWith("https://")) {
      return new Response("Base URL must use https://", { status: 400 })
    }
    const agnes = createOpenAICompatible({
      name: "agnes",
      baseURL: baseUrl,
      apiKey,
    })
    const result = streamText({
      model: agnes(model),
      system: agent.systemPrompt,
      messages: await convertToModelMessages(messages),
      onError: (error) => console.error("[chat] Agnes stream error", error),
    })
    return result.toUIMessageStreamResponse()
  }

  // 2. Environment-configured OpenAI key (fallback)
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
    })
    const result = streamText({
      model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
      system: agent.systemPrompt,
      messages: await convertToModelMessages(messages),
    })
    return result.toUIMessageStreamResponse()
  }

  // 3. Mock fallback when no key is configured
  const reply = mockReply(agent.id, lastUserText(messages))
  return createUIMessageStreamResponse({
    stream: new ReadableStream<UIMessageChunk>({
      async start(controller) {
        for await (const chunk of mockChunks(reply)) controller.enqueue(chunk)
        controller.close()
      },
    }),
  })
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
