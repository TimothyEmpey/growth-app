ALTER TABLE connections ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX connections_by_account ON connections(account_id) WHERE account_id IS NOT NULL;
ALTER TABLE oauth_attempts ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE native_exchanges ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
