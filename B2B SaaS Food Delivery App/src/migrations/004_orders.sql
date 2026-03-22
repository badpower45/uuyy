-- ============================================================
-- Migration 004: Orders Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT UNIQUE NOT NULL, -- e.g., ORD-2041
  restaurant_id     UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  driver_id         UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  -- Customer info
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  delivery_address  TEXT NOT NULL,
  -- Delivery coordinates
  delivery_lat      DECIMAL(10,6),
  delivery_lng      DECIMAL(10,6),
  -- Financials
  order_value       DECIMAL(12,2) NOT NULL,
  delivery_fee      DECIMAL(10,2) DEFAULT 35.00,
  platform_commission DECIMAL(10,2) GENERATED ALWAYS AS (order_value * 0.05) STORED,
  -- Status
  status            TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'assigned', 'picked', 'on_way', 'delivered', 'cancelled')),
  -- Timing
  estimated_minutes INTEGER DEFAULT 30,
  notes             TEXT,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  assigned_at       TIMESTAMPTZ,
  picked_at         TIMESTAMPTZ,
  on_way_at         TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Restaurants can view their own orders
CREATE POLICY "Restaurants view own orders"
  ON public.orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurants create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurants update own orders"
  ON public.orders FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

-- Dispatchers full access
CREATE POLICY "Dispatchers full order access"
  ON public.orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher'))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_restaurant_idx ON public.orders (restaurant_id);
CREATE INDEX IF NOT EXISTS orders_driver_idx ON public.orders (driver_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

-- Seed sample orders
INSERT INTO public.orders (order_number, customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng, order_value, status, created_at) VALUES
  ('ORD-2041', 'سارة أحمد',  '01012345678', 'شارع التحرير، الدقي',        30.0500, 31.2100, 185.00, 'pending',  NOW() - INTERVAL '3 minutes'),
  ('ORD-2042', 'محمد علي',   '01098765432', 'شارع فيصل، الهرم',           29.9900, 31.1800, 240.00, 'pending',  NOW() - INTERVAL '5 minutes'),
  ('ORD-2043', 'فاطمة خالد', '01122233334', 'المعادي الجديدة',            29.9700, 31.2800, 310.00, 'pending',  NOW() - INTERVAL '1 minute'),
  ('ORD-2044', 'ياسر حسين',  '01056789012', 'مدينة نصر، الحي العاشر',    30.0750, 31.3400, 120.00, 'pending',  NOW() - INTERVAL '7 minutes')
ON CONFLICT (order_number) DO NOTHING;

-- Function: auto-update restaurant stats after order delivered
CREATE OR REPLACE FUNCTION update_restaurant_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE public.restaurants
    SET
      total_orders  = total_orders + 1,
      total_revenue = total_revenue + NEW.order_value
    WHERE id = NEW.restaurant_id;

    UPDATE public.drivers
    SET orders_count = orders_count + 1
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_delivered_stats
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_restaurant_stats();
