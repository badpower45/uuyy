-- ============================================================
-- Migration 001: Drivers Table
-- App: بايلوت (Pilot) Driver App
-- Run: psql $DATABASE_URL -f migrations/001_create_drivers.sql
-- ============================================================

CREATE TYPE driver_rank AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE driver_status AS ENUM ('active', 'suspended', 'inactive');

CREATE TABLE IF NOT EXISTS drivers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  avatar_letter   CHAR(1)      NOT NULL DEFAULT 'م',
  rank            driver_rank  NOT NULL DEFAULT 'bronze',
  status          driver_status NOT NULL DEFAULT 'active',
  balance         DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- negative = debt
  credit_limit    DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  total_trips     INTEGER      NOT NULL DEFAULT 0,
  rating          DECIMAL(3,1) NOT NULL DEFAULT 5.0,
  is_online       BOOLEAN      NOT NULL DEFAULT FALSE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_phone    ON drivers (phone);
CREATE INDEX idx_drivers_is_online ON drivers (is_online);
CREATE INDEX idx_drivers_rank     ON drivers (rank);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
