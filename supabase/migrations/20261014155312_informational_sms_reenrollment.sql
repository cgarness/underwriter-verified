-- Preserve original STOP evidence. Re-enrollment is administrator-only,
-- informational-only and requires separately recorded explicit authorization.
-- No browser, service-role, automatic START, or website enrollment write path.
CREATE TABLE private.sms_reenrollment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  suppression_id uuid NOT NULL REFERENCES public.sms_suppressions(id),
  action text NOT NULL CHECK (action IN ('restore_informational','stop','provider_block')),
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence)='object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX sms_reenrollment_latest ON private.sms_reenrollment_events(suppression_id,id DESC);
ALTER TABLE private.sms_reenrollment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.sms_reenrollment_events FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE private.sms_reenrollment_events_id_seq FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER sms_reenrollment_no_mutation BEFORE UPDATE OR DELETE ON private.sms_reenrollment_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_mutation();

CREATE OR REPLACE FUNCTION public.record_sms_suppression(p_agent_id uuid,p_phone text,p_reason text,p_source text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_phone text:=public.normalize_us_phone_e164(p_phone); v_id uuid;
BEGIN
  IF v_phone IS NULL OR p_reason IS NULL OR p_reason NOT IN ('stop','provider_block')
    OR length(trim(COALESCE(p_source,'')))<3 OR length(p_source)>80
    OR NOT EXISTS(SELECT 1 FROM public.agents WHERE id=p_agent_id) THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.sms_suppressions(agent_id,phone_e164,reason,source)
  VALUES(p_agent_id,v_phone,p_reason,trim(p_source)) ON CONFLICT(agent_id,phone_e164) DO NOTHING;
  -- Serialize repeated STOP and administrative restoration on the original row.
  SELECT id INTO STRICT v_id FROM public.sms_suppressions
    WHERE agent_id=p_agent_id AND phone_e164=v_phone FOR UPDATE;
  INSERT INTO private.sms_reenrollment_events(suppression_id,action,evidence)
    VALUES(v_id,p_reason,jsonb_build_object('source',trim(p_source)));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.evaluate_sms_eligibility(p_agent_id uuid,p_phone text,p_message_class text)
RETURNS TABLE(allowed boolean,reason text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_phone text:=public.normalize_us_phone_e164(p_phone); v_s public.sms_suppressions; v_action text;
BEGIN
  IF p_message_class IS NULL OR p_message_class NOT IN ('informational','marketing') OR v_phone IS NULL THEN
    RETURN QUERY SELECT false,'invalid_class'::text; RETURN;
  END IF;
  SELECT * INTO v_s FROM public.sms_suppressions WHERE agent_id=p_agent_id AND phone_e164=v_phone;
  IF FOUND THEN
    SELECT action INTO v_action FROM private.sms_reenrollment_events
      WHERE suppression_id=v_s.id ORDER BY id DESC LIMIT 1;
    -- A provider block can never be cleared by this informational restoration.
    IF p_message_class<>'informational' OR v_s.reason<>'stop'
      OR v_action IS DISTINCT FROM 'restore_informational'
      OR EXISTS(SELECT 1 FROM private.sms_reenrollment_events WHERE suppression_id=v_s.id AND action='provider_block') THEN
      RETURN QUERY SELECT false,'suppressed'::text; RETURN;
    END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public.sms_consent_events WHERE agent_id=p_agent_id AND phone_e164=v_phone
    AND purpose=p_message_class AND choice='granted') THEN
    RETURN QUERY SELECT true,'granted'::text;
  ELSE
    RETURN QUERY SELECT false,'no_grant'::text;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_sms_suppression(uuid,text,text,text),public.evaluate_sms_eligibility(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_sms_suppression(uuid,text,text,text),public.evaluate_sms_eligibility(uuid,text,text) TO service_role;
