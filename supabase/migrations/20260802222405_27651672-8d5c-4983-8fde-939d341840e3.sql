CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid text NOT NULL,
  token text NOT NULL UNIQUE,
  email text,
  user_agent text,
  platform text,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_push_tokens_uid ON public.push_tokens (firebase_uid);

CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.push_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid text,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  tokens_total integer NOT NULL DEFAULT 0,
  tokens_sent integer NOT NULL DEFAULT 0,
  error text,
  dedupe_key text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.push_events TO service_role;
ALTER TABLE public.push_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_push_events_created ON public.push_events (created_at DESC);