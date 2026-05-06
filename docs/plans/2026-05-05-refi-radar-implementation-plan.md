# Refi Radar Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a beautiful dark-mode mortgage-rate monitoring application that tracks 30-year fixed rates, market proxies, historical trends, refinance break-even math, and alert triggers.

**Architecture:** Use a Cloudflare-first monorepo with a React/Vite frontend, Cloudflare Worker API, D1 database, KV latest cache, scheduled source collectors, and a hybrid-ready signed collector endpoint for future local Playwright/premium-data ingestion.

**Tech Stack:** TypeScript, pnpm workspaces, React, Vite, Tailwind CSS, TradingView Lightweight Charts or ECharts, Hono, Cloudflare Workers, D1, KV, Vitest, Playwright.

---

## Current repository state

Repository root:

```text
/Users/henny/workplace/refi-radar
```

Initial docs already created:

```text
README.md
docs/architecture/overview.md
docs/architecture/data-sources.md
docs/plans/2026-05-05-refi-radar-implementation-plan.md
apps/web/src/
apps/worker/src/
packages/shared/src/
```

---

## Product requirements

### Must have

- Dark-mode dashboard with polished X/Linear-inspired visual design.
- Latest 30-year fixed mortgage-rate status card.
- Historical line chart.
- Multiple source support:
  - Mortgage News Daily 30Y fixed market estimate.
  - FRED/Freddie Mac `MORTGAGE30US` weekly survey.
  - FRED `DGS10` 10Y Treasury proxy.
- Source labels and timestamps everywhere.
- Refinance calculator:
  - Current loan balance.
  - Current rate.
  - Remaining term.
  - New rate.
  - Closing costs.
  - Monthly savings.
  - Break-even months.
- Alert-rule model ready for Telegram/email/browser alerts.

### Should have

- Cloudflare D1 persistence.
- Cloudflare scheduled collection.
- KV latest snapshot.
- Health status for each data source.
- Signed collector endpoint for future local data pushes.

### Explicit non-goals for MVP

- User authentication.
- Public multi-user SaaS features.
- Paid mortgage/MBS feed integration.
- Lender-specific quote automation.
- True tick-by-tick mortgage-rate claims.

---

## Data model

### `sources`

```sql
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  url TEXT,
  cadence_minutes INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### `rate_observations`

```sql
CREATE TABLE IF NOT EXISTS rate_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rate REAL NOT NULL,
  change_bps REAL,
  confidence TEXT NOT NULL,
  raw_json TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id),
  UNIQUE(source_id, observed_at, rate)
);

CREATE INDEX IF NOT EXISTS idx_rate_observations_source_time
ON rate_observations(source_id, observed_at);
```

### `loan_profiles`

```sql
CREATE TABLE IF NOT EXISTS loan_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  current_balance REAL,
  current_rate REAL,
  remaining_months INTEGER,
  estimated_closing_costs REAL,
  target_rate REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### `alert_rules`

```sql
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  source_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  threshold REAL,
  threshold_bps REAL,
  enabled INTEGER NOT NULL DEFAULT 1,
  cooldown_minutes INTEGER NOT NULL DEFAULT 360,
  last_triggered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
```

### `alert_events`

```sql
CREATE TABLE IF NOT EXISTS alert_events (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  triggered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json TEXT NOT NULL,
  delivered_at TEXT,
  delivery_status TEXT,
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
);
```

---

## API contract

### `GET /api/latest`

Returns latest snapshot across sources.

```json
{
  "primary": {
    "sourceId": "mnd_30y_fixed",
    "label": "Mortgage News Daily 30Y",
    "rate": 6.54,
    "changeBps": -2,
    "observedAt": "2026-05-05T17:28:44Z",
    "confidence": "market_estimate"
  },
  "sources": [],
  "health": []
}
```

### `GET /api/series?source=mnd_30y_fixed&range=1M`

Returns one chart series.

### `GET /api/series/compare?sources=mnd_30y_fixed,fred_mortgage30us,fred_dgs10&range=1Y`

Returns multi-source chart data.

### `POST /api/collector/run`

Manual dev-only collector trigger.

### `POST /api/collector/push`

Signed hybrid/local collector ingestion endpoint.

### `POST /api/refi/calculate`

Calculates monthly payment, savings, and break-even.

### `GET /api/alerts` / `POST /api/alerts` / `PATCH /api/alerts/:id`

Manage alert rules.

---

## Implementation tasks

### Task 1: Create monorepo package scaffolding

**Objective:** Make the repo installable and ready for TypeScript development.

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `tsconfig.base.json`
- Create: `apps/web/package.json`
- Create: `apps/worker/package.json`
- Create: `packages/shared/package.json`

**Step 1: Create root package files**

`package.json`:

```json
{
  "name": "refi-radar",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm --parallel --filter @refi-radar/web --filter @refi-radar/worker dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint"
  },
  "packageManager": "pnpm@9.15.0",
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

`.gitignore`:

```gitignore
node_modules/
dist/
.wrangler/
.dev.vars
.env
.env.*
!.env.example
.DS_Store
coverage/
playwright-report/
test-results/
```

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

**Step 2: Create workspace package files**

Create minimal package files with `build`, `test`, and `typecheck` scripts.

**Step 3: Verify**

Run:

```bash
pnpm install
pnpm -r typecheck
```

Expected:

- `pnpm-lock.yaml` is created.
- Typecheck either passes or no-op passes for empty packages.

**Step 4: Commit**

```bash
git add .
git commit -m "chore: scaffold refi radar monorepo"
```

---

### Task 2: Add shared domain types and finance math tests

**Objective:** Define canonical source IDs, observations, and mortgage-payment calculations.

**Files:**

- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/finance.ts`
- Create: `packages/shared/src/finance.test.ts`
- Create: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`

**Step 1: Write failing tests**

Test cases:

- 30-year payment calculation for balance/rate/months.
- zero-rate edge case.
- monthly savings.
- break-even months.

**Step 2: Implement finance utilities**

Functions:

- `monthlyPayment(principal, annualRatePercent, months)`
- `monthlySavings(currentPayment, newPayment)`
- `breakEvenMonths(closingCosts, monthlySavings)`

**Step 3: Add types**

Types:

- `SourceId`
- `RateObservation`
- `SourceHealth`
- `LatestSnapshot`
- `AlertRule`
- `LoanProfile`

**Step 4: Verify**

Run:

```bash
pnpm --filter @refi-radar/shared test
pnpm --filter @refi-radar/shared typecheck
```

Expected: tests pass.

**Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add mortgage finance utilities and domain types"
```

---

### Task 3: Create Worker app with Hono and health endpoint

**Objective:** Establish Cloudflare Worker API foundation.

**Files:**

- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/src/env.ts`
- Create: `apps/worker/wrangler.toml`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/vitest.config.ts`
- Create: `apps/worker/src/index.test.ts`

**Step 1: Write failing test**

Test `GET /api/health` returns `{ ok: true }`.

**Step 2: Implement Worker app**

Use Hono.

Routes:

- `GET /api/health`
- `GET /api/latest` with static placeholder response until DB exists.

**Step 3: Verify**

Run:

```bash
pnpm --filter @refi-radar/worker test
pnpm --filter @refi-radar/worker dev
```

Expected:

- Test passes.
- Local Worker serves health endpoint.

**Step 4: Commit**

```bash
git add apps/worker
git commit -m "feat(worker): add api foundation"
```

---

### Task 4: Add D1 schema and query layer

**Objective:** Persist sources, observations, loan profiles, and alert rules.

**Files:**

- Create: `apps/worker/src/db/schema.sql`
- Create: `apps/worker/src/db/queries.ts`
- Create: `apps/worker/src/db/queries.test.ts`
- Modify: `apps/worker/wrangler.toml`

**Step 1: Add SQL schema**

Use the schema defined earlier in this plan.

**Step 2: Write tests**

Test query helpers with Miniflare or a mocked D1 interface:

- insert source
- insert observation
- get latest per source
- get series by range
- de-duplicate duplicate observation

**Step 3: Implement query helpers**

Functions:

- `upsertSource(db, source)`
- `insertObservation(db, observation)`
- `getLatestObservations(db)`
- `getSeries(db, sourceId, range)`

**Step 4: Verify**

Run:

```bash
pnpm --filter @refi-radar/worker test
wrangler d1 execute refi-radar-dev --local --file apps/worker/src/db/schema.sql
```

Expected: schema applies locally.

**Step 5: Commit**

```bash
git add apps/worker
git commit -m "feat(worker): add d1 schema and queries"
```

---

### Task 5: Implement FRED collectors

**Objective:** Fetch and normalize authoritative weekly mortgage and daily Treasury data.

**Files:**

- Create: `apps/worker/src/collectors/fred.ts`
- Create: `apps/worker/src/collectors/fred.test.ts`
- Modify: `apps/worker/src/index.ts`

**Step 1: Write failing parser tests**

Use sample CSV text for:

- `MORTGAGE30US`
- `DGS10`
- missing value `.` rows
- latest valid row extraction

**Step 2: Implement parser**

Functions:

- `parseFredCsv(csv, sourceId, confidence)`
- `fetchFredSeries(seriesId)`

**Step 3: Add collector runner**

Function:

- `collectFredSources(env)`

**Step 4: Verify live fetch manually**

Run local Worker endpoint or test script to fetch:

```text
https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US
https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10
```

Expected: latest valid observations inserted.

**Step 5: Commit**

```bash
git add apps/worker/src/collectors/fred.ts apps/worker/src/collectors/fred.test.ts
 git commit -m "feat(worker): collect fred mortgage and treasury rates"
```

---

### Task 6: Implement Mortgage News Daily adapter

**Objective:** Fetch and parse MND 30Y fixed market estimate while keeping scraping isolated.

**Files:**

- Create: `apps/worker/src/collectors/mnd.ts`
- Create: `apps/worker/src/collectors/mnd.test.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `docs/architecture/data-sources.md` if extraction strategy changes

**Step 1: Write failing parser tests**

Sample HTML should include:

```html
<div class="product">30YR Fixed Rate</div>
<div class="price">6.54%</div>
<meta property="og:last_updated" content="2026-05-05T17:28:44.4280000Z" />
```

Assert:

- rate = `6.54`
- observedAt is normalized ISO string
- confidence = `market_estimate`

**Step 2: Implement parser**

Function:

- `parseMndThirtyYearFixed(html)`

Use multiple regex fallbacks:

- Header chart pattern.
- Main `30 Yr. Fixed Rate` card pattern.
- OpenGraph last-updated timestamp.

**Step 3: Implement fetcher**

Function:

- `fetchMndThirtyYearFixed()`

Set a reasonable user agent. Timeout via `AbortSignal.timeout`.

**Step 4: Verify live fetch manually**

Run collector locally.

Expected:

- Either insert latest value or return structured source-health error.
- Do not crash entire scheduled job if MND fails.

**Step 5: Commit**

```bash
git add apps/worker/src/collectors/mnd.ts apps/worker/src/collectors/mnd.test.ts docs/architecture/data-sources.md
git commit -m "feat(worker): collect mortgage news daily 30y rate"
```

---

### Task 7: Implement scheduled collection and latest snapshot cache

**Objective:** Wire collectors to Cloudflare scheduled events and cache latest API responses.

**Files:**

- Modify: `apps/worker/src/index.ts`
- Create: `apps/worker/src/services/collect.ts`
- Create: `apps/worker/src/services/latest.ts`
- Create: `apps/worker/src/services/latest.test.ts`
- Modify: `apps/worker/wrangler.toml`

**Step 1: Write tests**

Test that latest snapshot chooses primary source priority:

1. fresh MND
2. FRED mortgage
3. Treasury proxy only as secondary, never as primary mortgage rate

**Step 2: Implement collector orchestration**

Run collectors independently and collect source-health results.

**Step 3: Implement KV cache**

Cache `/api/latest` response with short TTL.

**Step 4: Add scheduled cron**

Suggested `wrangler.toml`:

```toml
[triggers]
crons = ["*/15 * * * *"]
```

**Step 5: Verify**

Run:

```bash
pnpm --filter @refi-radar/worker test
wrangler dev --test-scheduled
```

Expected: scheduled handler can be triggered locally.

**Step 6: Commit**

```bash
git add apps/worker
git commit -m "feat(worker): schedule collectors and cache latest snapshot"
```

---

### Task 8: Implement series API endpoints

**Objective:** Serve chart-ready rate histories.

**Files:**

- Create: `apps/worker/src/routes/series.ts`
- Create: `apps/worker/src/routes/series.test.ts`
- Modify: `apps/worker/src/index.ts`

**Step 1: Write endpoint tests**

Test:

- `GET /api/series?source=fred_mortgage30us&range=1Y`
- invalid source returns 400
- unsupported range returns 400
- compare endpoint returns keyed series

**Step 2: Implement range parsing**

Supported ranges:

- `1D`
- `5D`
- `1M`
- `3M`
- `1Y`
- `5Y`
- `MAX`

**Step 3: Return chart format**

```json
{
  "sourceId": "fred_mortgage30us",
  "points": [{ "time": "2026-04-30", "value": 6.3 }]
}
```

**Step 4: Verify**

Run Worker tests and manually call endpoints.

**Step 5: Commit**

```bash
git add apps/worker/src/routes/series.ts apps/worker/src/routes/series.test.ts apps/worker/src/index.ts
git commit -m "feat(worker): add rate series endpoints"
```

---

### Task 9: Implement refinance calculation API

**Objective:** Expose backend refinance math using shared utilities.

**Files:**

- Create: `apps/worker/src/routes/refi.ts`
- Create: `apps/worker/src/routes/refi.test.ts`
- Modify: `apps/worker/src/index.ts`

**Step 1: Write endpoint tests**

Test valid payload and validation failures.

**Step 2: Implement route**

`POST /api/refi/calculate`

Input:

```json
{
  "currentBalance": 650000,
  "currentRate": 7.125,
  "remainingMonths": 330,
  "newRate": 6.375,
  "closingCosts": 5200
}
```

Output:

```json
{
  "currentPayment": 4510.12,
  "newPayment": 4144.87,
  "monthlySavings": 365.25,
  "breakEvenMonths": 15
}
```

**Step 3: Verify**

Run route tests.

**Step 4: Commit**

```bash
git add apps/worker/src/routes/refi.ts apps/worker/src/routes/refi.test.ts apps/worker/src/index.ts
git commit -m "feat(worker): add refinance calculation endpoint"
```

---

### Task 10: Create React/Vite frontend foundation

**Objective:** Build the frontend shell and design system foundation.

**Files:**

- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`

**Step 1: Install frontend dependencies**

Use:

```bash
pnpm --filter @refi-radar/web add @vitejs/plugin-react vite react react-dom lightweight-charts lucide-react clsx tailwind-merge
pnpm --filter @refi-radar/web add -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom typescript
```

**Step 2: Implement dark shell**

Create:

- Header
- Top metric cards
- Main chart placeholder
- Right-side source health panel
- Refinance calculator placeholder
- Alert panel placeholder

**Step 3: Verify**

Run:

```bash
pnpm --filter @refi-radar/web dev
pnpm --filter @refi-radar/web build
```

Expected: app builds and renders dark layout.

**Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add dark dashboard shell"
```

---

### Task 11: Build data client and dashboard cards

**Objective:** Fetch latest API data and render accurate source cards.

**Files:**

- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/components/MetricCard.tsx`
- Create: `apps/web/src/components/SourceHealth.tsx`
- Modify: `apps/web/src/App.tsx`

**Step 1: Write component tests**

Test:

- metric card formats `6.54%`
- stale source displays warning
- error state displays gracefully

**Step 2: Implement API client**

Functions:

- `getLatest()`
- `getSeries()`
- `calculateRefi()`

**Step 3: Implement polling**

Poll latest every 60 seconds.

**Step 4: Verify**

Run web tests and local dev against Worker.

**Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): render latest rate source cards"
```

---

### Task 12: Build interactive line chart

**Objective:** Display mortgage-rate history beautifully.

**Files:**

- Create: `apps/web/src/components/RateChart.tsx`
- Create: `apps/web/src/components/RangeTabs.tsx`
- Modify: `apps/web/src/App.tsx`

**Step 1: Implement chart component**

Use `lightweight-charts` unless there is a compelling reason to switch to ECharts.

**Step 2: Add range selection**

Supported ranges match API contract.

**Step 3: Add source toggles**

Start with:

- MND 30Y
- Freddie/FRED 30Y
- 10Y Treasury

**Step 4: Verify**

Run app and manually inspect:

- empty state
- one series
- multiple series
- mobile layout

**Step 5: Commit**

```bash
git add apps/web/src/components/RateChart.tsx apps/web/src/components/RangeTabs.tsx apps/web/src/App.tsx
git commit -m "feat(web): add interactive mortgage rate chart"
```

---

### Task 13: Build refinance calculator UI

**Objective:** Let Jon model refinance scenarios directly in the app.

**Files:**

- Create: `apps/web/src/components/RefiCalculator.tsx`
- Create: `apps/web/src/components/RefiCalculator.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Step 1: Write component tests**

Test:

- inputs render
- calculated savings display
- invalid values show helpful errors

**Step 2: Implement calculator**

Fields:

- Current balance
- Current rate
- Remaining term/months
- New rate
- Closing costs

Outputs:

- Current payment
- New payment
- Monthly savings
- Break-even months

**Step 3: Add target-rate line hook**

Expose selected `newRate` to chart as horizontal target line in a later polish task.

**Step 4: Verify**

Run tests and inspect in browser.

**Step 5: Commit**

```bash
git add apps/web/src/components/RefiCalculator.tsx apps/web/src/components/RefiCalculator.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): add refinance calculator"
```

---

### Task 14: Implement alert-rule backend and UI skeleton

**Objective:** Store alert rules and prepare delivery pipeline.

**Files:**

- Create: `apps/worker/src/routes/alerts.ts`
- Create: `apps/worker/src/services/alerts.ts`
- Create: `apps/worker/src/services/alerts.test.ts`
- Create: `apps/web/src/components/AlertsPanel.tsx`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/web/src/App.tsx`

**Step 1: Write backend tests**

Test:

- create threshold alert
- disable alert
- cooldown prevents repeat trigger
- drop-from-high rule evaluates correctly

**Step 2: Implement alert evaluation**

Supported MVP rule types:

- `below_rate`
- `drop_from_recent_high_bps`
- `daily_summary`

**Step 3: Implement UI skeleton**

Allow creating local alert rules, even if delivery is not fully wired.

**Step 4: Verify**

Run tests and create rule locally.

**Step 5: Commit**

```bash
git add apps/worker/src/routes/alerts.ts apps/worker/src/services/alerts.ts apps/web/src/components/AlertsPanel.tsx
git commit -m "feat: add alert rules foundation"
```

---

### Task 15: Add Telegram notification delivery

**Objective:** Send real alerts to Telegram when thresholds trigger.

**Files:**

- Create: `apps/worker/src/services/telegram.ts`
- Create: `apps/worker/src/services/telegram.test.ts`
- Modify: `apps/worker/src/services/alerts.ts`
- Modify: `apps/worker/wrangler.toml`
- Create: `apps/worker/.dev.vars.example`

**Step 1: Define secrets**

Required Worker secrets:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

**Step 2: Implement delivery service**

Function:

- `sendTelegramMessage(env, text)`

**Step 3: Wire alert delivery**

When alert triggers:

- create `alert_events`
- send Telegram message
- update delivery status
- update `last_triggered_at`

**Step 4: Verify with dry-run first**

Add dry-run mode for tests.

**Step 5: Commit**

```bash
git add apps/worker/src/services/telegram.ts apps/worker/src/services/alerts.ts apps/worker/.dev.vars.example
git commit -m "feat(worker): add telegram alert delivery"
```

---

### Task 16: Add signed local collector endpoint

**Objective:** Prepare for local Playwright/premium feed ingestion without redesigning the app.

**Files:**

- Create: `apps/worker/src/routes/collector.ts`
- Create: `apps/worker/src/routes/collector.test.ts`
- Create: `apps/worker/src/services/hmac.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/.dev.vars.example`

**Step 1: Define secret**

```text
COLLECTOR_SHARED_SECRET
```

**Step 2: Implement HMAC verification**

Headers:

- `x-refi-radar-timestamp`
- `x-refi-radar-signature`

Signature payload:

```text
${timestamp}.${rawBody}
```

**Step 3: Implement endpoint**

`POST /api/collector/push`

Validates and inserts observation.

**Step 4: Verify replay protection**

Reject timestamps older than 5 minutes.

**Step 5: Commit**

```bash
git add apps/worker/src/routes/collector.ts apps/worker/src/services/hmac.ts apps/worker/.dev.vars.example
git commit -m "feat(worker): add signed collector ingestion endpoint"
```

---

### Task 17: Visual polish and responsive layout

**Objective:** Make the app feel like a premium financial dashboard.

**Files:**

- Modify: `apps/web/src/styles.css`
- Modify: dashboard components as needed

**Design checklist:**

- Background: `#05070A`
- Surface: `#0B0F14`
- Elevated cards: `#111822`
- Border: `rgba(255,255,255,0.08)`
- Text: `#F4F7FA`
- Muted text: `#7D8A99`
- Accent blue: `#1D9BF0`
- Positive green: `#16C784`
- Negative red: `#FF4D4D`
- Monospace numerals for rates
- Thin borders
- Subtle glows
- Excellent mobile layout

**Verification:**

Run Playwright screenshot checks or manual browser QA.

**Commit:**

```bash
git add apps/web
git commit -m "style(web): polish dark financial dashboard"
```

---

### Task 18: Cloudflare deployment setup

**Objective:** Make the app deployable.

**Files:**

- Modify: `apps/worker/wrangler.toml`
- Create: `apps/web/_redirects` or equivalent Pages routing config
- Create: `docs/deployment.md`

**Step 1: Create D1 database**

```bash
wrangler d1 create refi-radar-prod
wrangler d1 create refi-radar-dev
```

**Step 2: Create KV namespace**

```bash
wrangler kv namespace create REFI_RADAR_CACHE
wrangler kv namespace create REFI_RADAR_CACHE --preview
```

**Step 3: Configure Worker bindings**

Add D1 and KV binding IDs to `wrangler.toml`.

**Step 4: Set secrets**

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put COLLECTOR_SHARED_SECRET
```

**Step 5: Deploy**

```bash
pnpm --filter @refi-radar/worker deploy
pnpm --filter @refi-radar/web build
```

Connect `apps/web` to Cloudflare Pages.

**Step 6: Commit**

```bash
git add docs/deployment.md apps/worker/wrangler.toml apps/web
git commit -m "docs: add cloudflare deployment guide"
```

---

## Verification strategy

Before calling MVP complete:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Manual checks:

- `/api/health` returns OK.
- `/api/latest` returns latest source data.
- `/api/series` returns chartable points.
- FRED collector handles missing `.` values.
- MND collector failure does not break FRED collection.
- Dashboard renders on desktop and mobile.
- Calculator returns plausible monthly payment and break-even.
- Alerts respect cooldown.
- No chart or card displays a rate without a source timestamp.

---

## First implementation order

Recommended first coding sprint:

1. Task 1: Monorepo scaffold.
2. Task 2: Shared finance/types.
3. Task 3: Worker health endpoint.
4. Task 4: D1 schema/query layer.
5. Task 5: FRED collectors.
6. Task 10: Frontend shell.
7. Task 11: Latest cards.
8. Task 12: Chart.

Then add MND, calculator, and alerts.

---

## Open decisions

- Chart library final choice: `lightweight-charts` vs ECharts.
  - Default recommendation: `lightweight-charts` for finance feel.
- Whether MND scraping is acceptable for personal/private use.
  - Default recommendation: implement isolated adapter, make failure non-fatal, be ready to replace.
- Alert delivery path.
  - Default recommendation: Worker -> Telegram Bot API.
- Hosting mode.
  - Default recommendation: Cloudflare-first, hybrid-ready.
