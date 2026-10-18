-- Disabled foundation only. Populate exclusions through a separately approved operation.
CREATE TABLE private.agentflow_profile_exclusions (
  organization_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  PRIMARY KEY (organization_id, profile_id)
);
ALTER TABLE private.agentflow_profile_exclusions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.agentflow_profile_exclusions FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.agents ADD COLUMN contact_card_only boolean
  GENERATED ALWAYS AS (managed_by_agentflow AND user_id IS NULL) STORED;

CREATE OR REPLACE FUNCTION public.apply_agentflow_profile_v1(
  p_organization_id uuid,p_profile_id uuid,p_version bigint,p_profile jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  source private.agentflow_profile_sources%ROWTYPE;
  link private.agentflow_profile_links%ROWTYPE;
  agent public.agents%ROWTYPE;
  publish boolean; full_name text; warning_code text;
  base_slug text; candidate text; attempt integer;
BEGIN
  IF p_organization_id IS NULL OR p_profile_id IS NULL OR p_version IS NULL OR p_version<1
    OR jsonb_typeof(p_profile) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_profile->'published') IS DISTINCT FROM 'boolean'
    OR length(p_profile::text)>4500000 THEN RAISE EXCEPTION 'profile_payload_invalid' USING ERRCODE='22023'; END IF;
  IF EXISTS (SELECT 1 FROM private.agentflow_profile_exclusions e WHERE e.organization_id=p_organization_id AND e.profile_id=p_profile_id)
    THEN RAISE EXCEPTION 'profile_excluded' USING ERRCODE='42501'; END IF;
  publish := (p_profile->>'published')::boolean;
  SELECT * INTO source FROM private.agentflow_profile_sources WHERE organization_id=p_organization_id;
  IF NOT FOUND OR (publish AND NOT source.enabled) THEN RAISE EXCEPTION 'profile_source_unregistered' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_profile) k WHERE k NOT IN
    ('published','first_name','last_name','phone','email','npn','headshot_url','agency','agency_slug','state_licenses'))
    THEN RAISE EXCEPTION 'profile_payload_invalid' USING ERRCODE='22023'; END IF;
  IF publish THEN
    IF EXISTS (SELECT 1 FROM unnest(ARRAY['first_name','last_name','phone','email','npn','headshot_url','agency','agency_slug']) k
      WHERE jsonb_typeof(p_profile->k) IS DISTINCT FROM 'string')
      OR length(btrim(p_profile->>'first_name')) NOT BETWEEN 1 AND 50
      OR length(btrim(p_profile->>'last_name')) NOT BETWEEN 1 AND 50
      OR length(p_profile->>'phone')>40 OR length(p_profile->>'email')>254
      OR length(p_profile->>'npn')>40 OR length(p_profile->>'headshot_url')>4000000
      OR p_profile->>'agency' IS DISTINCT FROM source.agency_name
      OR p_profile->>'agency_slug' IS DISTINCT FROM source.agency_slug
      OR jsonb_typeof(p_profile->'state_licenses') IS DISTINCT FROM 'array'
      THEN RAISE EXCEPTION 'profile_payload_invalid' USING ERRCODE='22023'; END IF;
    IF jsonb_array_length(p_profile->'state_licenses')>60 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_profile->'state_licenses') x
      WHERE jsonb_typeof(x)<>'string' OR length(x::text)>110
    ) THEN RAISE EXCEPTION 'profile_payload_invalid' USING ERRCODE='22023'; END IF;
  ELSIF p_profile<>jsonb_build_object('published',false) THEN
    RAISE EXCEPTION 'profile_tombstone_invalid' USING ERRCODE='22023';
  END IF;
  INSERT INTO private.agentflow_profile_links(organization_id,profile_id)
    VALUES(p_organization_id,p_profile_id) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT link FROM private.agentflow_profile_links
    WHERE organization_id=p_organization_id AND profile_id=p_profile_id FOR UPDATE;
  IF link.agent_id IS NOT NULL THEN
    SELECT * INTO STRICT agent FROM public.agents WHERE id=link.agent_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.agentflow_consent_links c WHERE c.agent_id=agent.id)
      THEN RAISE EXCEPTION 'profile_consent_protected' USING ERRCODE='42501'; END IF;
  END IF;
  IF publish AND link.agent_id IS NULL
    AND btrim(p_profile->>'phone')='' AND btrim(p_profile->>'email')=''
    THEN RAISE EXCEPTION 'profile_contact_required' USING ERRCODE='22023'; END IF;
  IF p_version<link.last_version THEN RAISE EXCEPTION 'profile_version_stale' USING ERRCODE='40001'; END IF;
  IF p_version=link.last_version AND p_profile IS DISTINCT FROM link.last_payload
    THEN RAISE EXCEPTION 'profile_version_conflict' USING ERRCODE='40001'; END IF;
  warning_code := link.last_warning;
  IF p_version>link.last_version THEN
    warning_code := NULL;
    IF publish AND link.agent_id IS NULL THEN
      IF NOT source.allow_provisioning THEN RAISE EXCEPTION 'profile_link_required' USING ERRCODE='42501'; END IF;
      full_name := btrim(p_profile->>'first_name')||' '||btrim(p_profile->>'last_name');
      IF EXISTS (SELECT 1 FROM public.agents x WHERE x.agency_slug=source.agency_slug AND NOT x.managed_by_agentflow
        AND lower(regexp_replace(btrim(x.name),'\s+',' ','g'))=lower(full_name))
        THEN RAISE EXCEPTION 'profile_link_required' USING ERRCODE='42501'; END IF;
      base_slug := left(coalesce(nullif(btrim(regexp_replace(lower(full_name),'[^a-z0-9]+','-','g'),'-'),''),'agent'),50);
      FOR attempt IN 0..5 LOOP
        candidate := CASE WHEN attempt=0 THEN base_slug ELSE base_slug||'-'||
          left(md5(p_organization_id::text||p_profile_id::text||attempt::text),16) END;
        BEGIN
          INSERT INTO public.agents(slug,agency_slug,name,first_name,last_name,agency,is_published,managed_by_agentflow)
            VALUES(candidate,source.agency_slug,full_name,p_profile->>'first_name',p_profile->>'last_name',source.agency_name,false,true)
            RETURNING * INTO agent;
          EXIT;
        EXCEPTION WHEN unique_violation THEN IF attempt=5 THEN RAISE; END IF;
        END;
      END LOOP;
      link.agent_id := agent.id;
    END IF;
    IF link.agent_id IS NOT NULL THEN
      IF publish THEN
        full_name := btrim(p_profile->>'first_name')||' '||btrim(p_profile->>'last_name');
        agent.name := full_name; agent.first_name := btrim(p_profile->>'first_name');
        agent.last_name := btrim(p_profile->>'last_name'); agent.agency := source.agency_name;
        UPDATE public.agents SET name=agent.name,first_name=agent.first_name,last_name=agent.last_name,agency=agent.agency,
          phone=p_profile->>'phone',email=p_profile->>'email',npn=p_profile->>'npn',
          headshot_url=p_profile->>'headshot_url',state_licenses=p_profile->'state_licenses',
          is_published=true,managed_by_agentflow=true WHERE id=agent.id;
      ELSE
        UPDATE public.agents SET is_published=false,managed_by_agentflow=true WHERE id=agent.id;
      END IF;
    END IF;
    UPDATE private.agentflow_profile_links SET agent_id=link.agent_id,last_version=p_version,
      last_payload=p_profile,last_warning=warning_code
      WHERE organization_id=p_organization_id AND profile_id=p_profile_id;
  END IF;
  RETURN jsonb_build_object('version',p_version::text,'published',publish,'warning',warning_code,
    'public_url',CASE WHEN link.agent_id IS NULL THEN NULL ELSE
      'https://www.underwriterverified.com/'||agent.agency_slug||'/'||agent.slug END);
END $$;

-- Preserve the live intake definition, adding only a managed-page guard and row lock.
CREATE OR REPLACE FUNCTION public.submit_public_intake(p_idempotency_key uuid, p_form_source text, p_page_path text, p_agency_slug text, p_agent_slug text, p_first_name text, p_last_name text, p_email text, p_phone text, p_state text, p_informational_consent boolean, p_marketing_consent boolean, p_disclosure_version_id text, p_fax_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  WHERE agency_slug = p_agency_slug AND slug = p_agent_slug FOR SHARE;

  IF NOT FOUND OR (v_agent.managed_by_agentflow AND (v_agent.user_id IS NULL OR NOT v_agent.is_published)) THEN
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
$function$
;
