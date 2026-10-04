-- Public quote/call intake and append-only SMS consent evidence.
-- Visitors write only through submit_public_intake. They cannot read these tables.
-- No Twilio registration, send, or webhook is created here.

CREATE TABLE public.us_state_names (
  name text PRIMARY KEY
);

INSERT INTO public.us_state_names (name) VALUES
  ('Alabama'), ('Alaska'), ('Arizona'), ('Arkansas'), ('California'), ('Colorado'),
  ('Connecticut'), ('Delaware'), ('Florida'), ('Georgia'), ('Hawaii'), ('Idaho'),
  ('Illinois'), ('Indiana'), ('Iowa'), ('Kansas'), ('Kentucky'), ('Louisiana'),
  ('Maine'), ('Maryland'), ('Massachusetts'), ('Michigan'), ('Minnesota'),
  ('Mississippi'), ('Missouri'), ('Montana'), ('Nebraska'), ('Nevada'),
  ('New Hampshire'), ('New Jersey'), ('New Mexico'), ('New York'),
  ('North Carolina'), ('North Dakota'), ('Ohio'), ('Oklahoma'), ('Oregon'),
  ('Pennsylvania'), ('Rhode Island'), ('South Carolina'), ('South Dakota'),
  ('Tennessee'), ('Texas'), ('Utah'), ('Vermont'), ('Virginia'), ('Washington'),
  ('West Virginia'), ('Wisconsin'), ('Wyoming');

CREATE TABLE public.sms_disclosure_versions (
  id text PRIMARY KEY,
  informational_template text NOT NULL,
  marketing_template text NOT NULL,
  disclosure_body text NOT NULL,
  privacy_effective_on date NOT NULL,
  terms_effective_on date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sms_disclosure_versions_one_current
  ON public.sms_disclosure_versions (is_current)
  WHERE is_current;

INSERT INTO public.sms_disclosure_versions (
  id,
  informational_template,
  marketing_template,
  disclosure_body,
  privacy_effective_on,
  terms_effective_on,
  is_current
) VALUES (
  '2026-09-29-separate-sms',
  'I agree to receive recurring informational SMS/MMS from {sender} about my requested quote, appointments, and application or policy updates.',
  'I agree to receive recurring marketing SMS/MMS from {sender} about life insurance products and coverage reviews.',
  'Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. SMS consent is not required to request a quote, request a call, or purchase insurance. Carriers are not liable for any delayed or undelivered messages.',
  DATE '2026-09-29',
  DATE '2026-09-29',
  true
);

CREATE TABLE public.intake_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL UNIQUE,
  payload_hash text NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.agents (id),
  form_source text NOT NULL CHECK (form_source IN ('quote', 'call_request')),
  page_path text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone_e164 text NOT NULL,
  phone_display text NOT NULL,
  state text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX intake_requests_agent_created_idx
  ON public.intake_requests (agent_id, created_at DESC);

CREATE INDEX intake_requests_agent_phone_created_idx
  ON public.intake_requests (agent_id, phone_e164, created_at DESC);

CREATE TABLE public.sms_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_request_id uuid NOT NULL REFERENCES public.intake_requests (id),
  agent_id uuid NOT NULL REFERENCES public.agents (id),
  phone_e164 text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('informational', 'marketing')),
  choice text NOT NULL CHECK (choice IN ('granted', 'not_granted')),
  disclosure_version_id text NOT NULL REFERENCES public.sms_disclosure_versions (id),
  displayed_text text NOT NULL,
  sender_name text NOT NULL,
  sender_agency text NOT NULL,
  privacy_url text NOT NULL,
  terms_url text NOT NULL,
  privacy_effective_on date NOT NULL,
  terms_effective_on date NOT NULL,
  suppressed_at_capture boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_request_id, purpose)
);

CREATE INDEX sms_consent_events_agent_phone_idx
  ON public.sms_consent_events (agent_id, phone_e164, purpose, choice);

CREATE TABLE public.sms_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents (id),
  phone_e164 text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('stop', 'provider_block')),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, phone_e164)
);

CREATE INDEX sms_suppressions_agent_phone_idx
  ON public.sms_suppressions (agent_id, phone_e164);

CREATE OR REPLACE FUNCTION public.prevent_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'consent_evidence_is_append_only' USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER intake_requests_no_mutation
  BEFORE UPDATE OR DELETE ON public.intake_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_mutation();

CREATE TRIGGER sms_consent_events_no_mutation
  BEFORE UPDATE OR DELETE ON public.sms_consent_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_mutation();

CREATE TRIGGER sms_suppressions_no_delete
  BEFORE DELETE ON public.sms_suppressions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_mutation();

CREATE OR REPLACE FUNCTION public.normalize_us_phone_e164(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text := regexp_replace(COALESCE(raw, ''), '\D', '', 'g');
BEGIN
  IF length(digits) = 11 AND left(digits, 1) = '1' THEN
    digits := substring(digits FROM 2);
  END IF;
  IF length(digits) <> 10 OR left(digits, 1) ~ '[01]' THEN
    RETURN NULL;
  END IF;
  RETURN '+1' || digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_intake(
  p_idempotency_key uuid,
  p_form_source text,
  p_page_path text,
  p_agency_slug text,
  p_agent_slug text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_state text,
  p_informational_consent boolean,
  p_marketing_consent boolean,
  p_disclosure_version_id text,
  p_fax_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent public.agents%ROWTYPE;
  v_version public.sms_disclosure_versions%ROWTYPE;
  v_name text;
  v_agency text;
  v_sender text;
  v_first text;
  v_last text;
  v_email text;
  v_phone text;
  v_digits text;
  v_display text;
  v_state text;
  v_profile_path text;
  v_privacy_url text;
  v_terms_url text;
  v_info_label text;
  v_marketing_label text;
  v_info_text text;
  v_marketing_text text;
  v_hash text;
  v_existing_id uuid;
  v_existing_hash text;
  v_request_id uuid;
  v_suppressed boolean;
  v_recent integer;
BEGIN
  IF p_idempotency_key IS NULL
    OR p_informational_consent IS NULL
    OR p_marketing_consent IS NULL
    OR COALESCE(p_fax_number, '') <> ''
    OR p_form_source NOT IN ('quote', 'call_request')
    OR p_agency_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR p_agent_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR p_page_path !~ '^/[a-z0-9/-]+$'
    OR length(p_page_path) > 200
  THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = 'P0001';
  END IF;

  v_profile_path := '/' || p_agency_slug || '/' || p_agent_slug;
  IF p_form_source = 'quote' AND p_page_path = '/sms-opt-in' THEN
    IF p_agency_slug <> 'cg-financial' OR p_agent_slug <> 'christopher-garness' THEN
      RAISE EXCEPTION 'unknown_agent' USING ERRCODE = 'P0001';
    END IF;
  ELSIF p_form_source = 'quote' AND p_page_path = v_profile_path THEN
    NULL;
  ELSIF p_form_source = 'call_request'
    AND (p_page_path = v_profile_path || '/bookcall' OR p_page_path = v_profile_path || '/book')
  THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'unknown_agent' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_agent
  FROM public.agents
  WHERE agency_slug = p_agency_slug AND slug = p_agent_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_agent' USING ERRCODE = 'P0001';
  END IF;

  v_name := regexp_replace(trim(COALESCE(v_agent.name, '')), '\s+', ' ', 'g');
  v_agency := regexp_replace(trim(COALESCE(v_agent.agency, '')), '\s+', ' ', 'g');
  IF v_name = '' THEN
    RAISE EXCEPTION 'unknown_agent' USING ERRCODE = 'P0001';
  END IF;
  v_sender := CASE WHEN v_agency <> '' THEN v_name || ' and ' || v_agency ELSE v_name END;

  v_first := regexp_replace(trim(COALESCE(p_first_name, '')), '\s+', ' ', 'g');
  v_last := regexp_replace(trim(COALESCE(p_last_name, '')), '\s+', ' ', 'g');
  v_email := lower(trim(COALESCE(p_email, '')));
  IF length(v_first) < 1 OR length(v_first) > 100
    OR length(v_last) < 1 OR length(v_last) > 100
    OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    OR length(v_email) > 255
  THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = 'P0001';
  END IF;

  v_phone := public.normalize_us_phone_e164(p_phone);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = 'P0001';
  END IF;
  v_digits := substring(v_phone FROM 3);
  v_display := '(' || substring(v_digits FROM 1 FOR 3) || ') '
    || substring(v_digits FROM 4 FOR 3) || '-' || substring(v_digits FROM 7 FOR 4);

  IF p_form_source = 'quote' THEN
    v_state := trim(COALESCE(p_state, ''));
    IF NOT EXISTS (SELECT 1 FROM public.us_state_names WHERE name = v_state) THEN
      RAISE EXCEPTION 'invalid_input' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    v_state := NULL;
  END IF;

  SELECT * INTO v_version
  FROM public.sms_disclosure_versions
  WHERE id = p_disclosure_version_id AND is_current;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'disclosure_version' USING ERRCODE = 'P0001';
  END IF;

  v_privacy_url := 'https://www.underwriterverified.com/' || p_agency_slug || '/' || p_agent_slug || '/privacy-policy';
  v_terms_url := 'https://www.underwriterverified.com/' || p_agency_slug || '/' || p_agent_slug || '/terms-and-conditions';
  v_info_label := replace(v_version.informational_template, '{sender}', v_sender);
  v_marketing_label := replace(v_version.marketing_template, '{sender}', v_sender);
  v_info_text := v_info_label || chr(10) || v_version.disclosure_body || chr(10)
    || 'Privacy Policy: ' || v_privacy_url || chr(10)
    || 'Terms and Conditions: ' || v_terms_url;
  v_marketing_text := v_marketing_label || chr(10) || v_version.disclosure_body || chr(10)
    || 'Privacy Policy: ' || v_privacy_url || chr(10)
    || 'Terms and Conditions: ' || v_terms_url;

  v_hash := md5(concat_ws('|',
    v_agent.id::text,
    p_form_source,
    p_page_path,
    v_first,
    v_last,
    v_email,
    v_phone,
    COALESCE(v_state, ''),
    p_informational_consent::text,
    p_marketing_consent::text,
    v_version.id,
    v_name,
    v_agency
  ));

  SELECT id, payload_hash INTO v_existing_id, v_existing_hash
  FROM public.intake_requests
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_hash = v_hash THEN
      RETURN jsonb_build_object('request_id', v_existing_id, 'duplicate', true);
    END IF;
    RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.intake_requests
  WHERE agent_id = v_agent.id
    AND phone_e164 = v_phone
    AND created_at > now() - interval '1 hour';

  IF v_recent >= 8 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  v_suppressed := EXISTS (
    SELECT 1 FROM public.sms_suppressions s
    WHERE s.agent_id = v_agent.id AND s.phone_e164 = v_phone
  );

  BEGIN
    INSERT INTO public.intake_requests (
      idempotency_key, payload_hash, agent_id, form_source, page_path,
      first_name, last_name, email, phone_e164, phone_display, state
    ) VALUES (
      p_idempotency_key, v_hash, v_agent.id, p_form_source, p_page_path,
      v_first, v_last, v_email, v_phone, v_display, v_state
    )
    RETURNING id INTO v_request_id;

    INSERT INTO public.sms_consent_events (
      intake_request_id, agent_id, phone_e164, purpose, choice, disclosure_version_id,
      displayed_text, sender_name, sender_agency, privacy_url, terms_url,
      privacy_effective_on, terms_effective_on, suppressed_at_capture
    ) VALUES
    (
      v_request_id, v_agent.id, v_phone, 'informational',
      CASE WHEN p_informational_consent THEN 'granted' ELSE 'not_granted' END,
      v_version.id, v_info_text, v_name, v_agency, v_privacy_url, v_terms_url,
      v_version.privacy_effective_on, v_version.terms_effective_on, v_suppressed
    ),
    (
      v_request_id, v_agent.id, v_phone, 'marketing',
      CASE WHEN p_marketing_consent THEN 'granted' ELSE 'not_granted' END,
      v_version.id, v_marketing_text, v_name, v_agency, v_privacy_url, v_terms_url,
      v_version.privacy_effective_on, v_version.terms_effective_on, v_suppressed
    );
  EXCEPTION
    WHEN unique_violation THEN
      SELECT id, payload_hash INTO v_existing_id, v_existing_hash
      FROM public.intake_requests
      WHERE idempotency_key = p_idempotency_key;
      IF v_existing_hash = v_hash THEN
        RETURN jsonb_build_object('request_id', v_existing_id, 'duplicate', true);
      END IF;
      RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE = 'P0001';
  END;

  RETURN jsonb_build_object('request_id', v_request_id, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_sms_eligibility(
  p_agent_id uuid,
  p_phone text,
  p_message_class text
)
RETURNS TABLE (allowed boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := public.normalize_us_phone_e164(p_phone);
BEGIN
  -- Call this at send time, including for queued or scheduled messages.
  -- There is no sender or queue in this repository.
  IF p_message_class NOT IN ('informational', 'marketing') OR v_phone IS NULL THEN
    allowed := false;
    reason := 'invalid_class';
    RETURN NEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sms_suppressions s
    WHERE s.agent_id = p_agent_id AND s.phone_e164 = v_phone
  ) THEN
    allowed := false;
    reason := 'suppressed';
    RETURN NEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sms_consent_events e
    WHERE e.agent_id = p_agent_id
      AND e.phone_e164 = v_phone
      AND e.purpose = p_message_class
      AND e.choice = 'granted'
  ) THEN
    allowed := true;
    reason := 'granted';
    RETURN NEXT;
    RETURN;
  END IF;

  allowed := false;
  reason := 'no_grant';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_sms_suppression(
  p_agent_id uuid,
  p_phone text,
  p_reason text,
  p_source text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := public.normalize_us_phone_e164(p_phone);
  v_id uuid;
BEGIN
  -- Future verified Twilio webhooks may call this. Do not call it from the browser.
  -- A later website submission must not delete this row. Re-enrollment is not implemented.
  IF v_phone IS NULL OR p_reason NOT IN ('stop', 'provider_block')
    OR length(trim(COALESCE(p_source, ''))) < 3
    OR length(p_source) > 80
    OR NOT EXISTS (SELECT 1 FROM public.agents WHERE id = p_agent_id)
  THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.sms_suppressions (agent_id, phone_e164, reason, source)
  VALUES (p_agent_id, v_phone, p_reason, trim(p_source))
  ON CONFLICT (agent_id, phone_e164) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.sms_suppressions
    WHERE agent_id = p_agent_id AND phone_e164 = v_phone;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_sms_eligibility(
  p_phone text,
  p_message_class text
)
RETURNS TABLE (allowed boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
BEGIN
  SELECT id INTO v_agent_id FROM public.agents WHERE user_id = auth.uid();
  IF v_agent_id IS NULL THEN
    allowed := false;
    reason := 'forbidden';
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT e.allowed, e.reason
  FROM public.evaluate_sms_eligibility(v_agent_id, p_phone, p_message_class) AS e;
END;
$$;

ALTER TABLE public.us_state_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_disclosure_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_suppressions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.us_state_names FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sms_disclosure_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.intake_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sms_consent_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sms_suppressions FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.intake_requests TO authenticated;
GRANT SELECT ON TABLE public.sms_consent_events TO authenticated;
GRANT SELECT ON TABLE public.sms_suppressions TO authenticated;

CREATE POLICY "Agents read own intake requests"
  ON public.intake_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = intake_requests.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents read own consent events"
  ON public.sms_consent_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = sms_consent_events.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents read own sms suppressions"
  ON public.sms_suppressions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = sms_suppressions.agent_id AND a.user_id = auth.uid()
    )
  );

REVOKE ALL ON FUNCTION public.normalize_us_phone_e164(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_evidence_mutation() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_public_intake(
  uuid, text, text, text, text, text, text, text, text, text, boolean, boolean, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_intake(
  uuid, text, text, text, text, text, text, text, text, text, boolean, boolean, text, text
) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.evaluate_sms_eligibility(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_sms_suppression(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_sms_eligibility(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_sms_suppression(uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.my_sms_eligibility(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_sms_eligibility(text, text) TO authenticated;
