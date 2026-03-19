-- ============================================================
-- Migration 002: Orders Table
-- ============================================================

CREATE TYPE order_status AS ENUM (
  'pending',
  'assigned',
  'to_restaurant',
  'picked_up',
  'to_customer',
  'delivered',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS restaurants (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  address     TEXT         NOT NULL,
  latitude    DECIMAL(10,7),
  longitude   DECIMAL(10,7),
  phone       VARCHAR(20),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  external_id         VARCHAR(50) UNIQUE,             -- e.g. "ORD-8821"
  driver_id           INTEGER REFERENCES drivers(id),
  restaurant_id       INTEGER REFERENCES restaurants(id),
  status              order_status NOT NULL DEFAULT 'pending',

  -- Customer info
  customer_name       VARCHAR(100) NOT NULL,
  customer_phone      VARCHAR(20)  NOT NULL,
  customer_address    TEXT         NOT NULL,
  customer_latitude   DECIMAL(10,7),
  customer_longitude  DECIMAL(10,7),

  -- Financials
  fare                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cash_to_collect     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  distance_km         DECIMAL(6,2),

  -- Timestamps
  assigned_at         TIMESTAMPTZ,
  picked_up_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_driver_id ON orders (driver_id);
CREATE INDEX idx_orders_status    ON orders (status);
CREATE INDEX idx_orders_created   ON orders (created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
