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

## Development

Requires Node.js >= 20.9 and pnpm >= 10.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

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
