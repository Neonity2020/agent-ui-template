import { Bot, Check, Code2, FileCode2, GitBranch, Plus, Terminal, User } from "lucide-react"

import { AgentComposer } from "@/components/agent-composer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const threads = ["Build the onboarding flow", "Fix streaming messages", "Review API contracts"]

export function AgentPreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-2xl shadow-black/10">
      <div className="flex h-11 items-center border-b px-4">
        <div className="flex gap-1.5" aria-hidden="true"><i /><i /><i /></div>
        <div className="mx-auto flex items-center gap-2 text-xs text-muted-foreground"><GitBranch className="size-3.5" />main</div>
      </div>
      <div className="grid min-h-[540px] md:grid-cols-[220px_1fr]">
        <aside className="hidden border-r bg-muted/30 p-3 md:block">
          <Button variant="outline" className="mb-4 w-full justify-start"><Plus />New thread</Button>
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recent</p>
          <div className="space-y-1">
            {threads.map((thread, index) => (
              <div key={thread} className={`rounded-md px-2.5 py-2 text-xs ${index === 0 ? "bg-accent font-medium" : "text-muted-foreground"}`}>{thread}</div>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <div className="flex h-12 items-center border-b px-4">
            <div><p className="text-sm font-medium">Build the onboarding flow</p><p className="text-[11px] text-muted-foreground">agent-ui-template</p></div>
            <Badge className="ml-auto gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-500" />Connected</Badge>
          </div>
          <div className="flex-1 space-y-6 p-4 sm:p-6">
            <div className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted"><User className="size-3.5" /></span>
              <div><p className="mb-1 text-xs font-medium">You</p><p className="text-sm text-muted-foreground">Create a focused onboarding flow for a new workspace.</p></div>
            </div>
            <div className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Bot className="size-3.5" /></span>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium">Agent</p>
                <p className="text-sm leading-6 text-muted-foreground">I’ll trace the current entry flow, then add the smallest onboarding surface that fits the existing design system.</p>
                <div className="mt-3 overflow-hidden rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-xs"><Terminal className="size-3.5" />Inspected project structure <Check className="ml-auto size-3.5 text-emerald-500" /></div>
                  <div className="flex items-center gap-2 px-3 py-2 text-xs"><FileCode2 className="size-3.5" />Editing <code>app/onboarding/page.tsx</code></div>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border bg-[#0d1117] text-xs text-zinc-300">
                  <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2"><Code2 className="size-3.5" />page.tsx <span className="ml-auto text-emerald-400">+24</span></div>
                  <pre className="overflow-x-auto p-3 leading-5"><code><span className="text-violet-300">export default</span> <span className="text-blue-300">function</span> Onboarding() {'{'}{`\n`}  <span className="text-violet-300">return</span> &lt;WorkspaceSetup /&gt;{`\n`}{'}'}</code></pre>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 pt-0 sm:p-6 sm:pt-0">
            <AgentComposer />
          </div>
        </div>
      </div>
    </div>
  )
}
