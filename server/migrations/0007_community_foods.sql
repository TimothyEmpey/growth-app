CREATE TABLE community_foods (
  id TEXT PRIMARY KEY,
  creator_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  serving_label TEXT NOT NULL,
  serving_grams REAL NOT NULL,
  nutrition TEXT NOT NULL,
  search_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX community_foods_by_creator ON community_foods(creator_account_id, updated_at DESC);
CREATE INDEX community_foods_by_name ON community_foods(name COLLATE NOCASE);
