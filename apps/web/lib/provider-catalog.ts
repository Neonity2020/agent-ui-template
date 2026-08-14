export type AgentModel = {
  id: string
  name: string
  description: string
  badges?: string[]
}

export type AgentProvider = {
  instanceId: string
  driver: string
  name: string
  status: "ready" | "unavailable"
  models: AgentModel[]
}

export type ModelSelection = {
  instanceId: string
  model: string
}

export const providerCatalog: AgentProvider[] = [
  {
    instanceId: "codex",
    driver: "codex",
    name: "Codex",
    status: "ready",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4", description: "Best for complex agentic work", badges: ["Recommended"] },
      { id: "gpt-5.4-mini", name: "GPT-5.4 mini", description: "Fast, efficient coding model", badges: ["Fast"] },
      { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", description: "Optimized for software engineering" },
    ],
  },
  {
    instanceId: "claude-agent",
    driver: "claudeAgent",
    name: "Claude",
    status: "ready",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", description: "Most capable for deep reasoning", badges: ["Powerful"] },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Balanced speed and intelligence", badges: ["Recommended"] },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", description: "Quick responses and small tasks", badges: ["Fast"] },
    ],
  },
  {
    instanceId: "cursor",
    driver: "cursor",
    name: "Cursor",
    status: "ready",
    models: [
      { id: "composer-2", name: "Composer 2", description: "Cursor's agent coding model", badges: ["Recommended"] },
      { id: "auto", name: "Auto", description: "Choose the best available model" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Claude through Cursor" },
    ],
  },
  {
    instanceId: "grok",
    driver: "grok",
    name: "Grok",
    status: "ready",
    models: [
      { id: "grok-code-fast-1", name: "Grok Code Fast 1", description: "Fast coding and tool use", badges: ["Fast"] },
      { id: "grok-4.1-fast", name: "Grok 4.1 Fast", description: "General reasoning with low latency" },
    ],
  },
  {
    instanceId: "opencode",
    driver: "opencode",
    name: "OpenCode",
    status: "ready",
    models: [
      { id: "kimi-k2.5", name: "Kimi K2.5", description: "Open model for agentic coding", badges: ["Open"] },
      { id: "qwen3-coder", name: "Qwen3 Coder", description: "Efficient coding and tool calling", badges: ["Open"] },
    ],
  },
  {
    instanceId: "pi-agent",
    driver: "pi",
    name: "Pi Agent",
    status: "ready",
    models: [
      { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Anthropic model through Pi", badges: ["Recommended"] },
      { id: "openai/gpt-5.4", name: "GPT-5.4", description: "OpenAI model through Pi" },
      { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", description: "Google model through Pi", badges: ["Preview"] },
    ],
  },
]

export function defaultSelection(catalog: AgentProvider[]): ModelSelection {
  const provider = catalog.find((item) => item.status === "ready" && item.models.length > 0)
  if (!provider) return { instanceId: "", model: "" }
  return { instanceId: provider.instanceId, model: provider.models[0]!.id }
}

export function selectionForProvider(
  catalog: AgentProvider[],
  instanceId: string,
  rememberedModels: Record<string, string>,
): ModelSelection {
  const provider = catalog.find((item) => item.instanceId === instanceId && item.status === "ready")
  if (!provider) return defaultSelection(catalog)
  const remembered = rememberedModels[instanceId]
  const model = provider.models.find((item) => item.id === remembered) ?? provider.models[0]
  return { instanceId: provider.instanceId, model: model?.id ?? "" }
}
