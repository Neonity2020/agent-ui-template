import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Braces, Copy, Layers3, MessagesSquare, ShieldCheck } from "lucide-react";

import { AgentPreview } from "@/components/agent-preview";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Agent UI",
  description: "Open source components and patterns for building agent products.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="hero-grid border-b">
          <div className="mx-auto max-w-[1400px] px-4 py-20 text-center sm:px-6 sm:py-28">
            <Badge className="mb-6 gap-2 bg-background"><span className="size-1.5 rounded-full bg-emerald-500" />Built for Next.js 16</Badge>
            <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">The open source UI foundation for agent products.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">Beautifully designed, accessible components for conversations, tools, approvals, diffs, and long-running agent work. Open code. Bring your own runtime.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="default" asChild><Link href="/docs">Browse the docs <ArrowRight /></Link></Button>
              <Button variant="outline" asChild><Link href="/docs/components/agent-shell">View components</Link></Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-20">
          <AgentPreview />
        </section>

        <section className="border-y bg-muted/20">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
            <div className="mb-10 max-w-2xl"><p className="mb-2 text-sm font-medium">Designed for the real workflow</p><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A solid surface for agents that do more than chat.</h2></div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: MessagesSquare, title: "Conversation primitives", text: "Messages, streaming states, composers, approvals, and tool activity that compose cleanly." },
                { icon: Layers3, title: "Workspace ready", text: "Threads, files, diffs, terminals, and responsive navigation arranged into one obvious shell." },
                { icon: ShieldCheck, title: "Accessible defaults", text: "Keyboard-friendly controls, semantic markup, focus states, and light and dark themes included." },
              ].map(({ icon: Icon, title, text }) => (
                <Card key={title} className="bg-background shadow-none"><CardHeader><span className="mb-3 grid size-9 place-items-center rounded-md border"><Icon className="size-4" /></span><CardTitle>{title}</CardTitle><CardDescription className="leading-6">{text}</CardDescription></CardHeader></Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div><p className="mb-2 text-sm font-medium">Copy, paste, own it</p><h2 className="text-3xl font-semibold tracking-tight">Built on shadcn/ui, not hidden behind a package.</h2><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Use the complete template or lift a single component. The visual layer stays separate from your model provider, transport, and persistence choices.</p><Button variant="outline" className="mt-6" asChild><Link href="/docs/quick-start">Get started <ArrowRight /></Link></Button></div>
          <div className="overflow-hidden rounded-xl border bg-[#0d1117] text-zinc-300 shadow-xl"><div className="flex items-center border-b border-white/10 px-4 py-3 text-xs"><Braces className="mr-2 size-4" />Terminal <Copy className="ml-auto size-3.5" /></div><pre className="overflow-x-auto p-5 text-sm leading-7"><code><span className="text-zinc-500"># Create the app</span>{`\n`}npx create-next-app@latest agent-app{`\n\n`}<span className="text-zinc-500"># Add your UI</span>{`\n`}npx shadcn@latest add button card</code></pre></div>
        </section>
      </main>
      <footer className="border-t"><div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6"><p>Built with Next.js and shadcn/ui.</p><p className="sm:ml-auto">Open code for your next agent product.</p></div></footer>
    </div>
  );
}
