-- Driver-Master core schema
-- Generated from /migrations/001..005 for remote deployment via Supabase CLI

DO $$ BEGIN
  CREATE TYPE driver_rank AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM ('active', 'suspended', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',
    'assigned',
    'to_restaurant',
    'picked_up',
    'to_customer',
    'delivered',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'earning',
    'cash_collected',
    'commission',
    'settlement',
    'bonus',
    'penalty'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS drivers (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  phone            VARCHAR(20)  NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  avatar_letter    CHAR(1)      NOT NULL DEFAULT 'م',
  rank             driver_rank   NOT NULL DEFAULT 'bronze',
  status           driver_status NOT NULL DEFAULT 'active',
  balance          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  credit_limit     DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  total_trips      INTEGER       NOT NULL DEFAULT 0,
  rating           DECIMAL(3,1)  NOT NULL DEFAULT 5.0,
  is_online        BOOLEAN       NOT NULL DEFAULT FALSE,
  last_seen_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers (phone);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers (is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_rank ON drivers (rank);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_drivers_updated_at ON drivers;
CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

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
  external_id         VARCHAR(50) UNIQUE,
  driver_id           INTEGER REFERENCES drivers(id),
  restaurant_id       INTEGER REFERENCES restaurants(id),
  status              order_status NOT NULL DEFAULT 'pending',
  customer_name       VARCHAR(100) NOT NULL,
  customer_phone      VARCHAR(20)  NOT NULL,
  customer_address    TEXT         NOT NULL,
  customer_latitude   DECIMAL(10,7),
  customer_longitude  DECIMAL(10,7),
  fare                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cash_to_collect     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  distance_km         DECIMAL(6,2),
  assigned_at         TIMESTAMPTZ,
  picked_up_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders (driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS driver_locations (
  id           BIGSERIAL PRIMARY KEY,
  driver_id    INTEGER       NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  order_id     INTEGER REFERENCES orders(id),
  latitude     DECIMAL(10,7) NOT NULL,
  longitude    DECIMAL(10,7) NOT NULL,
  accuracy     DECIMAL(8,2),
  heading      DECIMAL(5,2),
  speed        DECIMAL(6,2),
  recorded_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_time
  ON driver_locations (driver_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_order
  ON driver_locations (order_id)
  WHERE order_id IS NOT NULL;

CREATE OR REPLACE VIEW driver_latest_location AS
SELECT DISTINCT ON (driver_id)
  dl.driver_id,
  d.name AS driver_name,
  d.phone AS driver_phone,
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

CREATE TABLE IF NOT EXISTS driver_transactions (
  id             BIGSERIAL PRIMARY KEY,
  driver_id      INTEGER NOT NULL REFERENCES drivers(id),
  order_id       INTEGER REFERENCES orders(id),
  type           transaction_type NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  balance_after  DECIMAL(10,2) NOT NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_driver
  ON driver_transactions (driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_order
  ON driver_transactions (order_id);

CREATE OR REPLACE VIEW driver_daily_earnings AS
SELECT
  driver_id,
  DATE(created_at AT TIME ZONE 'Africa/Cairo') AS day,
  COUNT(CASE WHEN type = 'earning' THEN 1 END) AS trips,
  COALESCE(SUM(CASE WHEN type = 'earning' THEN amount ELSE 0 END), 0) AS earnings,
  COALESCE(SUM(CASE WHEN type = 'cash_collected' THEN amount ELSE 0 END), 0) AS cash_collected,
  COALESCE(SUM(CASE WHEN type = 'commission' THEN ABS(amount) ELSE 0 END), 0) AS commission
FROM driver_transactions
GROUP BY driver_id, day
ORDER BY day DESC;

CREATE TABLE IF NOT EXISTS tracking_sessions (
  id            SERIAL PRIMARY KEY,
  driver_id     INTEGER NOT NULL REFERENCES drivers(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  total_km      DECIMAL(8,2) DEFAULT 0,
  trips_count   INTEGER DEFAULT 0,
  earnings      DECIMAL(10,2) DEFAULT 0,
  device_info   JSONB
);

CREATE INDEX IF NOT EXISTS idx_sessions_driver
  ON tracking_sessions (driver_id, started_at DESC);
