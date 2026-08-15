import type { Metadata } from "next"

import { ChatClient } from "@/components/chat/chat-client"
import { SiteHeader } from "@/components/site-header"
import { chatAgents } from "@/lib/agents"

export const metadata: Metadata = {
  title: "Chat | Agent UI",
  description: "Minimal multi-agent chatbot built on the Agent UI template.",
}

export default function ChatPage() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="min-h-0 flex-1">
        <ChatClient agents={chatAgents} />
      </main>
    </div>
  )
}
