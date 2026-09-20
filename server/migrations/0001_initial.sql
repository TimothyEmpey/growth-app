CREATE TABLE connections (
  athlete_id TEXT PRIMARY KEY, name TEXT NOT NULL, access_cipher TEXT NOT NULL, refresh_cipher TEXT NOT NULL,
  expires_at INTEGER NOT NULL, scopes TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'connected',
  generation TEXT NOT NULL, sync_complete INTEGER NOT NULL DEFAULT 0, sync_cursor INTEGER NOT NULL DEFAULT 1,
  sync_before INTEGER NOT NULL, last_sync TEXT, sync_error TEXT, refresh_lock_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, athlete_id TEXT NOT NULL REFERENCES connections(athlete_id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE oauth_attempts (state_hash TEXT PRIMARY KEY, platform TEXT NOT NULL, verifier_hash TEXT, expires_at INTEGER NOT NULL);
CREATE TABLE native_exchanges (code_hash TEXT PRIMARY KEY, athlete_id TEXT NOT NULL REFERENCES connections(athlete_id) ON DELETE CASCADE, verifier_hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE runs (
  id TEXT NOT NULL, athlete_id TEXT NOT NULL REFERENCES connections(athlete_id) ON DELETE CASCADE,
  local_date TEXT NOT NULL, start_date TEXT NOT NULL, distance REAL NOT NULL, moving_seconds INTEGER NOT NULL,
  data TEXT NOT NULL, detailed INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, seen_generation TEXT NOT NULL,
  PRIMARY KEY (athlete_id, id)
);
CREATE INDEX runs_by_date ON runs(athlete_id, local_date DESC, id DESC);
CREATE TABLE events (event_key TEXT PRIMARY KEY, processed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE food_cache (cache_key TEXT PRIMARY KEY, data TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE rate_buckets (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
