-- ============================================================
-- Migration 006: Compatibility earnings table for API server
-- ============================================================

CREATE TABLE IF NOT EXISTS earnings (
  id              BIGSERIAL PRIMARY KEY,
  driver_id       INTEGER NOT NULL REFERENCES drivers(id),
  order_id        INTEGER REFERENCES orders(id),
  earning_date    DATE NOT NULL,
  trips_count     INTEGER NOT NULL DEFAULT 1,
  amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_collected  DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission      DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_driver_date ON earnings (driver_id, earning_date DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_order ON earnings (order_id);
