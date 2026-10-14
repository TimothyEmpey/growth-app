-- Preserve every active login until explicit logout or an account security change revokes it.
UPDATE account_sessions
SET expires_at = 253402300799
WHERE expires_at > unixepoch();
