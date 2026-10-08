-- The bridge runs as service_role with SECURITY INVOKER. The original intake
-- normalizer is intentionally unavailable to browser roles; grant only the
-- server role its missing dependency rather than changing bridge privileges.
GRANT EXECUTE ON FUNCTION public.normalize_us_phone_e164(text) TO service_role;

DO $$
BEGIN
  IF NOT has_function_privilege('service_role', 'public.normalize_us_phone_e164(text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.normalize_us_phone_e164(text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.normalize_us_phone_e164(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'consent_normalizer_acl';
  END IF;
END $$;
