import { jsonSchema } from "ai"

import { agentById } from "@/lib/agents"

const expressionSchema = jsonSchema<{ expression: string }>({
  type: "object",
  properties: {
    expression: {
      type: "string",
      description: "A basic arithmetic expression using numbers, parentheses, +, -, *, /, or %.",
    },
  },
  required: ["expression"],
  additionalProperties: false,
})

const timeSchema = jsonSchema<{ timeZone?: string }>({
  type: "object",
  properties: {
    timeZone: {
      type: "string",
      description: "Optional IANA time zone, for example Asia/Shanghai or America/New_York.",
    },
  },
  additionalProperties: false,
})

const agentInfoSchema = jsonSchema<{ agentId: string }>({
  type: "object",
  properties: { agentId: { type: "string", description: "The configured agent ID." } },
  required: ["agentId"],
  additionalProperties: false,
})

/**
 * Server-only, deterministic tools. They intentionally do not expose shell,
 * network, or arbitrary database access to the model.
 */
export const agentTools = {
  calculate: {
    description: "Evaluate a basic arithmetic expression exactly. Use it whenever a calculation would improve accuracy.",
    inputSchema: expressionSchema,
    execute: async ({ expression }: { expression: string }) => ({
      expression,
      result: evaluateExpression(expression),
    }),
  },
  getCurrentTime: {
    description: "Get the current date and time in an optional IANA time zone.",
    inputSchema: timeSchema,
    execute: async ({ timeZone }: { timeZone?: string }) => {
      try {
        const now = new Date()
        return {
          timeZone: timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          iso: now.toISOString(),
          local: new Intl.DateTimeFormat("en-CA", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone,
          }).format(now),
        }
      } catch {
        return { error: `Invalid time zone: ${timeZone}` }
      }
    },
  },
  getAgentInfo: {
    description: "Look up the configured name, role, and capabilities of an available assistant agent.",
    inputSchema: agentInfoSchema,
    execute: async ({ agentId }: { agentId: string }) => {
      const agent = agentById(agentId)
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        description: agent.description,
      }
    },
  },
}

function evaluateExpression(expression: string): number | { error: string } {
  const normalized = expression.replace(/\s+/g, "")
  if (!normalized || normalized.length > 200 || !/^[0-9()+\-*/%.]+$/.test(normalized)) {
    return { error: "Only numbers, parentheses, and + - * / % operators are allowed." }
  }

  // Characters are allow-listed above; this has no names, property access, or
  // statements available to execute. The finite-result check handles /0 too.
  const result = Function(`"use strict"; return (${normalized})`)() as number
  return Number.isFinite(result) ? result : { error: "The expression did not produce a finite number." }
}
