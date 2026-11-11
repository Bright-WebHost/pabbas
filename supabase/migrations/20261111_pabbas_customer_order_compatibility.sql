-- Add only the fields required by the live Pabbas checkout path.
-- This does not introduce the incompatible Oceana/app_customers order model.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique_idx
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

COMMIT;
