-- Additive bridge only. No seeded mapping, credential, cron, or production activation.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE public.agentflow_consent_links (
  organization_id uuid PRIMARY KEY,
  agent_id uuid NOT NULL UNIQUE REFERENCES public.agents(id),
  agency_slug text NOT NULL,
  agent_slug text NOT NULL,
  sender_name text NOT NULL,
  sender_agency text NOT NULL,
  relay_enabled boolean NOT NULL DEFAULT false,
  active_from timestamptz,
  wake_secret_name text NOT NULL DEFAULT 'uv_consent_worker_token',
  CHECK (NOT relay_enabled OR active_from IS NOT NULL)
);
CREATE TABLE public.consent_bridge_nonces (nonce uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.consent_bridge_outbox (
  request_id uuid PRIMARY KEY REFERENCES public.intake_requests(id),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  retry_at timestamptz NOT NULL DEFAULT now(),
  lease_id uuid,
  lease_until timestamptz,
  last_error text
);
CREATE INDEX consent_bridge_outbox_pending ON public.consent_bridge_outbox(retry_at) WHERE delivered_at IS NULL;

CREATE FUNCTION private.enqueue_consent_bridge() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link public.agentflow_consent_links; v_secret text; v_inserted integer;
BEGIN
  SELECT * INTO v_link FROM public.agentflow_consent_links WHERE agent_id=NEW.agent_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  INSERT INTO public.consent_bridge_outbox(request_id,agent_id) VALUES(NEW.intake_request_id,NEW.agent_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  -- pg_net queues work for after commit. Failure cannot erase the durable outbox.
  IF v_inserted=1 AND v_link.relay_enabled THEN
    BEGIN
      EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=$1' INTO v_secret USING v_link.wake_secret_name;
      IF length(v_secret)>=32 THEN
        EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 2000)'
        USING 'https://jzdzeevjpootbeuniygx.supabase.co/functions/v1/consent-event-worker',
          jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_secret), '{}'::jsonb;
      END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'consent_bridge_wake_failed'; END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.enqueue_consent_bridge() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER consent_bridge_enqueue AFTER INSERT ON public.sms_consent_events FOR EACH ROW EXECUTE FUNCTION private.enqueue_consent_bridge();

CREATE FUNCTION public.agentflow_consent_check(p_org uuid,p_agent uuid,p_phone text,p_purpose text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_link public.agentflow_consent_links; v_agent public.agents; v_phone text; v_allowed boolean; v_reason text; v_events jsonb;
BEGIN
  SELECT * INTO v_link FROM public.agentflow_consent_links WHERE organization_id=p_org AND agent_id=p_agent;
  IF NOT FOUND THEN RAISE EXCEPTION 'bridge_mapping'; END IF;
  SELECT * INTO STRICT v_agent FROM public.agents WHERE id=p_agent;
  IF v_agent.agency_slug IS DISTINCT FROM v_link.agency_slug OR v_agent.slug IS DISTINCT FROM v_link.agent_slug
    OR regexp_replace(trim(v_agent.name),'\s+',' ','g') IS DISTINCT FROM v_link.sender_name
    OR regexp_replace(trim(v_agent.agency),'\s+',' ','g') IS DISTINCT FROM v_link.sender_agency THEN RAISE EXCEPTION 'bridge_identity_changed'; END IF;
  v_phone:=public.normalize_us_phone_e164(p_phone);
  IF v_phone IS NULL OR p_purpose IS NULL OR p_purpose NOT IN ('informational','marketing') THEN RAISE EXCEPTION 'bridge_input'; END IF;
  SELECT allowed,reason INTO v_allowed,v_reason FROM public.evaluate_sms_eligibility(p_agent,v_phone,p_purpose);
  SELECT coalesce(jsonb_agg(e),'[]'::jsonb) INTO v_events FROM (
    SELECT id,disclosure_version_id,created_at FROM public.sms_consent_events
    WHERE agent_id=p_agent AND phone_e164=v_phone AND purpose=p_purpose AND choice='granted'
    ORDER BY created_at DESC,id LIMIT 1
  ) e;
  RETURN jsonb_build_object('organization_id',p_org,'profile_id',p_agent,'phone',v_phone,'purpose',p_purpose,
    'allowed',v_allowed,'reason',v_reason,'checked_at',clock_timestamp(),'evidence',v_events);
END $$;

CREATE FUNCTION public.agentflow_consent_suppress(p_org uuid,p_agent uuid,p_phone text,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  -- Mapping/identity must be checked even for a suppression write.
  PERFORM public.agentflow_consent_check(p_org,p_agent,p_phone,'informational');
  IF p_reason IS NULL OR p_reason NOT IN ('stop','provider_block') THEN RAISE EXCEPTION 'bridge_input'; END IF;
  RETURN public.record_sms_suppression(p_agent,p_phone,p_reason,'agentflow_verified');
END $$;

CREATE FUNCTION public.claim_consent_bridge_events() RETURNS SETOF jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_row record; v_lease uuid; v_events jsonb;
BEGIN
  DELETE FROM public.consent_bridge_nonces WHERE created_at < now()-interval '1 day';
  FOR v_row IN SELECT o.*,l.organization_id FROM public.consent_bridge_outbox o
    JOIN public.agentflow_consent_links l ON l.agent_id=o.agent_id
    WHERE l.relay_enabled AND o.created_at>=l.active_from AND o.delivered_at IS NULL
      AND o.retry_at<=now() AND o.attempts<8 AND (o.lease_until IS NULL OR o.lease_until<now())
    ORDER BY o.created_at LIMIT 5 FOR UPDATE OF o SKIP LOCKED
  LOOP
    v_lease:=gen_random_uuid();
    UPDATE public.consent_bridge_outbox SET lease_id=v_lease,lease_until=now()+interval '2 minutes',attempts=attempts+1 WHERE request_id=v_row.request_id;
    SELECT jsonb_agg(jsonb_build_object('id',id,'purpose',purpose,'choice',choice,'version',disclosure_version_id,'created_at',created_at) ORDER BY purpose)
      INTO v_events FROM public.sms_consent_events WHERE intake_request_id=v_row.request_id AND agent_id=v_row.agent_id;
    RETURN NEXT jsonb_build_object('request_id',v_row.request_id,'profile_id',v_row.agent_id,'organization_id',v_row.organization_id,
      'phone',(SELECT phone_e164 FROM public.intake_requests WHERE id=v_row.request_id),'events',v_events,'lease_id',v_lease);
  END LOOP;
END $$;

ALTER TABLE public.agentflow_consent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_bridge_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_bridge_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agentflow_consent_links,public.consent_bridge_nonces,public.consent_bridge_outbox FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.agentflow_consent_links,public.consent_bridge_nonces,public.consent_bridge_outbox TO service_role;
GRANT DELETE ON public.consent_bridge_nonces TO service_role;
REVOKE ALL ON FUNCTION public.agentflow_consent_check(uuid,uuid,text,text),public.agentflow_consent_suppress(uuid,uuid,text,text),public.claim_consent_bridge_events() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agentflow_consent_check(uuid,uuid,text,text),public.agentflow_consent_suppress(uuid,uuid,text,text),public.claim_consent_bridge_events() TO service_role;
