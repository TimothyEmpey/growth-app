ALTER TABLE community_foods ADD COLUMN barcode TEXT;
CREATE UNIQUE INDEX community_foods_by_barcode ON community_foods(barcode) WHERE barcode IS NOT NULL;
