import Link from "next/link"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@agent-ui/ui/button"
import { Separator } from "@agent-ui/ui/separator"
import { type DocPage, docs } from "@/lib/docs"

export function DocArticle({ doc }: { doc: DocPage }) {
  const current = docs.findIndex((candidate) => candidate.slug === doc.slug)
  const previous = docs[current - 1]
  const next = docs[current + 1]

  return (
    <main className="min-w-0">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_180px] lg:py-14">
        <article className="min-w-0">
          <p className="mb-2 text-sm font-medium text-muted-foreground">{doc.group}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{doc.description}</p>
          <Separator className="my-9" />
          <div className="space-y-12">
            {doc.sections.map((section) => (
              <section key={section.title} id={section.title.toLowerCase().replaceAll(" ", "-")} className="scroll-mt-24">
                <h2 className="mb-3 text-xl font-semibold tracking-tight">{section.title}</h2>
                <p className="leading-7 text-muted-foreground">{section.body}</p>
                {section.code ? (
                  <div className="relative mt-5 overflow-hidden rounded-lg border bg-muted/40">
                    <CopyButton value={section.code} />
                    <pre className="overflow-x-auto p-4 pr-12 text-sm leading-6"><code>{section.code}</code></pre>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
          <div className="mt-14 flex items-center justify-between border-t pt-6">
            {previous ? <Button variant="ghost" asChild><Link href={`/docs/${previous.slug}`}><ArrowLeft />{previous.title}</Link></Button> : <span />}
            {next ? <Button variant="ghost" asChild><Link href={`/docs/${next.slug}`}>{next.title}<ArrowRight /></Link></Button> : null}
          </div>
        </article>
        <aside className="hidden lg:block">
          <div className="sticky top-24 text-sm">
            <p className="mb-3 font-medium">On this page</p>
            <div className="space-y-2 border-l pl-4">
              {doc.sections.map((section) => <a key={section.title} href={`#${section.title.toLowerCase().replaceAll(" ", "-")}`} className="block text-muted-foreground hover:text-foreground">{section.title}</a>)}
            </div>
            <div className="mt-8 rounded-lg border p-3 text-xs text-muted-foreground"><Check className="mb-2 size-4 text-emerald-500" />Works with React Server Components and the Next.js App Router.</div>
          </div>
        </aside>
      </div>
    </main>
  )
}
