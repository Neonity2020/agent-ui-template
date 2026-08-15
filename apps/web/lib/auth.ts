import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth"

import { getDb } from "@/db"
import * as schema from "@/db/schema"

function createAuth() {
  const db = getDb()
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      // Disable email verification requirements for now; flip this on once
      // transactional email is wired up.
      requireEmailVerification: false,
    },
  })
}

type Auth = ReturnType<typeof createAuth>

let instance: Auth | null = null

/**
 * Lazily created so the database is only connected on the first request —
 * builds and unrelated routes never touch DATABASE_URL.
 */
export function getAuth(): Auth {
  if (!instance) instance = createAuth()
  return instance
}
