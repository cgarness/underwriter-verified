-- Owner-authorized SMS activation preparation. Relay remains disabled.
BEGIN;
DO $$
DECLARE v_agent public.agents;
BEGIN
 SELECT * INTO STRICT v_agent FROM public.agents
 WHERE agency_slug='cg-financial' AND slug='christopher-garness';
 IF regexp_replace(trim(v_agent.name),'\s+',' ','g')<>'Christopher Garness'
 OR regexp_replace(trim(v_agent.agency),'\s+',' ','g')<>'CG Financial'
 OR EXISTS(SELECT 1 FROM public.agentflow_consent_links WHERE agent_id=v_agent.id)
 THEN RAISE EXCEPTION 'CG Financial consent identity or mapping drift'; END IF;
 INSERT INTO public.agentflow_consent_links(organization_id,agent_id,agency_slug,agent_slug,sender_name,sender_agency,relay_enabled)
 VALUES('a0000000-0000-0000-0000-000000000001',v_agent.id,'cg-financial','christopher-garness',
 'Christopher Garness','CG Financial',false);
END $$;
COMMIT;
