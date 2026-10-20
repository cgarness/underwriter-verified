SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';
DO $$ BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.apply_agentflow_profile_v1(uuid,uuid,bigint,jsonb)'::regprocedure) IS DISTINCT FROM '6765593576d6a961f95e6003e7192176'
 THEN RAISE EXCEPTION 'uv_personal_brand_preimage_changed'; END IF;
END $$;

-- agency is display text. Registered organization and exact agency_slug remain authoritative.
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
    ('published','first_name','last_name','phone','email','npn','headshot_url','agency','agency_slug','state_licenses','bio','profile_verified'))
    THEN RAISE EXCEPTION 'profile_payload_invalid' USING ERRCODE='22023'; END IF;
  IF publish THEN
    IF (p_profile ? 'bio' AND (jsonb_typeof(p_profile->'bio') IS DISTINCT FROM 'string' OR length(p_profile->>'bio')>2000))
      OR (p_profile ? 'profile_verified' AND jsonb_typeof(p_profile->'profile_verified') IS DISTINCT FROM 'boolean')
    THEN RAISE EXCEPTION 'profile_payload_invalid' USING ERRCODE='22023'; END IF;
    IF EXISTS (SELECT 1 FROM unnest(ARRAY['first_name','last_name','phone','email','npn','headshot_url','agency','agency_slug']) k
      WHERE jsonb_typeof(p_profile->k) IS DISTINCT FROM 'string')
      OR length(btrim(p_profile->>'first_name')) NOT BETWEEN 1 AND 50
      OR length(btrim(p_profile->>'last_name')) NOT BETWEEN 1 AND 50
      OR length(p_profile->>'phone')>40 OR length(p_profile->>'email')>254
      OR length(p_profile->>'npn')>40 OR length(p_profile->>'headshot_url')>4000000
      OR length(p_profile->>'agency')>120 OR length(btrim(p_profile->>'agency'))<1
      OR p_profile->>'agency' ~ '[[:cntrl:]]'
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
        agent.last_name := btrim(p_profile->>'last_name'); agent.agency := btrim(p_profile->>'agency');
        UPDATE public.agents SET name=agent.name,first_name=agent.first_name,last_name=agent.last_name,agency=agent.agency,
          phone=p_profile->>'phone',email=p_profile->>'email',npn=p_profile->>'npn',
          headshot_url=p_profile->>'headshot_url',state_licenses=p_profile->'state_licenses',
          bio=CASE WHEN p_profile ? 'bio' THEN p_profile->>'bio' ELSE bio END,
          profile_verified=coalesce((p_profile->>'profile_verified')::boolean,false),
          is_published=true,managed_by_agentflow=true WHERE id=agent.id;
      ELSE
        UPDATE public.agents SET is_published=false,profile_verified=false,managed_by_agentflow=true WHERE id=agent.id;
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
