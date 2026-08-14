import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { docGroups, docs } from "@/lib/docs"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r md:block">
          <nav className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-6 lg:p-8" aria-label="Documentation">
            <Link href="/docs" className="mb-6 block text-sm font-medium">Introduction</Link>
            <div className="space-y-7">
              {docGroups.map((group) => (
                <div key={group}>
                  <p className="mb-2 text-sm font-medium">{group}</p>
                  <div className="space-y-1">
                    {docs.filter((doc) => doc.group === group).map((doc) => (
                      <Link key={doc.slug} href={`/docs/${doc.slug}`} className="block py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">{doc.title}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </aside>
        {children}
      </div>
    </div>
  )
}
