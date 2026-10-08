-- Authenticated lifecycle snapshots; immutable original grants and STOP rows remain intact.
ALTER TABLE public.agentflow_consent_links
  ADD COLUMN start_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN start_active_from timestamptz,
  ADD CONSTRAINT bridge_start_activation CHECK(NOT start_enabled OR start_active_from IS NOT NULL);
CREATE TABLE public.sms_lifecycle_receipts (
  organization_id uuid NOT NULL REFERENCES public.agentflow_consent_links(organization_id),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  phone_e164 text NOT NULL,
  revision bigint NOT NULL CHECK(revision>0),
  restored boolean NOT NULL,
  start_event_id uuid,
  prior_consent_event uuid REFERENCES public.sms_consent_events(id),
  first_stop_at timestamptz,
  start_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(organization_id,phone_e164,revision),
  CHECK(NOT restored OR (start_event_id IS NOT NULL AND prior_consent_event IS NOT NULL AND first_stop_at IS NOT NULL AND start_at>first_stop_at))
);
CREATE INDEX sms_lifecycle_current ON public.sms_lifecycle_receipts(agent_id,phone_e164,revision DESC);
CREATE INDEX sms_lifecycle_prior_evidence ON public.sms_lifecycle_receipts(prior_consent_event);
-- Record every independent revocation, including repeats when the historical unique
-- suppression row already exists. AF lifecycle delivery does not use this endpoint.
CREATE TABLE public.sms_independent_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL REFERENCES public.agents(id),
  phone_e164 text NOT NULL, reason text NOT NULL, source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX sms_independent_revocations_phone ON public.sms_independent_revocations(agent_id,phone_e164);
CREATE TRIGGER sms_lifecycle_receipts_immutable BEFORE UPDATE OR DELETE ON public.sms_lifecycle_receipts FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_mutation();
CREATE TRIGGER sms_independent_revocations_immutable BEFORE UPDATE OR DELETE ON public.sms_independent_revocations FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_mutation();

CREATE FUNCTION public.agentflow_consent_lifecycle(p_org uuid,p_agent uuid,p_phone text,p_revision bigint,
  p_restored boolean,p_start_event uuid,p_prior_event uuid,p_first_stop timestamptz,p_start_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE l public.agentflow_consent_links; r public.sms_lifecycle_receipts; v_phone text; v_allowed boolean;
BEGIN
  -- Reuses the strict org/profile/sender identity check without widening privileges.
  PERFORM public.agentflow_consent_check(p_org,p_agent,p_phone,'informational');
  SELECT * INTO STRICT l FROM public.agentflow_consent_links WHERE organization_id=p_org AND agent_id=p_agent;
  v_phone:=public.normalize_us_phone_e164(p_phone);
  IF v_phone IS NULL OR p_revision IS NULL OR p_revision<1 OR p_restored IS NULL THEN RAISE EXCEPTION 'lifecycle_input'; END IF;
  IF NOT p_restored AND (p_start_event IS NOT NULL OR p_prior_event IS NOT NULL OR p_first_stop IS NOT NULL OR p_start_at IS NOT NULL)
    THEN RAISE EXCEPTION 'lifecycle_input'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_agent::text||':'||v_phone,0));
  IF p_restored AND (NOT l.start_enabled OR l.start_active_from IS NULL OR p_start_at IS NULL
    OR p_start_at<l.start_active_from OR p_start_at>clock_timestamp()+interval '1 minute'
    OR p_first_stop IS NULL OR p_start_at<=p_first_stop OR p_start_event IS NULL
    OR NOT EXISTS(SELECT 1 FROM public.sms_consent_events WHERE id=p_prior_event AND agent_id=p_agent
      AND phone_e164=v_phone AND purpose='informational' AND choice='granted' AND created_at<p_first_stop))
    THEN RAISE EXCEPTION 'lifecycle_grant_scope'; END IF;
  SELECT * INTO r FROM public.sms_lifecycle_receipts WHERE organization_id=p_org AND phone_e164=v_phone AND revision=p_revision;
  IF FOUND THEN
    IF (r.agent_id,r.restored,r.start_event_id,r.prior_consent_event,r.first_stop_at,r.start_at)
      IS DISTINCT FROM (p_agent,p_restored,p_start_event,p_prior_event,p_first_stop,p_start_at) THEN RAISE EXCEPTION 'lifecycle_conflict'; END IF;
  ELSE
    INSERT INTO public.sms_lifecycle_receipts(organization_id,agent_id,phone_e164,revision,restored,start_event_id,prior_consent_event,first_stop_at,start_at)
      VALUES(p_org,p_agent,v_phone,p_revision,p_restored,p_start_event,p_prior_event,p_first_stop,p_start_at);
  END IF;
  -- Historical suppression remains visible even while informational consent is restored.
  INSERT INTO public.sms_suppressions(agent_id,phone_e164,reason,source)
    VALUES(p_agent,v_phone,'stop','agentflow_verified') ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT r FROM public.sms_lifecycle_receipts WHERE organization_id=p_org AND phone_e164=v_phone ORDER BY revision DESC LIMIT 1;
  SELECT allowed INTO v_allowed FROM public.evaluate_sms_eligibility(p_agent,v_phone,'informational');
  RETURN jsonb_build_object('organization_id',p_org,'profile_id',p_agent,'phone',v_phone,'revision',r.revision,'restored',r.restored,'informational_allowed',v_allowed);
END $$;

CREATE OR REPLACE FUNCTION public.evaluate_sms_eligibility(p_agent_id uuid,p_phone text,p_message_class text)
RETURNS TABLE(allowed boolean,reason text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_phone text:=public.normalize_us_phone_e164(p_phone); r public.sms_lifecycle_receipts;
BEGIN
  IF p_message_class IS NULL OR p_message_class NOT IN ('informational','marketing') OR v_phone IS NULL THEN
    RETURN QUERY SELECT false,'invalid_class'::text; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.sms_suppressions WHERE agent_id=p_agent_id AND phone_e164=v_phone) THEN
    SELECT * INTO r FROM public.sms_lifecycle_receipts WHERE agent_id=p_agent_id AND phone_e164=v_phone ORDER BY revision DESC LIMIT 1;
    IF p_message_class='informational' AND r.restored
      AND EXISTS(SELECT 1 FROM public.agentflow_consent_links WHERE agent_id=p_agent_id AND organization_id=r.organization_id
        AND start_enabled AND start_active_from<=r.start_at)
      AND NOT EXISTS(SELECT 1 FROM public.sms_suppressions s WHERE s.agent_id=p_agent_id AND s.phone_e164=v_phone AND (s.source<>'agentflow_verified' OR s.reason<>'stop'))
      AND NOT EXISTS(SELECT 1 FROM public.sms_independent_revocations WHERE agent_id=p_agent_id AND phone_e164=v_phone)
      AND EXISTS(SELECT 1 FROM public.sms_consent_events WHERE id=r.prior_consent_event AND agent_id=p_agent_id
        AND phone_e164=v_phone AND purpose='informational' AND choice='granted' AND created_at<r.first_stop_at) THEN
      RETURN QUERY SELECT true,'granted'::text; RETURN;
    END IF;
    RETURN QUERY SELECT false,'suppressed'::text; RETURN;
  END IF;
  RETURN QUERY SELECT EXISTS(SELECT 1 FROM public.sms_consent_events WHERE agent_id=p_agent_id AND phone_e164=v_phone AND purpose=p_message_class AND choice='granted'),
    CASE WHEN EXISTS(SELECT 1 FROM public.sms_consent_events WHERE agent_id=p_agent_id AND phone_e164=v_phone AND purpose=p_message_class AND choice='granted') THEN 'granted' ELSE 'no_grant' END;
END $$;

CREATE OR REPLACE FUNCTION public.record_sms_suppression(p_agent_id uuid,p_phone text,p_reason text,p_source text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_phone text:=public.normalize_us_phone_e164(p_phone); v_id uuid;
BEGIN
  IF v_phone IS NULL OR p_reason IS NULL OR p_reason NOT IN ('stop','provider_block') OR length(trim(coalesce(p_source,'')))<3
    OR length(p_source)>80 OR NOT EXISTS(SELECT 1 FROM public.agents WHERE id=p_agent_id) THEN RAISE EXCEPTION 'invalid_input'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_agent_id::text||':'||v_phone,0));
  INSERT INTO public.sms_independent_revocations(agent_id,phone_e164,reason,source) VALUES(p_agent_id,v_phone,p_reason,trim(p_source));
  INSERT INTO public.sms_suppressions(agent_id,phone_e164,reason,source) VALUES(p_agent_id,v_phone,p_reason,trim(p_source)) ON CONFLICT DO NOTHING;
  SELECT id INTO STRICT v_id FROM public.sms_suppressions WHERE agent_id=p_agent_id AND phone_e164=v_phone;
  RETURN v_id;
END $$;
-- Retain existing SECURITY DEFINER functions and their ACLs. No new browser grants.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['sms_lifecycle_receipts','sms_independent_revocations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
    EXECUTE format('GRANT SELECT,INSERT ON public.%I TO service_role',t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.agentflow_consent_lifecycle(uuid,uuid,text,bigint,boolean,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agentflow_consent_lifecycle(uuid,uuid,text,bigint,boolean,uuid,uuid,timestamptz,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.agentflow_consent_check(p_org uuid,p_agent uuid,p_phone text,p_purpose text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_link public.agentflow_consent_links; v_agent public.agents; v_phone text; v_allowed boolean; v_reason text; v_events jsonb; v_restore public.sms_lifecycle_receipts;
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
  IF v_allowed AND p_purpose='informational' THEN
    SELECT * INTO v_restore FROM public.sms_lifecycle_receipts WHERE agent_id=p_agent AND phone_e164=v_phone ORDER BY revision DESC LIMIT 1;
    IF v_restore.restored THEN
      SELECT jsonb_build_array(
        jsonb_build_object('id',e.id,'disclosure_version_id',e.disclosure_version_id,'created_at',e.created_at),
        jsonb_build_object('id',v_restore.start_event_id,'disclosure_version_id',e.disclosure_version_id,'created_at',v_restore.start_at,'source','verified_start'))
        INTO v_events FROM public.sms_consent_events e WHERE e.id=v_restore.prior_consent_event;
    END IF;
  END IF;
  RETURN jsonb_build_object('organization_id',p_org,'profile_id',p_agent,'phone',v_phone,'purpose',p_purpose,
    'allowed',v_allowed,'reason',v_reason,'checked_at',clock_timestamp(),'evidence',v_events);
END $$;
