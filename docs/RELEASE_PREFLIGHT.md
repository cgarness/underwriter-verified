# Release preflight — intake and consent (PR #11)

**Prepared, not released.** The separate destination ownership assignment was specifically approved and completed; it does not authorize production database changes or the production merge/deployment. Those require Chris's approval of the final release after the remaining checks. Twilio submission and its fees require a separate approval. Never send communications or buy numbers during website verification.

**Migration update:** Chris confirmed that the source is Lovable Cloud and authorized a separate Supabase destination. The new **Underwriter Verified** organization (`bmuykmwtwicpltmpenqm`, Free) is created. Follow [SUPABASE_TRANSFER.md](SUPABASE_TRANSFER.md) for the fresh-project restore; the in-place release order below is historical context and must not be applied to AgentFlow or blindly replayed on the source. Direct Lovable inspection confirmed one full agent row, zero auth users/identities, no storage buckets/objects, and owner-only source RLS. The profile snapshot preserves its original headshot and timestamps. Destination project `jzdzeevjpootbeuniygx` is healthy in the separate organization; the original profile and consent schema are restored, auth redirects configured, and the secured Edge Function deployed. Confirmed account setup and the specifically approved ownership assignment are complete; real owner browser sign-in/profile loading and empty inbox refresh are verified in the preview. Actual owner saving, the optional AI secret, and production cutover remain pending. The last pre-account source/destination profile hash and count comparison matched. Repeat immediately before eventual cutover, accounting for the documented destination-only account, preserved starter, and ownership/update-timestamp changes.

## Verified targets and current evidence (October 3, 2026)

| Layer | Verified state |
|---|---|
| Canonical repository | `cgarness/underwriter-verified`, repository ID `1209937160`; formerly `cgarness/ffl-agent` |
| Existing PR | https://github.com/cgarness/underwriter-verified/pull/11 — open draft, branch `cursor/a2p-consent-intake-c93e` |
| Handoff head reviewed | `ad9f2a6c33003cfb45ad3c1134b82b3b3fcb5f15`; re-read the final head before approval/merge |
| Production main | `f220400ad7867c2f714a8b8eaea2f07f453b5d6e` |
| Production deployment | `dpl_EaYxadau9ifZd1hhMGZ6RS2Dgrr5`, READY, Git source, production target; aliases include both production domains; Vercel currently marks it a rollback candidate |
| Vercel project | `underwriterverified` / `prj_8B75x0g4FBYsP2uzSIEeCYHhMJSw`, team `cgarness-projects` / `team_iPboOWpwdIQRwdxmA5GJp5Rq` |
| Website database | Source Lovable Cloud `rtgmdbqzkwlmplurypyh`; destination `jzdzeevjpootbeuniygx` in organization `bmuykmwtwicpltmpenqm`; **never** AgentFlow's `jncvvsvckxhqgqvkppmj` |
| Canonical profile | Source remains unowned. Destination `e7c2f35a-e215-4e9e-9492-176a344384eb`, `cg-financial/christopher-garness`, now belongs to the confirmed `chris@fflagent.com` account after the separately approved transaction; content preserved |
| Public intake tables | Source has only `agents`; destination now has the reviewed consent schema with zero intake/consent records and RLS enabled |
| Hosted source access | Lovable connection now exposes the correct source project. Catalog and counts inspected read-only; see SUPABASE_TRANSFER.md. Supabase cannot administer this Lovable-owned source |
| Preview update | `4ba0824` added the preview submission guard and triggered a new Git-integrated preview. Older `ad9f2a6` bundles still contain the source hostname and intake RPC without that guard |
| Deployment protection | Vercel reports SSO protection `all_except_custom_domains`; password protection disabled. Protection limits access; it does not isolate database writes |

Earlier anonymous zero-row PATCH/DELETE probes are historical evidence only. They were not repeated. No profile takeover tests, production submissions, or production mutations were made during this preparation.

## Prepare destination and identify the owner

1. Destination project `jzdzeevjpootbeuniygx` is restored inside Underwriter Verified (`bmuykmwtwicpltmpenqm`). Verify this identity before any further write. Do not reconnect to AgentFlow or try to gain direct Supabase access to the Lovable-owned source. Keep source inspection in Lovable.
2. Completed: Chris explicitly confirmed `chris@fflagent.com`, created the destination account, and its confirmed Auth UUID was resolved as `0e1b5e00-f63b-4c36-8d60-a4460ed7d55b`. This was not inferred from a public contact field. No password was read or stored.
3. Completed at 2026-10-04 00:14:04 UTC: after exact row-content and incoming-FK checks and specific approval, the blank signup profile was unlinked without deletion and the original profile assigned atomically. Independent readback verifies both rows preserved, unchanged content, RLS enabled, anonymous UPDATE denied, and zero intake/consent/suppression/AI-usage rows. See the exact IDs and hashes in SUPABASE_TRANSFER.md. Real owner browser sign-in, original profile loading, and empty inbox refresh subsequently passed in the preview. No profile fields were edited or saved.
4. The current Vercel connector supports inspection, but does not expose environment editing or deployment retirement. Use an already authorized CLI/API if available; otherwise obtain permission to use the signed-in Vercel dashboard for those operations.

## Release blockers to resolve before approval

- Repeat the source delta check immediately before eventual cutover. The last pre-account comparison matched; now account for the documented destination-only account, preserved starter, and canonical ownership/update-timestamp changes. Destination bootstrap, exact content preservation, RLS/grants, public profile GET, and unauthenticated function rejection are verified.
- Actual owner saving and controlled consent-persistence verification remain for the approved workflow. Confirmed account setup, the approved ownership correction, real preview sign-in/profile loading, and empty inbox refresh are complete.
- Existing unsafe preview deployments retired or otherwise made inaccessible for testing; changing a new build cannot change old bundles.
- Vercel production settings and final environment values verified before cutover. The new preview at `4ba0824` confirms Git integration now uses repository `underwriter-verified`.
- Final PR head, exact migration contents/checksums, deployment settings, and rollback target re-read with no unexpected concurrent changes.

## Preview intake protection

New builds use `process.env.VERCEL_ENV` baked into `VITE_DEPLOYMENT_ENV`. Vite's `production` mode is not used to identify production, since previews also use that mode.

The UI disables submission, and `submitPublicIntake` independently refuses to call the RPC unless either:

- it is a Vercel production build, served over HTTPS on `www.underwriterverified.com` or `underwriterverified.com`, using the exact website production database; or
- it is a development build with both the page and API on localhost/loopback (isolated integration testing).

Unknown hosted databases and missing deployment-target configuration fail closed. Verify that Vercel exposes `VERCEL_ENV` at build time. A separate isolated hosted preview target requires a reviewed configuration change; none is provisioned by this release. The draft repository now targets `jzdzeevjpootbeuniygx`. Production deployment/settings are unchanged; verify any Vercel environment overrides before cutover.

**This is a client-side protection against accidental testing, not a database security boundary.** Someone can call a public intake RPC directly. It does not disable profile editor/auth operations, change old deployments, or revoke already-downloaded bundles. Keep testers off old URLs and close their tabs before release. Do not represent CORS, origin checks, or Vercel SSO as database authorization.

Known legacy intake previews to retire before opening the hosted intake RPC:

| Deployment | Commit |
|---|---|
| `dpl_5t1e8fsQ4g4h7NQUmPMgUpJgzQUK` | `ad9f2a6` |
| `dpl_9ecHP4BVyWFxWS3gbitbp957q9Lw` | `08daf59` |
| `dpl_FXzg2BSt7nSKUwPSy9A562N24eYF` | `861dcae` |

Re-list deployments at release time, including pagination; cover any additional pre-guard intake builds and their immutable URLs/branch aliases. Do not retire the production deployment or its rollback candidate. Confirm the replacement preview displays the disabled notice without submitting data.

## Historical in-place release order (superseded by the fresh-project transfer)

The destination already contains the atomic ownership-first bootstrap and secured function follow-up. **Do not rerun steps 1 or 4 below on it.** Use the current remaining steps in `SUPABASE_TRANSFER.md`; this older sequence documents why the ordering mattered.

1. **Inspect, then selectively apply the ownership lock first:** `supabase/migrations/20260929203000_lock_agent_ownership.sql`. It does not depend on the intake tables. Verify its effective permissions immediately. Account for any unexpected hosted policies or inherited PUBLIC grants before proceeding.
2. **Apply the approved ownership correction** in a guarded transaction, only after the account and any conflict are resolved. Have Chris verify the existing profile under his real login. No profile deletion is part of this plan.
3. **Retire the legacy previews and verify the replacement guard** before enabling intake. Preview configuration edits must not change production settings.
4. **Selectively apply intake:** `supabase/migrations/20260929183000_public_intake_and_sms_consent.sql`, with migrations tracked by the established migration mechanism. Reconcile actual hosted history and recorded SQL, rather than blindly replaying old files. This function becomes public immediately when the migration commits, even before a new frontend deploys.
5. **Verify hosted catalog and permissions** as below. Do not proceed on a mismatch.
6. **Merge only the approved PR head into `main`**, preserving newer unrelated work. Observe the existing Git-integrated deployment. Match its exact merge SHA, production target, and domain aliases. Do not promote a preview artifact: it has intake disabled by design and must be rebuilt with the production target.
7. **Run the minimal approved production checks** below.

Do not run an indiscriminate `supabase db push` or repair history simply because local files appear pending. The lock-before-intake order intentionally differs from timestamp order. If the established workflow requires one ordered batch, apply both exact scripts atomically with ownership protection effective before any public intake grant becomes visible, and record both original migrations only after success. The hosted workflow must be selected after inspecting real history; no generated migration ID should be guessed.

The two existing migration files are unchanged in this follow-up. The isolated SQL harness supports `bash scripts/test-intake-sql.sh --release-order` to verify ownership is locked before intake exists; its default retains chronological regression coverage.

## Ownership transaction template — no conflict case only

This is a template, not a ready-to-run production assignment. After Chris confirms the email, resolve the account through authorized auth records, inspect linked records, then fill the exact email and UUID in a private execution context. Never put credentials or EIN documents in Git.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.agents IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE
  v_login uuid;
  v_agent public.agents%ROWTYPE;
BEGIN
  SELECT id INTO STRICT v_login
  FROM auth.users
  WHERE lower(email) = lower('<confirmed website login email>')
  FOR SHARE;
  IF v_login <> '<verified auth user UUID>'::uuid THEN
    RAISE EXCEPTION 'confirmed account changed; stop and review';
  END IF;
  SELECT * INTO STRICT v_agent FROM public.agents
  WHERE id = 'e7c2f35a-e215-4e9e-9492-176a344384eb' FOR UPDATE;
  IF v_agent.agency_slug <> 'cg-financial'
     OR v_agent.slug <> 'christopher-garness'
     OR v_agent.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'canonical profile changed; stop and review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.agents WHERE user_id = v_login) THEN
    RAISE EXCEPTION 'existing owned profile; preserve it and obtain a conflict-resolution approval';
  END IF;
  UPDATE public.agents SET user_id = v_login
  WHERE id = v_agent.id AND user_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'ownership precondition failed'; END IF;
END $$;
COMMIT;
```

Re-read the profile after commit. Chris must see its intended existing fields and later its inbox through his own login. Do not mint a user token or guess a password to simulate his session.

## Hosted catalog checks

Read full definitions, not just object names:

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
AND tablename IN ('agents','intake_requests','sms_consent_events','sms_suppressions') ORDER BY 1,2;
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
('agents','intake_requests','sms_consent_events','sms_suppressions','sms_disclosure_versions','us_state_names');
SELECT tgname, tgenabled, pg_get_triggerdef(oid)
FROM pg_trigger WHERE tgrelid IN
('public.agents'::regclass,'public.intake_requests'::regclass,'public.sms_consent_events'::regclass,'public.sms_suppressions'::regclass)
AND NOT tgisinternal;
SELECT r.role, t.table_name, p.privilege,
  has_table_privilege(r.role, 'public.' || t.table_name, p.privilege) AS allowed
FROM (VALUES ('anon'),('authenticated')) r(role)
CROSS JOIN (VALUES ('agents'),('intake_requests'),('sms_consent_events'),('sms_suppressions')) t(table_name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) p(privilege);
SELECT p.proname, pg_get_function_identity_arguments(p.oid),
  p.prosecdef, p.proconfig, pg_get_functiondef(p.oid),
  r.role, has_function_privilege(r.role,p.oid,'EXECUTE') AS allowed
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(role)
WHERE n.nspname='public' AND p.proname IN
('submit_public_intake','evaluate_sms_eligibility','record_sms_suppression','my_sms_eligibility','protect_agent_ownership');
```

Expected: agents public SELECT only for anon; authenticated owner-scoped editing with `USING` and `WITH CHECK`; no anonymous write policies; ownership trigger blocks API reassignment. All evidence tables use RLS, authenticated owner-scoped SELECT only, no anon access. `submit_public_intake` is intentionally public; eligibility/suppression service functions are service-role only; `my_sms_eligibility` is authenticated and owner-scoped. Evidence mutation triggers remain. Inspect grants inherited through PUBLIC as well as direct grants. Run Supabase security advisors and assess findings against this intentional public submission design.

## Minimal production verification

Only after the release approval, use two clearly labeled synthetic requests (reserved 555-01xx phone numbers, `example.test` email); trigger no communications. Preserve those immutable records.

- Quote with neither checkbox; call request with informational only. Both forms start with independent optional unchecked controls.
- Confirm both requests and their two purpose-specific events, canonical agent/path, exact server-selected disclosure text/version, policy URLs, and server timestamps.
- Confirm a controlled failed save has no success UI (simulate network failure locally in the browser; do not break the production database).
- Chris retrieves the controlled requests through his real login; refresh retrieves real API data.
- Public visitors cannot read private records; verify actual catalog isolation. Keep bulk pagination and cross-owner attack tests isolated.
- Check contact links, scoped privacy/terms, and desktop/mobile rendering. A call request must not claim an appointment is confirmed.

## Rollback

Re-read Vercel's current production deployment and rollback candidate before approval. The presently verified candidate is `dpl_EaYxadau9ifZd1hhMGZ6RS2Dgrr5` at `f220400a`. Restoring it also restores the older combined-consent frontend, so it does **not** preserve registration readiness; pause registration until the corrected frontend is restored.

Keep the ownership protection and all intake, consent, and suppression records. Never drop or clear them. If intake must close, revoke execute from both API roles and PUBLIC, using the exact signature:

```sql
REVOKE EXECUTE ON FUNCTION public.submit_public_intake(
  uuid,text,text,text,text,text,text,text,text,text,boolean,boolean,text,text
) FROM PUBLIC, anon, authenticated;
```

Re-read effective permissions after closing the RPC. Reopening requires a reviewed grant and frontend release; never undo the ownership lock as rollback.

## Separate readiness decisions

- Website: destination restored and configured, confirmed account created, original profile assigned with content preserved, draft frontend prepared; source delta check, preview retirement, release approval, production cutover, and approved owner saving/controlled intake checks remain. Real preview sign-in, original profile loading, and empty inbox refresh are verified.
- Registration: use `docs/A2P_READINESS.md`; exact business identity, Twilio account/existing resources, volume, and all consent sources remain unconfirmed. No registration submitted.
- Sending: no website sender, queue, or AgentFlow consent connection exists. Send-time consent/suppression and provider STOP/HELP must be implemented and verified in the actual sender before operation.

## Independent follow-up validation

| Check | Result |
|---|---|
| Dependencies | Existing Bun lock installs with `bun@1.3.10 install --frozen-lockfile`; no dependency or lockfile changed. The older npm lock is out of sync, so `npm ci` is not the verified installation path |
| Frontend/function regressions | `npx vitest run`: **55 passed**, including separate consent, failed-save handling, retries, inbox, preview guards, old-backend refusal, and secured Edge Function boundaries |
| TypeScript | `npx tsc --noEmit -p tsconfig.app.json`: passed |
| Changed-file lint / diff | ESLint on the changed TS/TSX/config files and `git diff --check`: passed |
| Build targets | Both `VERCEL_ENV=preview npm run build` and `VERCEL_ENV=production npm run build`: passed; only existing bundle-size/Browserslist warnings |
| Release sequence and SQL behavior | All repository migrations, `agents_before_fix.sql`, `agents_after_fix.sql`, and `intake_assertions.sql` executed in isolated PGlite. Ownership lock applied before intake, and the intermediate state explicitly verified no public intake function plus no anonymous profile UPDATE privilege. Passed |
| Native PostgreSQL / PostgREST repeat | Not repeated here: the executor cannot switch to the local PostgreSQL OS account. PGlite results are not hosted or PostgREST integration results |
| Browser | Cloud Browser verified the new draft preview at application commit `246a3b9`: original profile/photo rendered, both SMS choices unchecked, intake button disabled, preview notice present. No submission performed. Subsequent secure real-owner sign-in loaded the original dashboard and refreshed the empty inbox; no profile save performed |
| Hosted destination | Both migrations applied; exact profile restored; approved account/ownership setup completed with both profiles preserved; public GET 200; RLS/grants verified; unauthenticated Edge Function 401; email auth enabled with confirmation required. Real owner browser sign-in/profile loading and empty inbox refresh verified; actual owner saving and paid AI call remain unverified |

The older handoff's 25 API / 20 browser passes remain reported prior evidence only. Production stays on `f220400a` until the approved release.
