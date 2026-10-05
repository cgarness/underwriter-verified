-- Forward-only legal-policy/disclosure version advance for CG Financial A2P evidence.
-- Preserves the September 29 disclosure row and all historical consent evidence.
-- No schema, RLS, ownership, suppression, sender, or messaging configuration changes.

DO $$
DECLARE
  v_old public.sms_disclosure_versions%ROWTYPE;
BEGIN
  SELECT * INTO v_old
  FROM public.sms_disclosure_versions
  WHERE id = '2026-09-29-separate-sms'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expected disclosure version 2026-09-29-separate-sms is missing';
  END IF;

  IF v_old.is_current IS DISTINCT FROM true
    OR v_old.informational_template <> 'I agree to receive recurring informational SMS/MMS from {sender} about my requested quote, appointments, and application or policy updates.'
    OR v_old.marketing_template <> 'I agree to receive recurring marketing SMS/MMS from {sender} about life insurance products and coverage reviews.'
    OR v_old.disclosure_body <> 'Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. SMS consent is not required to request a quote, request a call, or purchase insurance. Carriers are not liable for any delayed or undelivered messages.'
    OR v_old.privacy_effective_on <> DATE '2026-09-29'
    OR v_old.terms_effective_on <> DATE '2026-09-29'
  THEN
    RAISE EXCEPTION 'current disclosure version changed unexpectedly; stop and review';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sms_disclosure_versions
    WHERE id = '2026-10-05-policy-clarifications'
  ) THEN
    RAISE EXCEPTION 'disclosure version 2026-10-05-policy-clarifications already exists; stop and review';
  END IF;

  UPDATE public.sms_disclosure_versions
  SET is_current = false
  WHERE id = '2026-09-29-separate-sms'
    AND is_current = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'failed to retire expected current disclosure version';
  END IF;

  INSERT INTO public.sms_disclosure_versions (
    id,
    informational_template,
    marketing_template,
    disclosure_body,
    privacy_effective_on,
    terms_effective_on,
    is_current
  ) VALUES (
    '2026-10-05-policy-clarifications',
    v_old.informational_template,
    v_old.marketing_template,
    v_old.disclosure_body,
    DATE '2026-10-05',
    DATE '2026-10-05',
    true
  );
END;
$$;
