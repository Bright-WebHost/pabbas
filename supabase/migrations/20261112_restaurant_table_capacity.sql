-- Add seating capacity required by the dashboard and POS.
BEGIN;

ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 2
  CHECK (capacity > 0);

COMMIT;
