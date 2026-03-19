-- ============================================================
-- Migration 004: Earnings & Transactions
-- ============================================================

CREATE TYPE transaction_type AS ENUM (
  'earning',          -- driver earned from a delivery
  'cash_collected',   -- cash driver collected from customer
  'commission',       -- platform fee deducted
  'settlement',       -- cash paid to platform / balance cleared
  'bonus',            -- bonus payment
  'penalty'           -- deduction for violation
);

CREATE TABLE IF NOT EXISTS driver_transactions (
  id              BIGSERIAL PRIMARY KEY,
  driver_id       INTEGER NOT NULL REFERENCES drivers(id),
  order_id        INTEGER REFERENCES orders(id),
  type            transaction_type NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,    -- positive = credit, negative = debit
  balance_after   DECIMAL(10,2) NOT NULL,    -- driver balance snapshot after tx
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_driver ON driver_transactions (driver_id, created_at DESC);
CREATE INDEX idx_transactions_order  ON driver_transactions (order_id);

-- Daily earnings summary view
CREATE OR REPLACE VIEW driver_daily_earnings AS
SELECT
  driver_id,
  DATE(created_at AT TIME ZONE 'Africa/Cairo') AS day,
  COUNT(CASE WHEN type = 'earning'        THEN 1 END) AS trips,
  COALESCE(SUM(CASE WHEN type = 'earning'        THEN amount ELSE 0 END), 0) AS earnings,
  COALESCE(SUM(CASE WHEN type = 'cash_collected' THEN amount ELSE 0 END), 0) AS cash_collected,
  COALESCE(SUM(CASE WHEN type = 'commission'     THEN ABS(amount) ELSE 0 END), 0) AS commission
FROM driver_transactions
GROUP BY driver_id, day
ORDER BY day DESC;
