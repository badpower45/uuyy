-- ============================================================
-- Migration 006: Wallet Transactions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount        DECIMAL(12,2) NOT NULL,  -- positive = credit, negative = debit
  type          TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description   TEXT NOT NULL,
  balance_after DECIMAL(12,2),          -- snapshot of balance after tx
  reference     TEXT,                    -- external payment reference
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants view own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins full tx access"
  ON public.wallet_transactions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS wallet_tx_restaurant_idx ON public.wallet_transactions (restaurant_id);
CREATE INDEX IF NOT EXISTS wallet_tx_order_idx ON public.wallet_transactions (order_id);
CREATE INDEX IF NOT EXISTS wallet_tx_created_idx ON public.wallet_transactions (created_at DESC);

-- Function: create wallet transaction and update balance
CREATE OR REPLACE FUNCTION create_wallet_transaction(
  p_restaurant_id UUID,
  p_amount        DECIMAL,
  p_type          TEXT,
  p_description   TEXT,
  p_order_id      UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_balance DECIMAL;
  v_tx_id   UUID;
BEGIN
  -- Update wallet balance
  UPDATE public.restaurants
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_restaurant_id
  RETURNING wallet_balance INTO v_balance;

  -- Insert transaction record
  INSERT INTO public.wallet_transactions (restaurant_id, order_id, amount, type, description, balance_after)
  VALUES (p_restaurant_id, p_order_id, ABS(p_amount), p_type, p_description, v_balance)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
