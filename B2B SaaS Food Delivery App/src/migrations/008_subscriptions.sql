-- ============================================================
-- Migration 008: Subscriptions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,        -- basic / pro / enterprise
  label           TEXT NOT NULL,        -- Arabic display name
  price_monthly   DECIMAL(10,2) NOT NULL,
  max_orders      INTEGER,              -- NULL = unlimited
  max_drivers     INTEGER,
  features        JSONB DEFAULT '[]',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES public.subscription_plans(id),
  plan_name       TEXT NOT NULL,        -- cached
  price           DECIMAL(10,2) NOT NULL,
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'cancelled', 'trial')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  auto_renew      BOOLEAN DEFAULT true,
  payment_ref     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read plans"
  ON public.subscription_plans FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage plans"
  ON public.subscription_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Restaurants view own subscription"
  ON public.subscriptions FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Admins full subscriptions"
  ON public.subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE INDEX IF NOT EXISTS subscriptions_restaurant_idx ON public.subscriptions (restaurant_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_expires_idx ON public.subscriptions (expires_at);

-- Seed plans
INSERT INTO public.subscription_plans (name, label, price_monthly, max_orders, max_drivers, features) VALUES
  ('basic',      'أساسي',    299.00,  100,  5,  '["لوحة تحكم أساسية", "تتبع الطلبات", "دعم البريد الإلكتروني"]'),
  ('pro',        'احترافي',  599.00,  500,  20, '["كل مزايا الأساسي", "تقارير متقدمة", "API access", "دعم أولوية"]'),
  ('enterprise', 'مؤسسي',   1299.00, NULL, NULL,'["كل المزايا", "مدير حساب مخصص", "SLA 99.9%", "تكامل مخصص"]')
ON CONFLICT DO NOTHING;

-- Seed subscriptions (link to restaurants by name - adjust UUIDs after running 002_restaurants.sql)
-- Note: Run this after restaurants are seeded
INSERT INTO public.subscriptions (restaurant_id, plan_name, price, status, started_at, expires_at)
SELECT r.id, r.subscription_type,
  CASE r.subscription_type
    WHEN 'basic' THEN 299.00
    WHEN 'pro' THEN 599.00
    WHEN 'enterprise' THEN 1299.00
  END,
  CASE r.status WHEN 'active' THEN 'active' ELSE 'cancelled' END,
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '15 days'
FROM public.restaurants r
ON CONFLICT DO NOTHING;
