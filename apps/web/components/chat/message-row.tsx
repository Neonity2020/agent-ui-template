"use client"

import type { UIMessage } from "ai"
import { Bot, User } from "lucide-react"

import { Markdown } from "@/components/chat/markdown"
import { cn } from "@/lib/utils"

export function MessageRow({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"
  const reasoning = message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.text)
    .join("")
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")

  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full",
          isUser ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {!isUser && reasoning ? (
          <div className="mb-2 space-y-1 border-b border-border/60 pb-2">
            <p className="text-[11px] font-medium text-muted-foreground">⟳ Thinking…</p>
            <p className="whitespace-pre-wrap text-xs italic leading-relaxed text-muted-foreground/90">
              {reasoning}
            </p>
          </div>
        ) : null}
        {text ? (
          isUser ? (
            <div className="whitespace-pre-wrap">{text}</div>
          ) : (
            <Markdown>{text}</Markdown>
          )
        ) : (
          <span className="animate-pulse">…</span>
        )}
      </div>
    </div>
  )
}
