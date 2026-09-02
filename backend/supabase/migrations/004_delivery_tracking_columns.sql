-- ============================================================
-- Migration 004: Delivery Live Tracking Columns
-- ============================================================

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMPTZ;

ALTER TABLE location_updates ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION;
ALTER TABLE location_updates ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION;
