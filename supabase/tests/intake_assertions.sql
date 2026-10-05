-- Throwaway assertions for the intake migration. Not a production script.
-- Expects the two agent rows seeded by agents_before_fix.sql.

CREATE OR REPLACE FUNCTION public._intake_assert(cond boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT cond THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

DO $$
DECLARE
  v_id uuid;
  v_count int;
  v_allowed boolean;
  v_reason text;
  v_text text;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.sms_disclosure_versions
  WHERE id = '2026-09-29-separate-sms'
    AND is_current = false
    AND privacy_effective_on = DATE '2026-09-29'
    AND terms_effective_on = DATE '2026-09-29';
  PERFORM public._intake_assert(v_count = 1, 'September 29 disclosure must remain as historical evidence');

  SELECT count(*) INTO v_count
  FROM public.sms_disclosure_versions
  WHERE id = '2026-10-05-policy-clarifications'
    AND is_current = true
    AND privacy_effective_on = DATE '2026-10-05'
    AND terms_effective_on = DATE '2026-10-05';
  PERFORM public._intake_assert(v_count = 1, 'October 5 disclosure must be the only current version');

  SELECT (public.submit_public_intake(
    '10000000-0000-0000-0000-000000000001', 'quote', '/sms-opt-in',
    'cg-financial', 'christopher-garness', 'Ada', 'Lovelace', 'ada@example.com',
    '9095550101', 'California', false, false, '2026-10-05-policy-clarifications', ''
  )->>'request_id')::uuid INTO v_id;

  SELECT count(*) INTO v_count FROM public.sms_consent_events
  WHERE intake_request_id = v_id AND choice = 'not_granted';
  PERFORM public._intake_assert(v_count = 2, 'unchecked boxes must record two non-grants');

  SELECT allowed, reason INTO v_allowed, v_reason
  FROM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '9095550101', 'informational');
  PERFORM public._intake_assert(v_allowed = false AND v_reason = 'no_grant', 'no new grant from unchecked boxes');

  PERFORM public.submit_public_intake(
    '10000000-0000-0000-0000-000000000002', 'quote', '/cg-financial/christopher-garness',
    'cg-financial', 'christopher-garness', 'Grace', 'Hopper', 'grace@example.com',
    '9095550102', 'California', true, false, '2026-10-05-policy-clarifications', ''
  );
  SELECT allowed, reason INTO v_allowed, v_reason
  FROM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '+19095550102', 'informational');
  PERFORM public._intake_assert(v_allowed AND v_reason = 'granted', 'informational grant');
  SELECT allowed INTO v_allowed
  FROM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '+19095550102', 'marketing');
  PERFORM public._intake_assert(v_allowed = false, 'informational grant does not allow marketing');

  PERFORM public.submit_public_intake(
    '10000000-0000-0000-0000-000000000003', 'call_request', '/cg-financial/christopher-garness/bookcall',
    'cg-financial', 'christopher-garness', 'Alan', 'Turing', 'alan@example.com',
    '(909) 555-0103', 'California', false, true, '2026-10-05-policy-clarifications', ''
  );
  SELECT state IS NULL INTO v_allowed FROM public.intake_requests WHERE phone_e164 = '+19095550103';
  PERFORM public._intake_assert(v_allowed, 'call request must not store a state');
  SELECT allowed INTO v_allowed
  FROM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '9095550103', 'marketing');
  PERFORM public._intake_assert(v_allowed, 'marketing grant');
  SELECT allowed INTO v_allowed
  FROM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '9095550103', 'informational');
  PERFORM public._intake_assert(NOT v_allowed, 'marketing grant does not allow informational');

  PERFORM public.submit_public_intake(
    '10000000-0000-0000-0000-000000000004', 'call_request', '/cg-financial/christopher-garness/book',
    'cg-financial', 'christopher-garness', 'Both', 'Boxes', 'both@example.com',
    '9095550104', '', true, true, '2026-10-05-policy-clarifications', ''
  );
  SELECT count(*) INTO v_count FROM public.sms_consent_events
  WHERE phone_e164 = '+19095550104' AND choice = 'granted';
  PERFORM public._intake_assert(v_count = 2, 'both choices grant');

  SELECT (public.submit_public_intake(
    '10000000-0000-0000-0000-000000000005', 'quote', '/sms-opt-in',
    'cg-financial', 'christopher-garness', 'Dup', 'One', 'dup@example.com',
    '9095550105', 'Texas', true, false, '2026-10-05-policy-clarifications', ''
  )->>'request_id')::uuid INTO v_id;
  PERFORM public._intake_assert(
    (public.submit_public_intake(
      '10000000-0000-0000-0000-000000000005', 'quote', '/sms-opt-in',
      'cg-financial', 'christopher-garness', 'Dup', 'One', 'dup@example.com',
      '9095550105', 'Texas', true, false, '2026-10-05-policy-clarifications', ''
    )->>'duplicate')::boolean,
    'same attempt returns duplicate'
  );
  SELECT count(*) INTO v_count FROM public.intake_requests WHERE idempotency_key = '10000000-0000-0000-0000-000000000005';
  PERFORM public._intake_assert(v_count = 1, 'duplicate attempt does not insert another request');

  BEGIN
    PERFORM public.submit_public_intake(
      '10000000-0000-0000-0000-000000000005', 'quote', '/sms-opt-in',
      'cg-financial', 'christopher-garness', 'Dup', 'One', 'dup@example.com',
      '9095550105', 'Texas', true, true, '2026-10-05-policy-clarifications', ''
    );
    RAISE EXCEPTION 'changed consent must not collapse into the old attempt';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public._intake_assert(SQLERRM = 'idempotency_conflict', SQLERRM);
  END;

  BEGIN
    PERFORM public.submit_public_intake(
      '10000000-0000-0000-0000-000000000006', 'quote', '/sms-opt-in',
      'other-agency', 'other-agent', 'Nope', 'Person', 'nope@example.com',
      '9095550199', 'Ohio', true, true, '2026-10-05-policy-clarifications', ''
    );
    RAISE EXCEPTION 'foreign identity on /sms-opt-in should fail';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public._intake_assert(SQLERRM = 'unknown_agent', SQLERRM);
  END;

  BEGIN
    PERFORM public.submit_public_intake(
      '10000000-0000-0000-0000-000000000007', 'quote', '/cg-financial/christopher-garness',
      'other-agency', 'other-agent', 'Nope', 'Person', 'nope@example.com',
      '9095550198', 'Ohio', false, false, '2026-10-05-policy-clarifications', ''
    );
    RAISE EXCEPTION 'mismatched path should fail';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public._intake_assert(SQLERRM = 'unknown_agent', SQLERRM);
  END;

  BEGIN
    PERFORM public.submit_public_intake(
      '10000000-0000-0000-0000-000000000008', 'quote', '/missing/person',
      'missing', 'person', 'Nope', 'Person', 'nope@example.com',
      '9095550197', 'Ohio', false, false, '2026-10-05-policy-clarifications', ''
    );
    RAISE EXCEPTION 'unknown agent should fail';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public._intake_assert(SQLERRM = 'unknown_agent', SQLERRM);
  END;

  BEGIN
    PERFORM public.submit_public_intake(
      '10000000-0000-0000-0000-000000000009', 'quote', '/sms-opt-in',
      'cg-financial', 'christopher-garness', 'Bad', 'Phone', 'bad@example.com',
      '123', 'Ohio', false, false, '2026-10-05-policy-clarifications', ''
    );
    RAISE EXCEPTION 'bad phone should fail';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public._intake_assert(SQLERRM = 'invalid_input', SQLERRM);
  END;

  PERFORM public.submit_public_intake(
    '10000000-0000-0000-0000-000000000010', 'quote', '/other-agency/other-agent',
    'other-agency', 'other-agent', 'Other', 'Person', 'other@example.com',
    '9095550110', 'Nevada', true, false, '2026-10-05-policy-clarifications', ''
  );
  SELECT displayed_text INTO v_text FROM public.sms_consent_events
  WHERE phone_e164 = '+19095550110' AND purpose = 'informational';
  PERFORM public._intake_assert(v_text LIKE '%Other Agent and Other Agency%', 'other agency keeps its own sender');
  PERFORM public._intake_assert(v_text NOT LIKE '%CG Financial%', 'other agency form must not snapshot CG Financial');

  SELECT displayed_text INTO v_text FROM public.sms_consent_events
  WHERE phone_e164 = '+19095550101' AND purpose = 'informational';
  PERFORM public._intake_assert(
    v_text = $txt$I agree to receive recurring informational SMS/MMS from Christopher Garness and CG Financial about my requested quote, appointments, and application or policy updates.
Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. SMS consent is not required to request a quote, request a call, or purchase insurance. Carriers are not liable for any delayed or undelivered messages.
Privacy Policy: https://www.underwriterverified.com/cg-financial/christopher-garness/privacy-policy
Terms and Conditions: https://www.underwriterverified.com/cg-financial/christopher-garness/terms-and-conditions$txt$,
    'displayed disclosure snapshot'
  );

  PERFORM public.record_sms_suppression(
    '11111111-1111-1111-1111-111111111111', '9095550120', 'stop', 'test-stop'
  );
  PERFORM public.submit_public_intake(
    '10000000-0000-0000-0000-000000000020', 'quote', '/sms-opt-in',
    'cg-financial', 'christopher-garness', 'Stop', 'Ped', 'stop@example.com',
    '9095550120', 'California', true, true, '2026-10-05-policy-clarifications', ''
  );
  SELECT allowed, reason INTO v_allowed, v_reason
  FROM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '9095550120', 'marketing');
  PERFORM public._intake_assert(v_allowed = false AND v_reason = 'suppressed', 'later grant does not clear STOP');
  SELECT bool_and(suppressed_at_capture) INTO v_allowed FROM public.sms_consent_events
  WHERE phone_e164 = '+19095550120';
  PERFORM public._intake_assert(v_allowed, 'capture records the existing opt-out');

  PERFORM public.submit_public_intake(
    '10000000-0000-0000-0000-000000000030', 'quote', '/sms-opt-in',
    'cg-financial', 'christopher-garness', 'Keep', 'Grant', 'keep@example.com',
    '9095550130', 'Utah', true, false, '2026-10-05-policy-clarifications', ''
  );
  PERFORM public.submit_public_intake(
    '10000000-0000-0000-0000-000000000031', 'quote', '/sms-opt-in',
    'cg-financial', 'christopher-garness', 'Keep', 'Grant', 'keep@example.com',
    '9095550130', 'Utah', false, false, '2026-10-05-policy-clarifications', ''
  );
  SELECT allowed, reason INTO v_allowed, v_reason
  FROM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '9095550130', 'informational');
  PERFORM public._intake_assert(v_allowed AND v_reason = 'granted', 'unchecked follow-up is not a revocation');

  FOR v_count IN 1..8 LOOP
    PERFORM public.submit_public_intake(
      ('10000000-0000-0000-0000-0000000001' || lpad(v_count::text, 2, '0'))::uuid,
      'quote', '/sms-opt-in', 'cg-financial', 'christopher-garness',
      'Rate', 'Limit', 'rate@example.com', '9095550140', 'Iowa', false, false,
      '2026-10-05-policy-clarifications', ''
    );
  END LOOP;
  BEGIN
    PERFORM public.submit_public_intake(
      '10000000-0000-0000-0000-000000000199', 'quote', '/sms-opt-in',
      'cg-financial', 'christopher-garness', 'Rate', 'Limit', 'rate@example.com',
      '9095550140', 'Iowa', false, false, '2026-10-05-policy-clarifications', ''
    );
    RAISE EXCEPTION 'ninth request should be rate limited';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public._intake_assert(SQLERRM = 'rate_limited', SQLERRM);
  END;

  BEGIN
    UPDATE public.sms_consent_events SET choice = 'granted' WHERE phone_e164 = '+19095550101';
    RAISE EXCEPTION 'consent evidence must be append-only';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public._intake_assert(SQLERRM = 'consent_evidence_is_append_only', SQLERRM);
  END;
END $$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM count(*) FROM public.intake_requests;
    RAISE EXCEPTION 'anon read should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config('app.current_user_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.intake_requests;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'owner should see intake rows, saw %', v_count;
  END IF;
  SELECT count(*) INTO v_count FROM public.intake_requests WHERE agent_id = '22222222-2222-2222-2222-222222222222';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'owner should not see another agency, saw %', v_count;
  END IF;
END $$;

DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config('app.current_user_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.intake_requests WHERE agent_id = '11111111-1111-1111-1111-111111111111';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'cross-agency read should be empty, saw %', v_count;
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.evaluate_sms_eligibility('11111111-1111-1111-1111-111111111111', '9095550102', 'informational');
    RAISE EXCEPTION 'anon must not evaluate eligibility';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;
