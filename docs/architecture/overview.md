# Architecture Overview

## Product thesis

Refi Radar should answer one question better than generic rate sites:

> Are rates good enough today that Jon should call a lender?

The chart matters, but the app becomes useful when it combines source freshness, rate trends, refinance math, and alerts.

## System architecture

```text
Cloudflare Scheduled Worker
  -> source adapters
  -> normalized observations
  -> D1 rate_observations
  -> KV latest snapshot
  -> alert evaluator
  -> Telegram/email/browser notification

Cloudflare Pages frontend
  -> /api/latest
  -> /api/series
  -> /api/alerts
  -> dark realtime dashboard
```

## Hybrid extension

If a data source blocks Cloudflare Workers or requires browser automation:

```text
Local collector on Mac mini
  -> Playwright/API source fetch
  -> signed POST /api/collector/push
  -> Worker verifies HMAC
  -> D1/KV/alerts as usual
```

Cloudflare remains the canonical hosting and API layer.

## Apps and packages

- `apps/web`: user interface, charting, calculator, settings.
- `apps/worker`: API routes, scheduled collectors, alert evaluation, persistence.
- `packages/shared`: source IDs, types, finance utilities, validation schemas.

## Runtime responsibilities

### Frontend

- Render latest status cards.
- Render multi-source time-series chart.
- Render refinance calculator.
- Manage alert-rule UI.
- Poll `/api/latest` every 60 seconds for MVP.

### Worker

- Serve JSON API.
- Run scheduled collectors.
- Normalize every source into the same observation format.
- De-duplicate observations.
- Cache latest snapshot.
- Evaluate alert rules with cooldowns.

### D1

Stores durable history:

- sources
- rate observations
- alert rules
- loan profiles
- alert events

### KV

Stores ephemeral/read-heavy data:

- latest snapshot
- source health
- last collector status

## Design principles

- Dark mode first.
- Source transparency everywhere.
- Never imply mortgage rates are tick-by-tick precise.
- Treat MND/latest market rates as estimates.
- Treat Freddie/FRED as authoritative weekly survey.
- Keep source adapters isolated and replaceable.
