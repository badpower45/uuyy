-- ============================================================
-- Migration 007: Settlements Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.settlements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL,   -- restaurant_id or driver_id
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('restaurant', 'driver')),
  entity_name   TEXT NOT NULL,   -- cached for display
  amount        DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'disputed')),
  period_start  TIMESTAMPTZ,
  period_end    TIMESTAMPTZ,
  notes         TEXT,
  paid_by       UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  paid_at       TIMESTAMPTZ
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full settlements access"
  ON public.settlements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS settlements_entity_idx ON public.settlements (entity_id);
CREATE INDEX IF NOT EXISTS settlements_status_idx ON public.settlements (status);
CREATE INDEX IF NOT EXISTS settlements_created_idx ON public.settlements (created_at DESC);

-- Seed settlements data
INSERT INTO public.settlements (entity_type, entity_name, amount, status) VALUES
  ('restaurant', 'مطعم الشام',                3450.00, 'paid'),
  ('driver',     'أحمد محمود',                 1200.00, 'pending'),
  ('restaurant', 'بيتزا هت - فرع المعادي',    8900.00, 'paid'),
  ('driver',     'محمد عبد الله',               950.00, 'pending'),
  ('restaurant', 'مطعم السلطان',               5600.00, 'paid'),
  ('driver',     'عمر حسن',                    2100.00, 'pending'),
  ('restaurant', 'كنتاكي - فرع مدينة نصر',  12300.00, 'paid'),
  ('restaurant', 'برجر كينج - الزمالك',       4800.00, 'pending'),
  ('driver',     'خالد يوسف',                  1750.00, 'paid'),
  ('driver',     'ياسر إبراهيم',                680.00, 'pending')
ON CONFLICT DO NOTHING;
