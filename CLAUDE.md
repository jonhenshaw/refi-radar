# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Refi Radar is a near-real-time mortgage-rate dashboard that helps the user decide when to refinance. The product question it must answer well: "are rates good enough today that I should call a lender?" Source transparency, freshness, and confidence labels are first-class — never display an unlabeled rate.

## Workspace layout

pnpm monorepo (`pnpm-workspace.yaml` → `apps/*`, `packages/*`):

- `apps/web` — React 19 + Vite + Tailwind v4 frontend, deployed to Cloudflare via `apps/web/wrangler.toml` (assets-only, SPA routing).
- `apps/worker` — Hono-based Cloudflare Worker exposing the JSON API and the `*/15 * * * *` scheduled collector. Bindings: `DB` (D1 `refi-radar-prod`), `REFI_RADAR_CACHE` (KV).
- `packages/shared` — TypeScript types (`SourceId`, `RateObservation`, `LatestSnapshot`, `AlertRule`, `Range`), finance math, and alert-evaluation logic. `main` points at `src/index.ts` directly — no build step; consumers import the TS source via `workspace:^`.
- `scripts/backfill_last_12_months.py` — emits D1 SQL for historical seeding from MND embed + FRED CSV.
- `docs/architecture/{overview,data-sources}.md` and `docs/plans/` — read these before making structural changes.
- `sketches/` — standalone UI prototypes, not wired into the app.

## Commands

Run from repo root unless noted. All scripts use pnpm workspace filters.

- `pnpm install` — install all workspace deps.
- `pnpm dev` — runs `@refi-radar/web` (Vite on 5173) and `@refi-radar/worker` (`wrangler dev` on 8787) in parallel. Vite proxies `/api` → `127.0.0.1:8787`.
- `pnpm build` — recursive build across packages.
- `pnpm test` — recursive `vitest run`. To run a single package: `pnpm --filter @refi-radar/web test` (or `@refi-radar/worker`, `@refi-radar/shared`). Single file: `pnpm --filter @refi-radar/worker exec vitest run src/routes/series.test.ts`. Watch a single test by name: add `-t "pattern"`.
- `pnpm typecheck` / `pnpm lint` — both run `tsc --noEmit` per package; there is no separate ESLint config.
- Worker deploy: `pnpm --filter @refi-radar/worker deploy` (uses `apps/worker/wrangler.toml`).

## Architecture

Data flow (see `docs/architecture/overview.md`):

```
Cron (*/15) → collectAllSources(env)
  → MND adapter + FRED adapter
  → insertObservation → D1 rate_observations (UNIQUE on source_id+observed_at+rate dedupes)
  → refreshLatestCache → KV `latest-snapshot` (TTL 90s)

GET /api/latest      → KV snapshot (or buildLatestSnapshot from D1)
GET /api/series      → D1 read, range-windowed
GET /api/series/compare
POST /api/refi/calculate
POST /api/collector/run  (manual trigger)
```

The frontend polls `/api/latest` every 60s and fetches compare-series on range change. If the API returns no observations or fails, it falls back to `demoData` and surfaces a "sample data" banner — keep this fallback path intact when changing API shapes.

### Source adapters (`apps/worker/src/collectors/`)

Each source is one isolated adapter producing a normalized `RateObservation` with a `confidence` tag (`market_estimate` | `weekly_survey` | `proxy` | `user_derived`). When adding sources: add the `SourceId` literal in `packages/shared/src/types.ts`, the adapter in `collectors/`, the route allowlist in `apps/worker/src/routes/series.ts` (`SUPPORTED_SOURCES`), and the theme metadata in `apps/web/src/lib/sourceTheme.ts`. MND is scrape-based and fragile by design — keep parsing in one place and store evidence in `raw_json`.

### Shared types are the contract

`packages/shared` is the single source of truth for `SourceId`, observation/snapshot shapes, ranges, and alert rule types. Worker routes, DB queries, and the web client all import from `@refi-radar/shared`. Change types there first; both apps will fail typecheck if they drift.

### Alerts

Alert rules live client-side in `localStorage` (see `apps/web/src/hooks/useAlertRules.ts`); evaluation runs in the browser via `useAlertEvaluator` against the latest snapshot + series. The `AlertRule` type and rule kinds are defined in `packages/shared`. Server-side `alert_rules` / `alert_events` tables exist in the D1 schema but the MVP path is local-only.

## Conventions worth knowing

- Cloudflare-first hosting; the system is intentionally hybrid-ready so a local Playwright collector can `POST /api/collector/push` with HMAC if a source blocks Workers. Do not add features that assume always-Cloudflare fetch.
- Dark mode is the only mode. Tailwind v4 via `@tailwindcss/vite`; theme tokens (`bg`, `fg`, `fg-muted`, `surface-1`, `line`, `warn`, etc.) are defined in `apps/web/src/styles.css`.
- Tests use Vitest. Web tests run in `jsdom` with the setup at `apps/web/src/test/setup.ts`. Worker tests run in default Node env.
- D1 schema lives in `apps/worker/src/db/schema.sql`. Apply with `wrangler d1 execute refi-radar-prod --file=apps/worker/src/db/schema.sql` (add `--local` for the local dev DB).
- Compatibility date `2026-05-05` is set in both `wrangler.toml` files — keep them aligned when bumping.
