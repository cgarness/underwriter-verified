-- Fixtures for the PostgREST integration run. Synthetic data only.
-- Two agents, two owners. Owner A is the stand-in for the canonical profile;
-- owner B exists so cross-owner isolation can be checked over HTTP.

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner-b@example.test')
ON CONFLICT (id) DO NOTHING;

-- Signup provisioning created starter rows for both logins. Remove them so the
-- seeded profiles below are the only ones that carry these user_ids.
DELETE FROM public.agents WHERE user_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

INSERT INTO public.agents (id, slug, agency_slug, name, first_name, last_name, agency, phone, email, calendar_url, user_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'christopher-garness', 'cg-financial', 'Christopher Garness', 'Christopher', 'Garness', 'CG Financial', '909-775-6963', 'test-a@example.test', 'https://calendar.example.test/a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'other-agent', 'other-agency', 'Other Agent', 'Other', 'Agent', 'Other Agency', '555-010-0000', 'test-b@example.test', '', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Two requests that share an identical created_at so the (created_at, id)
-- tie-breaker in the inbox cursor is exercised through PostgREST.
WITH tie AS (SELECT TIMESTAMPTZ '2026-09-30 12:00:00+00' AS ts)
INSERT INTO public.intake_requests (id, idempotency_key, payload_hash, agent_id, form_source, page_path, first_name, last_name, email, phone_e164, phone_display, state, created_at)
SELECT * FROM (VALUES
  ('aaaa0001-0000-0000-0000-000000000001'::uuid, 'aaaa0001-0000-0000-0000-00000000f001'::uuid, 'seed-tie-1', '11111111-1111-1111-1111-111111111111'::uuid, 'quote', '/cg-financial/christopher-garness', 'TEST Tie', 'One', 'tie-one@example.test', '+19095550101', '(909) 555-0101', 'California', (SELECT ts FROM tie)),
  ('aaaa0001-0000-0000-0000-000000000002'::uuid, 'aaaa0001-0000-0000-0000-00000000f002'::uuid, 'seed-tie-2', '11111111-1111-1111-1111-111111111111'::uuid, 'quote', '/cg-financial/christopher-garness', 'TEST Tie', 'Two', 'tie-two@example.test', '+19095550102', '(909) 555-0102', 'California', (SELECT ts FROM tie))
) AS v;

INSERT INTO public.sms_consent_events (intake_request_id, agent_id, phone_e164, purpose, choice, disclosure_version_id, displayed_text, sender_name, sender_agency, privacy_url, terms_url, privacy_effective_on, terms_effective_on)
SELECT r.id, r.agent_id, r.phone_e164, p.purpose, 'not_granted', '2026-09-29-separate-sms', 'seeded', 'Christopher Garness', 'CG Financial',
  'https://www.underwriterverified.com/cg-financial/christopher-garness/privacy-policy',
  'https://www.underwriterverified.com/cg-financial/christopher-garness/terms-and-conditions',
  DATE '2026-09-29', DATE '2026-09-29'
FROM public.intake_requests r
CROSS JOIN (VALUES ('informational'), ('marketing')) AS p(purpose)
WHERE r.payload_hash LIKE 'seed-tie-%';
