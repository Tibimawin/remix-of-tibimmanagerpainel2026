ALTER TABLE public.cloak_users
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permissions_synced_at timestamptz;