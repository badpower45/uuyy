-- ============================================================
-- Migration 002: Restaurants Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.restaurants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  phone                 TEXT,
  address               TEXT,
  city                  TEXT DEFAULT 'القاهرة',
  status                TEXT DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive', 'suspended')),
  subscription_type     TEXT DEFAULT 'basic'
                          CHECK (subscription_type IN ('basic', 'pro', 'enterprise')),
  subscription_expires  TIMESTAMPTZ,
  wallet_balance        DECIMAL(12,2) DEFAULT 0,
  logo_url              TEXT,
  -- Geographic coordinates (Cairo area)
  lat                   DECIMAL(10,6),
  lng                   DECIMAL(10,6),
  -- Stats cached for performance
  total_orders          INTEGER DEFAULT 0,
  total_revenue         DECIMAL(12,2) DEFAULT 0,
  rating                DECIMAL(3,1) DEFAULT 5.0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Restaurants can view/edit their own data
CREATE POLICY "Restaurants view own data"
  ON public.restaurants FOR SELECT
  USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins full access restaurants"
  ON public.restaurants FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Dispatchers read access
CREATE POLICY "Dispatchers read restaurants"
  ON public.restaurants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'dispatcher')
  );

CREATE INDEX IF NOT EXISTS restaurants_status_idx ON public.restaurants (status);
CREATE INDEX IF NOT EXISTS restaurants_subscription_idx ON public.restaurants (subscription_type);

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed data
INSERT INTO public.restaurants (name, phone, address, city, status, subscription_type, wallet_balance, lat, lng, total_orders, total_revenue) VALUES
  ('مطعم الشام',          '01012345678', 'شارع المهندسين، الجيزة',     'الجيزة',  'active',   'pro',        12500.00, 30.0555, 31.2054, 342, 48900),
  ('بيتزا هت - مدينة نصر','01098765432', 'شارع عباس العقاد، مدينة نصر','القاهرة', 'active',   'enterprise', 8900.00,  30.0677, 31.3329, 521, 89200),
  ('كنتاكي المعادي',       '01122233344', 'شارع النيل، المعادي',         'القاهرة', 'active',   'enterprise', 15600.00, 29.9602, 31.2569, 687, 120400),
  ('مطعم السلطان',         '01056789012', 'شارع النزهة، مصر الجديدة',   'القاهرة', 'active',   'pro',        6700.00,  30.0905, 31.3232, 198, 31500),
  ('سوشي هاوس',            '01134567890', 'شارع التحرير، الدقي',         'الجيزة',  'active',   'basic',      2300.00,  30.0500, 31.2100, 87,  15600),
  ('مطعم الريف',           '01234567890', 'شارع فيصل، الهرم',            'الجيزة',  'inactive', 'basic',      450.00,   29.9900, 31.1800, 43,  6800),
  ('برجر كينج - الزمالك',  '01187654321', 'شارع حسن صبري، الزمالك',     'القاهرة', 'active',   'pro',        9200.00,  30.0561, 31.2209, 276, 42100),
  ('مطبخ أم أحمد',         '01098712345', 'شارع شبرا الكبير',            'القاهرة', 'suspended','basic',      0.00,     30.0900, 31.2600, 12,  1800)
ON CONFLICT DO NOTHING;
