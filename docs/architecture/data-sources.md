# Data Sources

## Source classes

Refi Radar should separate three kinds of data:

1. Mortgage-rate observations
2. Market proxies
3. User/refinance-derived signals

## Initial sources

### Mortgage News Daily 30Y fixed

- Source ID: `mnd_30y_fixed`
- Kind: near-current mortgage market estimate
- Expected cadence: 5-15 minutes for checking; actual value may change less often
- Access: public HTML page unless official API is found
- Current extraction idea:
  - Fetch `https://www.mortgagenewsdaily.com/mortgage-rates/30-year-fixed`
  - Extract visible `30 Yr. Fixed Rate` / `30YR Fixed Rate` value
  - Extract `og:last_updated` when present
- Risks:
  - Scraping fragility
  - Terms/licensing concerns
  - Bot blocking
- Mitigation:
  - Isolate parser in one adapter
  - Store raw evidence in `raw_json`
  - Mark confidence as `market_estimate`
  - Add local Playwright collector if Worker fetch becomes unreliable

### FRED/Freddie Mac PMMS 30Y

- Source ID: `fred_mortgage30us`
- Series: `MORTGAGE30US`
- Kind: authoritative weekly survey
- URL: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US`
- Cadence: daily check; data typically updates weekly
- Confidence: `weekly_survey`

### FRED 10Y Treasury

- Source ID: `fred_dgs10`
- Series: `DGS10`
- Kind: daily market proxy
- URL: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10`
- Cadence: daily check for FRED; optional intraday API later
- Confidence: `proxy`

## Future sources

### Intraday Treasury API

Candidates:

- Polygon
- Finnhub
- Twelve Data
- Alpha Vantage
- Nasdaq Data Link

Use only if rate limits and licensing fit.

### MBS/TBA feed

Candidates:

- MBS Live
- ICE / Optimal Blue
- Paid market-data providers

Likely paid/licensed. Add only if the app needs better same-day repricing signals.

## Normalized observation shape

```ts
export interface RateObservation {
  sourceId: SourceId;
  observedAt: string;
  fetchedAt: string;
  rate: number;
  changeBps?: number;
  confidence: 'market_estimate' | 'weekly_survey' | 'proxy' | 'user_derived';
  raw?: unknown;
}
```

## Source health

Each collector should report:

- Last successful fetch
- Last successful parse
- Last error
- Last observed timestamp
- Last observed value
- Whether the latest value is stale

## User-facing source labels

Never show unlabeled numbers. Every visible rate should include:

- Source name
- Timestamp
- Confidence/source type
- Optional tooltip explaining limitations
