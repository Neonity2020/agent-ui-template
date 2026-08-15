import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "@/db/schema"

type Db = ReturnType<typeof createDb>

let instance: Db | null = null

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy apps/web/.env.example to apps/web/.env.local and add your Neon connection string.",
    )
  }
  const sql = neon(url)
  return drizzle({ client: sql, schema })
}

/** Lazily created so build-time module evaluation never touches the database. */
export function getDb(): Db {
  if (!instance) instance = createDb()
  return instance
}
