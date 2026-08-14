export type DocPage = {
  slug: string
  title: string
  description: string
  group: "Get Started" | "Components" | "Customization"
  sections: { title: string; body: string; code?: string }[]
}

export const docs: DocPage[] = [
  {
    slug: "quick-start",
    title: "Quick Start",
    description: "Add the Agent UI shell to a new or existing Next.js application.",
    group: "Get Started",
    sections: [
      {
        title: "Create a project",
        body: "Start with Next.js 16, Tailwind CSS, and the App Router.",
        code: "npx create-next-app@latest my-agent --ts --tailwind --app\ncd my-agent",
      },
      {
        title: "Add the components",
        body: "Copy the components you need into your project. They are yours to edit.",
        code: "npx shadcn@latest add button card badge\ncp -R components/agent ./components/agent",
      },
      {
        title: "Render the shell",
        body: "Compose the shell with your own transport and persistence layer.",
        code: "import { AgentShell } from \"@/components/agent/agent-shell\"\n\nexport default function Page() {\n  return <AgentShell />\n}",
      },
    ],
  },
  {
    slug: "components/agent-shell",
    title: "Agent Shell",
    description: "A responsive workspace with threads, activity, and a conversation surface.",
    group: "Components",
    sections: [
      {
        title: "Usage",
        body: "The shell owns layout only. Bring your own agent runtime, state, and API calls.",
        code: "<AgentShell\n  threads={threads}\n  activeThreadId={activeId}\n  onThreadChange={setActiveId}\n/>",
      },
      {
        title: "Responsive behavior",
        body: "The thread rail collapses below the desktop breakpoint while the conversation remains the primary surface.",
      },
    ],
  },
  {
    slug: "components/message",
    title: "Message",
    description: "Composable user, assistant, tool, and status messages for agent conversations.",
    group: "Components",
    sections: [
      {
        title: "Usage",
        body: "Messages accept arbitrary children so streamed text, markdown, and tool output can share one timeline.",
        code: "<Message role=\"assistant\">\n  <MessageContent>{content}</MessageContent>\n  <MessageActions />\n</Message>",
      },
      {
        title: "Streaming",
        body: "Append text inside MessageContent and keep transport state outside the visual component.",
      },
    ],
  },
  {
    slug: "components/composer",
    title: "Composer",
    description: "An accessible prompt input with T3-style provider-instance and model selection.",
    group: "Components",
    sections: [
      {
        title: "Usage",
        body: "Keep the visual composer controlled. The selected value contains the exact provider instance routing key and model slug.",
        code: "<AgentComposer\n  selection={{ instanceId: \"codex\", model: \"gpt-5.4\" }}\n  providers={providers}\n  onSelectionChange={setSelection}\n  onSubmit={sendMessage}\n/>",
      },
      {
        title: "Provider switching",
        body: "The picker groups models by provider instance and remembers the last selected model for each instance, matching the T3 Code interaction model.",
        code: "type ModelSelection = {\n  instanceId: string\n  model: string\n}",
      },
      {
        title: "Provider catalog",
        body: "Pass runtime-reported providers in production. Each instance owns its availability and model list, so custom accounts never leak models into another provider.",
        code: "type AgentProvider = {\n  instanceId: string\n  driver: string\n  status: \"ready\" | \"unavailable\"\n  models: AgentModel[]\n}",
      },
    ],
  },
  {
    slug: "theming",
    title: "Theming",
    description: "Customize the template with the same CSS-variable model used by shadcn/ui.",
    group: "Customization",
    sections: [
      {
        title: "CSS variables",
        body: "Change semantic tokens once and every primitive follows your product theme.",
        code: ":root {\n  --primary: oklch(0.205 0 0);\n  --radius: 0.625rem;\n}",
      },
      {
        title: "Dark mode",
        body: "The template uses a class on the document root, with system preference as the initial fallback.",
      },
    ],
  },
]

export const docGroups = ["Get Started", "Components", "Customization"] as const

export function findDoc(slug: string) {
  return docs.find((doc) => doc.slug === slug)
}
