-- Run ONLY against a disposable PostgreSQL 17 database in GitHub Actions.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.agents (
  id uuid PRIMARY KEY,
  user_id uuid,
  is_published boolean NOT NULL
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agents TO anon,authenticated;
CREATE POLICY published_agents ON public.agents FOR SELECT TO anon,authenticated USING(is_published);
CREATE POLICY owned_agents ON public.agents FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
INSERT INTO public.agents(id,user_id,is_published) VALUES
('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000001',true),
('00000000-0000-4000-8000-000000000222','00000000-0000-4000-8000-000000000002',false);

\i supabase/migrations/20261029061000_agent_client_reviews.sql

DO $$
BEGIN
 IF has_table_privilege('anon','public.agent_reviews','INSERT')
   OR has_table_privilege('authenticated','public.agent_reviews','UPDATE')
   OR has_table_privilege('authenticated','public.agent_reviews','DELETE')
 THEN RAISE EXCEPTION 'public review write privilege leaked'; END IF;
 IF has_column_privilege('anon','public.agent_reviews','request_id','SELECT')
 THEN RAISE EXCEPTION 'request identifier exposed'; END IF;
 IF has_function_privilege('anon','public.record_agent_review_v1(uuid,integer,text,text,uuid)','EXECUTE')
  OR has_function_privilege('authenticated','public.record_agent_review_v1(uuid,integer,text,text,uuid)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.record_agent_review_v1(uuid,integer,text,text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'review RPC permission violation'; END IF;
 IF has_table_privilege('anon','private.agent_review_limits','SELECT')
 THEN RAISE EXCEPTION 'private fingerprints exposed'; END IF;
END $$;

DO $$
DECLARE
  first_id uuid;
  repeat_id uuid;
  amount integer;
  score numeric;
BEGIN
  first_id := public.record_agent_review_v1(
    '00000000-0000-4000-8000-000000000111',1,'',repeat('a',64),'00000000-0000-4000-8000-000000001001');
  IF first_id IS NULL THEN RAISE EXCEPTION 'review insert failed'; END IF;
  repeat_id := public.record_agent_review_v1(
    '00000000-0000-4000-8000-000000000111',1,'',repeat('a',64),'00000000-0000-4000-8000-000000001001');
  IF repeat_id IS DISTINCT FROM first_id THEN RAISE EXCEPTION 'idempotent retry duplicated'; END IF;
  BEGIN
    PERFORM public.record_agent_review_v1(
      '00000000-0000-4000-8000-000000000111',5,'duplicate',repeat('a',64),'00000000-0000-4000-8000-000000001002');
    RAISE EXCEPTION 'same visitor bypassed rate limit';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'review_rate_limited' THEN RAISE; END IF;
  END;
  PERFORM public.record_agent_review_v1(
    '00000000-0000-4000-8000-000000000111',5,'A helpful agent.',repeat('b',64),'00000000-0000-4000-8000-000000001003');
  BEGIN
    PERFORM public.record_agent_review_v1(
      '00000000-0000-4000-8000-000000000222',5,'',repeat('c',64),'00000000-0000-4000-8000-000000001004');
    RAISE EXCEPTION 'unpublished agent accepted review';
  EXCEPTION WHEN invalid_parameter_value THEN
    IF SQLERRM <> 'review_unavailable' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.record_agent_review_v1(
      '00000000-0000-4000-8000-000000000111',0,'',repeat('d',64),'00000000-0000-4000-8000-000000001005');
    RAISE EXCEPTION 'invalid rating accepted';
  EXCEPTION WHEN invalid_parameter_value THEN
    IF SQLERRM <> 'review_invalid' THEN RAISE; END IF;
  END;
  SELECT review_count,average_rating INTO amount,score FROM public.agent_review_summary
    WHERE agent_id='00000000-0000-4000-8000-000000000111';
  IF amount<>2 OR score<>3.0 THEN RAISE EXCEPTION 'incorrect aggregate % / %',amount,score; END IF;
END $$;

INSERT INTO public.agent_reviews(agent_id,rating,comment,status,request_id) VALUES
('00000000-0000-4000-8000-000000000111',1,'hidden','hidden','00000000-0000-4000-8000-000000002001'),
('00000000-0000-4000-8000-000000000222',5,'unpublished','published','00000000-0000-4000-8000-000000002002');

SET ROLE anon;
DO $$
BEGIN
 IF (SELECT count(id) FROM public.agent_reviews)<>2 THEN RAISE EXCEPTION 'visitor review leakage'; END IF;
 IF (SELECT count(agent_id) FROM public.agent_review_summary)<>1 THEN RAISE EXCEPTION 'visitor view leakage'; END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
BEGIN
 IF (SELECT count(id) FROM public.agent_reviews)<>3 THEN RAISE EXCEPTION 'owner review scope wrong'; END IF;
 IF (SELECT count(id) FROM public.agent_reviews WHERE agent_id='00000000-0000-4000-8000-000000000222')<>0
 THEN RAISE EXCEPTION 'owner can inspect unrelated review'; END IF;
END $$;
RESET ROLE;
\echo AGENT_REVIEWS_SQL_OK
