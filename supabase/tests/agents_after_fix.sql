-- Runs after 20260929203000_lock_agent_ownership.sql.

DO $$
DECLARE
  v_policies text;
BEGIN
  SELECT string_agg(policyname, ', ') INTO v_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agents' AND 'anon' = ANY (roles)
    AND cmd <> 'SELECT';
  IF v_policies IS NOT NULL THEN
    RAISE EXCEPTION 'anon write policies still present: %', v_policies;
  END IF;
  IF has_table_privilege('anon', 'public.agents', 'INSERT')
     OR has_table_privilege('anon', 'public.agents', 'UPDATE')
     OR has_table_privilege('anon', 'public.agents', 'DELETE') THEN
    RAISE EXCEPTION 'anon still holds a write grant on public.agents';
  END IF;
  IF NOT has_table_privilege('anon', 'public.agents', 'SELECT') THEN
    RAISE EXCEPTION 'public profile reads must keep working';
  END IF;
END $$;

DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM count(*) FROM public.agents WHERE agency_slug = 'cg-financial';
END $$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    INSERT INTO public.agents (slug, agency_slug, name, first_name, last_name)
    VALUES ('anon-insert-2', 'anon-agency', 'Anon Insert', 'Anon', 'Insert');
    RAISE EXCEPTION 'anon insert must be denied after the fix';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    UPDATE public.agents SET user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    WHERE id = '11111111-1111-1111-1111-111111111111';
    RAISE EXCEPTION 'anon ownership takeover must be denied after the fix';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END $$;

DO $$
DECLARE
  v_rows int;
BEGIN
  PERFORM set_config('app.current_user_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.agents SET name = 'Hijacked' WHERE id = '11111111-1111-1111-1111-111111111111';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'another authenticated user edited a profile they do not own';
  END IF;
END $$;

DO $$
DECLARE
  v_rows int;
BEGIN
  PERFORM set_config('app.current_user_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.agents SET user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  WHERE id = '11111111-1111-1111-1111-111111111111';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'another authenticated user claimed a profile they do not own';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    PERFORM set_config('app.current_user_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.agents SET user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    WHERE id = '11111111-1111-1111-1111-111111111111';
    RAISE EXCEPTION 'owner must not hand their profile to another login';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END $$;

DO $$
DECLARE
  v_rows int;
BEGIN
  PERFORM set_config('app.current_user_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.agents SET short_bio = 'Owner edit works' WHERE id = '11111111-1111-1111-1111-111111111111';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'owner edit should update exactly one row, updated %', v_rows;
  END IF;
END $$;

-- Provisioning on signup still creates an owned starter profile.
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'newagent@example.com',
        '{"first_name":"New","last_name":"Agent","agency":"Fresh Agency"}');

DO $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.agents WHERE agency_slug = 'fresh-agency' AND slug = 'new-agent';
  IF v_owner <> 'dddddddd-dddd-dddd-dddd-dddddddddddd' THEN
    RAISE EXCEPTION 'signup trigger did not provision the owned profile';
  END IF;
END $$;

DO $$
DECLARE
  v_rows int;
BEGIN
  PERFORM set_config('app.current_user_id', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.agents SET phone = '(909) 555-0100' WHERE agency_slug = 'fresh-agency' AND slug = 'new-agent';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'new owner could not edit their provisioned profile';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    PERFORM set_config('app.current_user_id', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    INSERT INTO public.agents (slug, agency_slug, name, first_name, last_name, user_id)
    VALUES ('forged', 'forged-agency', 'Forged', 'F', 'Orged', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'authenticated user inserted a profile owned by someone else';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN unique_violation THEN RAISE EXCEPTION 'insert reached the unique index instead of RLS';
  END;
END $$;
