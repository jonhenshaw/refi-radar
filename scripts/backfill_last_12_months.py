#!/usr/bin/env python3
"""Fetch the most granular available public 12-month rate history and emit D1 SQL.

Sources:
- Mortgage News Daily embedded Highcharts payload: daily-ish 30Y fixed market estimate.
- FRED MORTGAGE30US: weekly Freddie Mac 30Y survey.
- FRED DGS10: daily 10Y Treasury proxy.
"""
from __future__ import annotations

import csv
import datetime as dt
import html
import json
import re
import sys
import urllib.request
from dataclasses import dataclass
from io import StringIO
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp" / "backfill_last_12_months.sql"

USER_AGENT = "RefiRadar/0.1 personal mortgage-rate monitor (+https://refi-radar.pages.dev)"
MND_CHART_URL = "https://www.mortgagenewsdaily.com/charts/embed/mnd-mtg-rates-30"
FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"

SOURCES = [
    ("mnd_30y_fixed", "Mortgage News Daily 30Y Fixed", "market_estimate", MND_CHART_URL, 15),
    ("fred_mortgage30us", "Freddie Mac PMMS 30Y", "weekly_survey", FRED_URL.format(series_id="MORTGAGE30US"), 1440),
    ("fred_mortgage15us", "Freddie Mac PMMS 15Y", "weekly_survey", FRED_URL.format(series_id="MORTGAGE15US"), 1440),
    ("fred_dgs10", "FRED 10Y Treasury", "daily_proxy", FRED_URL.format(series_id="DGS10"), 1440),
    ("fred_dgs2", "FRED 2Y Treasury", "daily_proxy", FRED_URL.format(series_id="DGS2"), 1440),
    ("fred_dgs30", "FRED 30Y Treasury", "daily_proxy", FRED_URL.format(series_id="DGS30"), 1440),
    ("fred_t10y2y", "FRED 10Y-2Y Spread", "daily_proxy", FRED_URL.format(series_id="T10Y2Y"), 1440),
    ("fred_dff", "FRED Effective Fed Funds", "daily_proxy", FRED_URL.format(series_id="DFF"), 1440),
    ("fred_sofr", "FRED SOFR", "daily_proxy", FRED_URL.format(series_id="SOFR"), 1440),
]

@dataclass(frozen=True)
class Observation:
    source_id: str
    observed_at: str
    rate: float
    change_bps: float | None
    confidence: str
    raw: dict


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,text/csv,*/*"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def cutoff_date() -> dt.date:
    today = dt.datetime.now(dt.timezone.utc).date()
    # 12 calendar months; safe for month length differences.
    month = today.month - 12
    year = today.year
    while month <= 0:
        month += 12
        year -= 1
    day = min(today.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return dt.date(year, month, day)


def parse_iso_date(value: str) -> dt.date:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def extract_balanced_object(text: str, start: int) -> str:
    i = text.index("{", start)
    depth = 0
    in_str = False
    esc = False
    for pos in range(i, len(text)):
        ch = text[pos]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[i : pos + 1]
    raise ValueError("unterminated chartData object")


def fetch_mnd_observations(since: dt.date) -> list[Observation]:
    page = fetch_text(MND_CHART_URL)
    marker = page.index("var chartData")
    object_text = extract_balanced_object(page, marker)
    data = json.loads(html.unescape(object_text))
    series = data["chartSeries"][0]["data"]
    observations: list[Observation] = []
    for point in series:
        observed_date = parse_iso_date(point["d"])
        if observed_date < since:
            continue
        value = float(point["v"])
        change = point.get("DataChange")
        observations.append(
            Observation(
                source_id="mnd_30y_fixed",
                observed_at=point["d"],
                rate=value,
                change_bps=None if change is None else round(float(change) * 100, 4),
                confidence="market_estimate",
                raw={"source": "mnd_chart_embed", "dcp": point.get("dcp"), "ydcp": point.get("ydcp")},
            )
        )
    return observations


def fetch_fred_observations(series_id: str, source_id: str, confidence: str, since: dt.date) -> list[Observation]:
    csv_text = fetch_text(FRED_URL.format(series_id=series_id))
    rows = csv.DictReader(StringIO(csv_text))
    observations: list[Observation] = []
    for row in rows:
        date_text = row["observation_date"]
        if dt.date.fromisoformat(date_text) < since:
            continue
        raw_value = row[series_id]
        if not raw_value or raw_value == ".":
            continue
        observations.append(
            Observation(
                source_id=source_id,
                observed_at=date_text,
                rate=float(raw_value),
                change_bps=None,
                confidence=confidence,
                raw={"source": "fred", "series_id": series_id},
            )
        )
    return observations


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def observation_values(obs: Observation, fetched_at: str) -> str:
    raw_json = json.dumps(obs.raw, separators=(",", ":"), sort_keys=True)
    change = "NULL" if obs.change_bps is None else f"{obs.change_bps:.4f}".rstrip("0").rstrip(".")
    return "(" + ", ".join([
        sql_quote(obs.source_id),
        sql_quote(obs.observed_at),
        sql_quote(fetched_at),
        f"{obs.rate:.6f}".rstrip("0").rstrip("."),
        change,
        sql_quote(obs.confidence),
        sql_quote(raw_json),
    ]) + ")"


def chunks(items: list[str], n: int) -> Iterable[list[str]]:
    for i in range(0, len(items), n):
        yield items[i : i + n]


def fred_series_id_from_url(url: str) -> str | None:
    if "fredgraph.csv?id=" not in url:
        return None
    return url.rsplit("id=", 1)[-1]


def confidence_from_kind(kind: str) -> str:
    return "weekly_survey" if kind == "weekly_survey" else "proxy"


def main() -> int:
    since = cutoff_date()
    fetched_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    print(f"Fetching 12-month history since {since.isoformat()}...", file=sys.stderr)
    observations: list[Observation] = []
    observations.extend(fetch_mnd_observations(since))
    for source_id, _name, kind, url, _cadence in SOURCES:
        if source_id == "mnd_30y_fixed":
            continue
        series_id = fred_series_id_from_url(url)
        if not series_id:
            continue
        try:
            observations.extend(
                fetch_fred_observations(series_id, source_id, confidence_from_kind(kind), since)
            )
        except Exception as exc:
            print(f"  ! {source_id} ({series_id}) skipped: {exc}", file=sys.stderr)
    observations.sort(key=lambda o: (o.source_id, o.observed_at))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = [
        "-- Refi Radar 12-month historical backfill generated by scripts/backfill_last_12_months.py",
        "PRAGMA foreign_keys=ON;",
    ]
    for source_id, name, kind, url, cadence in SOURCES:
        lines.append(
            "INSERT INTO sources (id, name, kind, url, cadence_minutes, enabled) VALUES "
            f"({sql_quote(source_id)}, {sql_quote(name)}, {sql_quote(kind)}, {sql_quote(url)}, {cadence}, 1) "
            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, kind=excluded.kind, url=excluded.url, cadence_minutes=excluded.cadence_minutes, enabled=excluded.enabled;"
        )

    values = [observation_values(obs, fetched_at) for obs in observations]
    for group in chunks(values, 200):
        lines.append(
            "INSERT OR IGNORE INTO rate_observations (source_id, observed_at, fetched_at, rate, change_bps, confidence, raw_json) VALUES\n"
            + ",\n".join(group)
            + ";"
        )

    OUT.write_text("\n".join(lines) + "\n")
    counts: dict[str, int] = {}
    for obs in observations:
        counts[obs.source_id] = counts.get(obs.source_id, 0) + 1
    print(json.dumps({"sql": str(OUT), "since": since.isoformat(), "total": len(observations), "counts": counts}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
