CREATE TABLE public.cloak_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  email text,
  name text,
  public_token text NOT NULL UNIQUE,
  expires_at timestamptz,
  blocked boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cloaked_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text NOT NULL UNIQUE,
  owner_uid text NOT NULL,
  original_url text NOT NULL,
  content_name text,
  source text NOT NULL DEFAULT 'miniseries',
  kind text NOT NULL DEFAULT 'episode',
  active boolean NOT NULL DEFAULT true,
  access_count bigint NOT NULL DEFAULT 0,
  bytes_served bigint NOT NULL DEFAULT 0,
  last_access_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_uid, original_url)
);

CREATE TABLE public.cloak_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_short_id text,
  owner_uid text,
  status text NOT NULL,
  ip text,
  user_agent text,
  bytes_served bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cloaked_links_owner ON public.cloaked_links (owner_uid);
CREATE INDEX idx_cloaked_links_created ON public.cloaked_links (created_at DESC);
CREATE INDEX idx_cloak_logs_created ON public.cloak_access_logs (created_at DESC);
CREATE INDEX idx_cloak_logs_owner ON public.cloak_access_logs (owner_uid, created_at DESC);
CREATE INDEX idx_cloak_logs_link ON public.cloak_access_logs (link_short_id, created_at DESC);

GRANT ALL ON public.cloak_users TO service_role;
GRANT ALL ON public.cloaked_links TO service_role;
GRANT ALL ON public.cloak_access_logs TO service_role;

ALTER TABLE public.cloak_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloaked_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloak_access_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cloak_users_updated_at BEFORE UPDATE ON public.cloak_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cloaked_links_updated_at BEFORE UPDATE ON public.cloaked_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();