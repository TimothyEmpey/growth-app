CREATE TABLE community_food_reports (
  id TEXT PRIMARY KEY,
  food_id TEXT NOT NULL REFERENCES community_foods(id) ON DELETE CASCADE,
  reporter_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  email_sent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(food_id, reporter_account_id)
);
CREATE INDEX community_food_reports_for_review
  ON community_food_reports(status, created_at DESC);
