-- Fix mutable-search-path findings on the transferred functions.
ALTER FUNCTION public.normalize_us_phone_e164(text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.protect_agent_ownership() SET search_path = pg_catalog, public;
ALTER FUNCTION public.prevent_evidence_mutation() SET search_path = pg_catalog, public;

-- Durable per-user limit for the optional paid AI feature. No client access.
CREATE TABLE public.testimonial_generation_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  requests integer NOT NULL CHECK (requests BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, usage_date)
);
ALTER TABLE public.testimonial_generation_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.testimonial_generation_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.testimonial_generation_usage TO service_role;

CREATE FUNCTION public.reserve_testimonial_generation(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE v_reserved boolean := false;
BEGIN
  INSERT INTO public.testimonial_generation_usage (user_id, usage_date, requests)
  VALUES (p_user_id, (now() AT TIME ZONE 'UTC')::date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET requests = public.testimonial_generation_usage.requests + 1
    WHERE public.testimonial_generation_usage.requests < 5
  RETURNING true INTO v_reserved;
  RETURN COALESCE(v_reserved, false);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_testimonial_generation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_testimonial_generation(uuid) TO service_role;
