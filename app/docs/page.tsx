import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Blocks, Code2, Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Introduction" }

export default function DocsPage() {
  return (
    <main className="min-w-0">
      <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 lg:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Introduction</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">Agent UI is a set of beautifully designed, accessible components and application patterns for building agent products.</p>
        <div className="my-10 rounded-lg border-l-4 border-l-primary bg-muted/40 p-4 text-sm leading-6">This is not an agent runtime. It is the open visual layer between your users and whichever model, transport, or orchestration system you choose.</div>
        <h2 className="text-2xl font-semibold tracking-tight">Principles</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Code2, title: "Open code", text: "Every component lives in your project and remains yours to change." },
            { icon: Blocks, title: "Composable", text: "Use one primitive or assemble the complete agent workspace." },
            { icon: Palette, title: "Beautiful defaults", text: "A quiet, focused interface that adapts to your brand." },
          ].map(({ icon: Icon, title, text }) => <Card key={title} className="shadow-none"><CardHeader className="p-5"><Icon className="mb-2 size-5" /><CardTitle className="text-base">{title}</CardTitle><CardDescription className="leading-6">{text}</CardDescription></CardHeader></Card>)}
        </div>
        <h2 className="mt-12 text-2xl font-semibold tracking-tight">Start building</h2>
        <p className="mt-3 leading-7 text-muted-foreground">Create the project, copy the components you need, then connect your own agent backend.</p>
        <Button className="mt-5" asChild><Link href="/docs/quick-start">Quick Start <ArrowRight /></Link></Button>
      </article>
    </main>
  )
}
