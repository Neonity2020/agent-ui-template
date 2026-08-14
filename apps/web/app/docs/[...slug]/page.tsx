import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocArticle } from "@/components/doc-article"
import { docs, findDoc } from "@/lib/docs"

type PageProps = { params: Promise<{ slug: string[] }> }

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug.split("/") }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const doc = findDoc((await params).slug.join("/"))
  return doc ? { title: doc.title, description: doc.description } : {}
}

export default async function DocumentationPage({ params }: PageProps) {
  const doc = findDoc((await params).slug.join("/"))
  if (!doc) notFound()
  return <DocArticle doc={doc} />
}
