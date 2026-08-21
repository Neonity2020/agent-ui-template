# Agent UI

A pnpm monorepo with Next.js 16 and shadcn/ui for agent products.

## Structure

```
├── apps/
│   └── web/            # Next.js app (landing page, docs, agent workspace preview)
├── packages/
│   └── ui/             # @agent-ui/ui — shared shadcn/ui primitives and cn helper
├── pnpm-workspace.yaml
└── tsconfig.base.json  # shared TypeScript base config
```

## Included

- Landing page with a responsive agent workspace preview
- Documentation system with sidebar navigation and static routes
- Agent shell, message, composer, and theming guides
- Light and dark themes built from shadcn/ui CSS variables

## Design inspiration

The UI is inspired by **T3 Code (t3.codes)**. The agent workspace preview on the landing page carries its signature look: a window chrome with traffic-light dots, a `main` branch indicator, a thread sidebar, agent messages with tool-activity cards ("Inspected project structure", "Editing app/onboarding/page.tsx"), and a GitHub-dark terminal-style code block showing a live diff.

## Development

Requires Node.js >= 20.9 and pnpm >= 10.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Authentication

Email/password auth is powered by [Better Auth](https://www.better-auth.com) with [Drizzle ORM](https://orm.drizzle.team) on a [Neon](https://neon.tech) Postgres database.

### Setup

1. Create a database at [console.neon.tech](https://console.neon.tech) and copy its connection string.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in:

   ```
   DATABASE_URL=postgresql://…
   BETTER_AUTH_SECRET=<generated with: npx better-auth secret>
   BETTER_AUTH_URL=http://localhost:3000
   ```

3. Push the schema to your database:

   ```bash
   cd apps/web
   npx drizzle-kit push
   ```

4. Restart the dev server. Sign up at `http://localhost:3000/sign-up`.

The auth handlers live at `/api/auth/*`; the header shows a sign-in button or a user menu once signed in. Chat works without an account, while signed-in users get persistent per-agent chat history.

## Commands

| Command      | Description                    |
| ------------ | ------------------------------ |
| `pnpm dev`   | Start the web app dev server   |
| `pnpm build` | Production build               |
| `pnpm lint`  | Lint all workspace packages    |
| `pnpm test`  | Run tests in all packages      |
| `pnpm check` | Lint + test + build            |

## Adding components

The web app aliases shadcn primitives to `@agent-ui/ui`. Run `pnpm dlx shadcn@latest add <component>` inside `apps/web` to install new components, then move shared ones into `packages/ui` if needed.
