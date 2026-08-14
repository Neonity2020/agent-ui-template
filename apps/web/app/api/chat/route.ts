import { agentById, chatAgents } from "@/lib/agents"

export const runtime = "nodejs"

type ChatMessage = { role: "user" | "assistant"; content: string }

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    agentId?: string
    messages?: ChatMessage[]
  } | null

  const agent = agentById(body?.agentId ?? "")
  const messages = (body?.messages ?? [])
    .filter((message) => typeof message?.content === "string" && message.content.trim())
    .slice(-12)

  if (messages.length === 0 || !chatAgents.some((item) => item.id === agent.id)) {
    return new Response("Invalid request", { status: 400 })
  }

  const encoder = new TextEncoder()

  if (process.env.OPENAI_API_KEY) {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        stream: true,
        messages: [{ role: "system", content: agent.systemPrompt }, ...messages],
      }),
    })

    if (!upstream.ok || !upstream.body) {
      return new Response("Upstream error", { status: 502 })
    }

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") continue
          const delta = JSON.parse(data).choices?.[0]?.delta?.content
          if (delta) controller.enqueue(encoder.encode(delta))
        }
      },
      cancel() {
        void reader.cancel()
      },
    })

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }

  let reply = mockReply(agent.id, messages.at(-1)!.content)
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (reply.length === 0) {
        controller.close()
        return
      }
      const chunk = reply.slice(0, 6)
      controller.enqueue(encoder.encode(chunk))
      reply = reply.slice(6)
      await new Promise((resolve) => setTimeout(resolve, 20))
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Agent": agent.id },
  })
}

function mockReply(agentId: string, prompt: string): string {
  const trimmed = prompt.length > 80 ? `${prompt.slice(0, 80)}…` : prompt
  switch (agentId) {
    case "byte":
      return `Here's how I'd approach "${trimmed}":\n\n1. Reproduce it in the smallest possible case.\n2. bisect the change that introduced it.\n3. Patch, then add a regression test.\n\n(Set OPENAI_API_KEY to get real answers from a model.)`
    case "sage":
      return `On "${trimmed}", here's a structured take:\n\n- Pro: iterating quickly validates assumptions.\n- Con: premature structure locks in the wrong design.\n- Bottom line: prototype first, formalize once the shape is clear.\n\n(Set OPENAI_API_KEY to get real answers from a model.)`
    default:
      return `Good question about "${trimmed}"! In this template I'm a mock endpoint, so here's a short placeholder answer. Set OPENAI_API_KEY in your environment and I'll reply with a real model instead.`
  }
}
