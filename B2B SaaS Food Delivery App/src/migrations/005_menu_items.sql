-- ============================================================
-- Migration 005: Menu Items Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL,
  price         DECIMAL(10,2) NOT NULL CHECK (price > 0),
  available     BOOLEAN DEFAULT true,
  emoji         TEXT DEFAULT '🍽️',
  image_url     TEXT,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Restaurants can manage their menu
CREATE POLICY "Restaurants manage own menu"
  ON public.menu_items FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

-- Public can read available items
CREATE POLICY "Public read available menu"
  ON public.menu_items FOR SELECT
  USING (available = true);

-- Admins full access
CREATE POLICY "Admins full menu access"
  ON public.menu_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON public.menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON public.menu_items (category);
CREATE INDEX IF NOT EXISTS menu_items_available_idx ON public.menu_items (available);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
