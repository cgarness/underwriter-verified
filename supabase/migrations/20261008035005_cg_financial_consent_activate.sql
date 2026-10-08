-- Coordinated with AgentFlow's approved five-sender activation. No backfill.
DO $activation$
DECLARE l public.agentflow_consent_links; a public.agents;
BEGIN
  SELECT * INTO STRICT l FROM public.agentflow_consent_links
    WHERE agency_slug='cg-financial' AND agent_slug='christopher-garness';
  SELECT * INTO STRICT a FROM public.agents WHERE id=l.agent_id;
  IF l.relay_enabled OR l.active_from IS NOT NULL
    OR a.agency_slug IS DISTINCT FROM l.agency_slug OR a.slug IS DISTINCT FROM l.agent_slug
    OR regexp_replace(trim(a.name),'\s+',' ','g') IS DISTINCT FROM l.sender_name
    OR regexp_replace(trim(a.agency),'\s+',' ','g') IS DISTINCT FROM l.sender_agency
    OR l.sender_name<>'Christopher Garness' OR l.sender_agency<>'CG Financial' THEN
    RAISE EXCEPTION 'consent_activation_mapping_drift';
  END IF;
  IF (SELECT array_agg(id) FROM public.sms_disclosure_versions WHERE is_current)
    IS DISTINCT FROM ARRAY['2026-10-05-policy-clarifications']::text[] THEN
    RAISE EXCEPTION 'consent_activation_disclosure_drift';
  END IF;
  IF EXISTS (SELECT 1 FROM public.consent_bridge_outbox WHERE agent_id=l.agent_id)
    OR NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='uv-consent-recovery-every-minute'
      AND active AND schedule='* * * * *')
    OR NOT has_function_privilege('service_role','public.normalize_us_phone_e164(text)','EXECUTE') THEN
    RAISE EXCEPTION 'consent_activation_recovery_drift';
  END IF;
  UPDATE public.agentflow_consent_links SET relay_enabled=true,active_from='2026-10-08T03:52:00Z'
    WHERE organization_id=l.organization_id AND agent_id=l.agent_id;
END $activation$;
