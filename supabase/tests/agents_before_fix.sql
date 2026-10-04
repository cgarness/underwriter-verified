-- Runs after every migration except 20260929203000_lock_agent_ownership.sql.
-- Each block must succeed for the harness to have reproduced the inherited issue.

INSERT INTO public.agents (id, slug, agency_slug, name, first_name, last_name, agency, user_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'christopher-garness', 'cg-financial', 'Christopher Garness', 'Christopher', 'Garness', 'CG Financial', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'other-agent', 'other-agency', 'Other Agent', 'Other', 'Agent', 'Other Agency', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

DO $$
DECLARE
  v_policies text;
BEGIN
  SELECT string_agg(policyname, ', ' ORDER BY policyname) INTO v_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agents' AND 'anon' = ANY (roles);
  IF v_policies IS NULL THEN
    RAISE EXCEPTION 'expected inherited anon policies to exist before the fix';
  END IF;
  RAISE NOTICE 'anon agent policies before fix: %', v_policies;
END $$;

DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE anon';
  INSERT INTO public.agents (slug, agency_slug, name, first_name, last_name)
  VALUES ('anon-insert', 'anon-agency', 'Anon Insert', 'Anon', 'Insert');
  RAISE NOTICE 'REPRODUCED: anon could insert an agent profile';
END $$;

DO $$
DECLARE
  v_owner uuid;
BEGIN
  EXECUTE 'SET LOCAL ROLE anon';
  UPDATE public.agents SET user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  WHERE id = '11111111-1111-1111-1111-111111111111';
  RESET ROLE;
  SELECT user_id INTO v_owner FROM public.agents WHERE id = '11111111-1111-1111-1111-111111111111';
  IF v_owner <> 'cccccccc-cccc-cccc-cccc-cccccccccccc' THEN
    RAISE EXCEPTION 'expected anon takeover to succeed before the fix';
  END IF;
  RAISE NOTICE 'REPRODUCED: anon reassigned agent ownership to %', v_owner;
END $$;

-- Undo the reproduction so the corrective migration is tested on the intended data.
UPDATE public.agents SET user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
WHERE id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.agents WHERE slug = 'anon-insert';
