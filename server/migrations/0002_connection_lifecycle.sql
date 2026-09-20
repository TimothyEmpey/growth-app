ALTER TABLE connections ADD COLUMN linked_at INTEGER NOT NULL DEFAULT 0;
UPDATE connections SET linked_at = sync_before;
