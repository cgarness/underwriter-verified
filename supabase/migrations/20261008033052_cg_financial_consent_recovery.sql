-- Approved website consent recovery; relay and activation watermark remain unchanged.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM public.agentflow_consent_links
      WHERE agency_slug='cg-financial' AND agent_slug='christopher-garness'
        AND NOT relay_enabled AND active_from IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Expected paused CG Financial website mapping';
  END IF;
  IF (SELECT count(*) FROM vault.decrypted_secrets
      WHERE name='uv_consent_worker_token' AND length(decrypted_secret)>=32) <> 1 THEN
    RAISE EXCEPTION 'Website recovery credential is missing';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='uv-consent-recovery-every-minute') THEN
    RAISE EXCEPTION 'Website recovery schedule already exists; review before replacing';
  END IF;
END $guard$;

SELECT cron.schedule('uv-consent-recovery-every-minute','* * * * *',$job$
  SELECT net.http_post(
    url := 'https://jzdzeevjpootbeuniygx.supabase.co/functions/v1/consent-event-worker',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||decrypted_secret),
    body := '{}'::jsonb, timeout_milliseconds := 100000
  ) FROM vault.decrypted_secrets WHERE name='uv_consent_worker_token' AND length(decrypted_secret)>=32;
$job$);
