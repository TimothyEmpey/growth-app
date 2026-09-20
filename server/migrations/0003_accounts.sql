CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '',
  age INTEGER,
  height_cm REAL,
  weight_kg REAL,
  security_version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE account_sessions (
  token_hash TEXT PRIMARY KEY,
  security_version INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX account_sessions_by_user ON account_sessions(account_id);
CREATE TABLE account_challenges (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('register','email','reset')),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  old_code_hash TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  security_version INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX account_challenges_by_user ON account_challenges(account_id,purpose);
