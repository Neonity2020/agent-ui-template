# Agent UI Template — Working Notes

## Structure

- `apps/web`: Next.js chat UI, authentication, database persistence, and cloud-hosted chat API.
- `apps/local-runner`: loopback-only Pi Agent runner for local file/tool access.
- `packages/ui`: shared UI components.

## Local development

- Standard web development: `pnpm dev`.
- Web UI with Pi Runner transport enabled: `pnpm --filter @agent-ui/web dev:local`.
- Pi Runner only: `pnpm --filter @agent-ui/local-runner run dev:local`.
- To start both from the repository root, use `pnpm dev:local`. Do not also start a separate Runner on port 4242.
- The local Runner accepts requests only from localhost/127.0.0.1 browser origins and exposes `GET /health` and `POST /v1/prompt`.

## Pi Runner behavior

- The Runner uses the locally installed, authenticated Pi SDK and defaults its workspace to this repository.
- Default enabled tools are read-only (`read`, `grep`, `find`, `ls`); `dev:local` additionally enables `edit` and `write`. Bash is opt-in via `--allow-bash`.
- The browser selects **Pi Local Runner** in the API settings. `NEXT_PUBLIC_PI_RUNNER_URL` is set by the web `dev:local` script.
- Pi generations stream directly from the browser to `127.0.0.1`; conversation metadata and messages are persisted through the same-origin `/api/chat/persist` endpoint.
- A Vercel-hosted browser cannot reliably access a user’s local loopback service. This direct transport is for local development; production requires a desktop/native bridge, extension, or a separate secure runner architecture.

## Validation

- Run `pnpm --filter @agent-ui/web lint` after web changes.
- Run `node --check apps/local-runner/src/index.mjs` after Runner changes.
- Never commit credentials, local Pi configuration, or workspace contents.
