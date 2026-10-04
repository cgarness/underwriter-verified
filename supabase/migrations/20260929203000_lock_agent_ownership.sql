-- Forward correction for inherited anonymous agent-write policies.
-- 20260416003500 created "(anon)" insert/update policies. 20260506175748 dropped
-- only the un-suffixed names, so the anon policies stayed in place. Intake RLS
-- keys off agents.user_id, so unrestricted profile writes must be closed.
-- This migration does not assign any existing profile to a login.

DROP POLICY IF EXISTS "Anyone can insert agents (anon)" ON public.agents;
DROP POLICY IF EXISTS "Anyone can update agents (anon)" ON public.agents;
DROP POLICY IF EXISTS "Anyone can insert agents" ON public.agents;
DROP POLICY IF EXISTS "Anyone can update agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can insert agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can update agents" ON public.agents;

-- Public profile reads stay. Anonymous callers lose every write privilege on the table.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.agents FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.agents FROM authenticated;
GRANT SELECT ON TABLE public.agents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.agents TO authenticated;

-- Owner-only policies from 20260506175748, recreated so their shape is explicit.
DROP POLICY IF EXISTS "Users insert own agent" ON public.agents;
DROP POLICY IF EXISTS "Users update own agent" ON public.agents;
DROP POLICY IF EXISTS "Users delete own agent" ON public.agents;

CREATE POLICY "Users insert own agent"
  ON public.agents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own agent"
  ON public.agents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own agent"
  ON public.agents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Ownership cannot move through the public API roles even if a permissive
-- policy is added later. Service-role or migration sessions are unaffected.
CREATE OR REPLACE FUNCTION public.protect_agent_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     AND current_user IN ('anon', 'authenticated')
  THEN
    RAISE EXCEPTION 'agent_ownership_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_agent_ownership() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS agents_protect_ownership ON public.agents;
CREATE TRIGGER agents_protect_ownership
  BEFORE UPDATE OF user_id ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.protect_agent_ownership();
