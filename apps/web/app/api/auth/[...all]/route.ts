import { toNextJsHandler } from "better-auth/next-js"

import { getAuth } from "@/lib/auth"

// Handlers are created lazily on first request so that build-time module
// evaluation never requires DATABASE_URL to be set.
let handlers: ReturnType<typeof toNextJsHandler> | null = null

function getHandlers() {
  if (!handlers) handlers = toNextJsHandler(getAuth())
  return handlers
}

export const GET = (request: Request) => getHandlers().GET(request)
export const POST = (request: Request) => getHandlers().POST(request)
