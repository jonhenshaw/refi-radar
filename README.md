# Refi Radar

A near-real-time mortgage-rate monitoring dashboard for refinance decisions.

## Goal

Track 30-year fixed mortgage rates, source freshness, market proxies, and refinance triggers in a beautiful dark-mode web app.

## Recommended architecture

- `apps/web`: React + Vite + TypeScript frontend deployed to Cloudflare Pages.
- `apps/worker`: Cloudflare Worker API with scheduled collectors, D1 persistence, and KV latest-cache.
- `packages/shared`: Shared TypeScript types and finance math.
- Optional later: local Playwright collector that pushes signed observations to the Worker.

## Primary data sources

- Mortgage News Daily 30Y fixed: near-current market estimate, scrape/adapter isolated.
- FRED/Freddie Mac `MORTGAGE30US`: authoritative weekly survey/history.
- FRED `DGS10`: 10Y Treasury proxy.
- Future: paid market/MBS feeds if needed.

## Important docs

- `docs/architecture/overview.md`
- `docs/architecture/data-sources.md`
- `docs/plans/2026-05-05-refi-radar-implementation-plan.md`

## Initial development commands

These will become active after Task 1 of the implementation plan creates package files:

```bash
pnpm install
pnpm dev
pnpm test
```

## Deployment target

Start Cloudflare-first:

- Cloudflare Pages for `apps/web`
- Cloudflare Worker for `apps/worker`
- D1 for time-series observations
- KV for latest snapshots/cache

Keep the system hybrid-ready so a local collector can push signed data if Cloudflare cannot reliably fetch a source.
