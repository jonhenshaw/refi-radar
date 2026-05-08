CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  url TEXT,
  cadence_minutes INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS alert_events (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  triggered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json TEXT NOT NULL,
  delivered_at TEXT,
  delivery_status TEXT,
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
);

CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category TEXT NOT NULL,
  raw_json TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id),
  UNIQUE(source_id, url)
);

CREATE INDEX IF NOT EXISTS idx_news_items_published
ON news_items(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_items_category_published
ON news_items(category, published_at DESC);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  kind TEXT NOT NULL,
  importance TEXT NOT NULL,
  raw_json TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id),
  UNIQUE(source_id, name, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_calendar_scheduled
ON calendar_events(scheduled_for);
