-- ============================================================
-- Migration 003: Driver Live Location Tracking
-- This table stores every GPS ping from active drivers.
-- Use a time-series extension (TimescaleDB) in production
-- for better performance on large datasets.
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_locations (
  id          BIGSERIAL    PRIMARY KEY,
  driver_id   INTEGER      NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  order_id    INTEGER      REFERENCES orders(id),           -- null if no active order
  latitude    DECIMAL(10,7) NOT NULL,
  longitude   DECIMAL(10,7) NOT NULL,
  accuracy    DECIMAL(8,2),                                 -- meters
  heading     DECIMAL(5,2),                                 -- degrees 0-360
  speed       DECIMAL(6,2),                                 -- m/s
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Optimize for fetching latest location per driver
CREATE INDEX idx_driver_locations_driver_time
  ON driver_locations (driver_id, recorded_at DESC);

CREATE INDEX idx_driver_locations_order
  ON driver_locations (order_id)
  WHERE order_id IS NOT NULL;

-- View: latest location per driver
CREATE OR REPLACE VIEW driver_latest_location AS
SELECT DISTINCT ON (driver_id)
  dl.driver_id,
  d.name     AS driver_name,
  d.phone    AS driver_phone,
  d.is_online,
  dl.latitude,
  dl.longitude,
  dl.accuracy,
  dl.heading,
  dl.speed,
  dl.recorded_at,
  dl.order_id
FROM driver_locations dl
JOIN drivers d ON d.id = dl.driver_id
ORDER BY driver_id, recorded_at DESC;
