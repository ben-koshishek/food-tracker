# Food Tracker

Calorie/nutrition tracker — local-only storage (IndexedDB via Dexie), Open Food Facts API, deployed to GitHub Pages.

## Commands

- `pnpm dev` - Dev server (port 5001)
- `pnpm build` - Type check + production build
- `pnpm test:run` - Run tests once
- `pnpm lint` - ESLint
- `pnpm format` - Prettier (write)
- `pnpm format:check` - Prettier (check only)

## Conventions

### Git

- Push to `main` directly (no feature branches)
- Commit: gitmoji + short imperative description (`✨ Add barcode scanner`, `🐛 Fix calorie rounding`)
- One logical change per commit

### Code

- Prettier + ESLint enforced via pre-commit hook (Husky + lint-staged)
- Single quotes, semicolons, 4-space indent, 100 char width
- Functional components, named exports
- Local state only (`useState` + `useMemo`) — no global state library
- shadcn/ui for UI primitives

### Testing

- Unit tests for `lib/` functions only (`src/lib/__tests__/`)
- No component tests (vitest runs in `node` env, no jsdom)

## Gotchas

- Vite base URL: `/` in dev, `/food-tracker/` in build (GitHub Pages)
- Open Food Facts API proxied through `/api/off` in dev (see `vite.config.ts`)
- CI pipeline: type check → lint → format check → test → build → deploy
- Dexie DB has 4 schema versions — check `src/lib/db.ts` before adding migrations

@.claude/PRD.md
@.claude/refactoring-ui-notes.md
