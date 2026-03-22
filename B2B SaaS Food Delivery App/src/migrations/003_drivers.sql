-- ============================================================
-- Migration 003: Drivers (Pilots) Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT UNIQUE NOT NULL,
  national_id     TEXT UNIQUE,
  rank            TEXT DEFAULT 'bronze'
                    CHECK (rank IN ('gold', 'silver', 'bronze')),
  wallet_balance  DECIMAL(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'offline'
                    CHECK (status IN ('available', 'busy', 'offline')),
  rating          DECIMAL(3,1) DEFAULT 5.0,
  orders_count    INTEGER DEFAULT 0,
  -- Geographic location (real-time, updated by driver app)
  lat             DECIMAL(10,6),
  lng             DECIMAL(10,6),
  -- Flags
  has_warning     BOOLEAN DEFAULT false,
  warning_reason  TEXT,
  is_active       BOOLEAN DEFAULT true,
  -- Metrics
  completion_rate DECIMAL(5,2) DEFAULT 100.0,
  avg_delivery_min INTEGER DEFAULT 30,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access drivers"
  ON public.drivers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY "Dispatchers read drivers"
  ON public.drivers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher'))
  );

CREATE POLICY "Dispatchers update driver status"
  ON public.drivers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher'))
  );

CREATE INDEX IF NOT EXISTS drivers_status_idx ON public.drivers (status);
CREATE INDEX IF NOT EXISTS drivers_rank_idx ON public.drivers (rank);

CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed data (Cairo coordinates)
INSERT INTO public.drivers (name, phone, rank, wallet_balance, status, rating, orders_count, lat, lng, has_warning, completion_rate) VALUES
  ('أحمد محمد',    '01012345678', 'gold',   1200.00, 'available', 4.9, 127, 30.0561, 31.2209, false, 98.4),
  ('عمر حسن',      '01098765432', 'silver', 350.00,  'available', 4.6, 84,  30.0438, 31.2128, true,  91.2),
  ('خالد يوسف',    '01122233334', 'gold',   2500.00, 'busy',      4.8, 203, 30.0410, 31.2292, false, 97.1),
  ('ياسر إبراهيم', '01056789012', 'bronze', 800.00,  'available', 4.4, 45,  29.9602, 31.2569, false, 88.9),
  ('محمود سعيد',   '01034567890', 'silver', 150.00,  'available', 4.5, 96,  30.0677, 31.3329, true,  92.7),
  ('حسام عادل',    '01156789012', 'gold',   3100.00, 'busy',      4.9, 178, 30.0905, 31.3232, false, 99.1),
  ('رامي صلاح',    '01223344556', 'bronze', 620.00,  'offline',   4.3, 32,  30.0700, 31.2500, false, 85.0),
  ('كريم علي',     '01334455667', 'silver', 1850.00, 'available', 4.7, 119, 30.0300, 31.2800, false, 94.5)
ON CONFLICT (phone) DO NOTHING;
