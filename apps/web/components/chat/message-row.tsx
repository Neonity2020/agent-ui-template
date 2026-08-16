"use client"

import type { UIMessage } from "ai"
import { Bot, Wrench, User } from "lucide-react"

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
  const images = message.parts.filter((part) => part.type === "file")
  const toolParts = message.parts.filter((part) => part.type.startsWith("tool-"))

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
        {images.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((part, index) => (
              /* Data-URL attachments — next/image cannot optimize them. */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${part.filename ?? "file"}-${index}`}
                src={part.url}
                alt={part.filename ?? "Attachment"}
                className="h-20 w-20 rounded-lg border object-cover"
              />
            ))}
          </div>
        ) : null}
        {!isUser && toolParts.length > 0 ? (
          <div className="mb-2 space-y-1.5">
            {toolParts.map((part, index) => {
              const state = "state" in part ? part.state : "input-streaming"
              const input = "input" in part ? part.input : undefined
              const output = "output" in part ? part.output : undefined
              const toolName = part.type.slice("tool-".length)
              const working = state === "input-streaming" || state === "input-available"
              return (
                <div key={"toolCallId" in part ? part.toolCallId : `${toolName}-${index}`} className="rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Wrench className="size-3.5" /> {working ? "Using" : "Used"} {toolName}
                  </div>
                  {input ? <p className="mt-1 break-words text-muted-foreground">Input: {formatToolValue(input)}</p> : null}
                  {output ? <p className="mt-1 break-words text-muted-foreground">Result: {formatToolValue(output)}</p> : null}
                  {"errorText" in part && part.errorText ? <p className="mt-1 text-destructive">{part.errorText}</p> : null}
                </div>
              )
            })}
          </div>
        ) : null}
        {text ? (
          isUser ? (
            <div className="whitespace-pre-wrap">{text}</div>
          ) : (
            <Markdown>{text}</Markdown>
          )
        ) : toolParts.length === 0 ? (
          <span className="animate-pulse">…</span>
        ) : null}
      </div>
    </div>
  )
}

function formatToolValue(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
