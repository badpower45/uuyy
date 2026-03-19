-- ============================================================
-- Migration 005: Tracking Sessions
-- A session = one continuous online period for a driver.
-- Used to calculate hours worked, KPIs, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS tracking_sessions (
  id            SERIAL PRIMARY KEY,
  driver_id     INTEGER NOT NULL REFERENCES drivers(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  total_km      DECIMAL(8,2) DEFAULT 0,   -- calculated on end
  trips_count   INTEGER      DEFAULT 0,
  earnings      DECIMAL(10,2) DEFAULT 0,
  device_info   JSONB                      -- { platform, version, ... }
);

CREATE INDEX idx_sessions_driver ON tracking_sessions (driver_id, started_at DESC);

-- When driver goes offline, call this to close the session:
-- UPDATE tracking_sessions SET ended_at = NOW()
-- WHERE driver_id = $1 AND ended_at IS NULL;
