# Underwriter Verified: Lovable Cloud transfer

Updated October 5, 2026 UTC. The transfer is complete in production: `www.underwriterverified.com` serves repository commit `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015` against active Supabase project `jzdzeevjpootbeuniygx`. The original profile is assigned to Chris's confirmed login and the secured Edge Function is deployed. The former Lovable backend `rtgmdbqzkwlmplurypyh` is retired and not active production. This document preserves transfer history; do not operate on any AgentFlow resource.

## Confirmed targets

| Resource | Identity |
|---|---|
| Lovable source | Underwriter Verified, project `6ab991ff-a95a-4825-ac82-d10ad1e01aca` |
| Source backend | `rtgmdbqzkwlmplurypyh`, owned by Lovable Cloud |
| New destination organization | Underwriter Verified, `bmuykmwtwicpltmpenqm`, Free plan |
| Destination project | Underwriter Verified, `jzdzeevjpootbeuniygx`, `us-west-1`, ACTIVE_HEALTHY; organization verified before restoration |
| Destination API | `https://jzdzeevjpootbeuniygx.supabase.co` |
| Explicitly excluded | AgentFlow organization `kuzfuinlgtbfkdhlztxn` and project `jncvvsvckxhqgqvkppmj` |

The user completed the database-password step in the dashboard. No database password was read or stored by the assistant. The project uses PostgreSQL 17.11.0.002. Data API is enabled; automatic grants for new tables are disabled, so the migrations explicitly grant the required access.

## Source inventory, directly inspected through Lovable

- PostgreSQL 17.6; one application table, `public.agents`, with one row.
- No `auth.users` or `auth.identities`; no existing website logins to migrate.
- No storage buckets or objects. The existing headshot is a 335,546-character PNG data URL in `agents.headshot_url`.
- No `cron.job` table; no Vault secrets. This does not inventory Edge Function environment secrets.
- Two public functions: `handle_new_agent_user` and `update_updated_at_column`; signup and updated-at triggers exist.
- Canonical profile UUID: `e7c2f35a-e215-4e9e-9492-176a344384eb`; `cg-financial/christopher-garness`; `user_id = NULL`.
- Current SELECT is public; INSERT/UPDATE/DELETE RLS policies are owner-only. The historical anonymous policies are not present in the actual source. Broad table grants still exist; apply the ownership hardening to the destination.
- Actual source includes global `agents_slug_key` uniqueness as well as `(agency_slug, slug)` uniqueness. The pasted handoff omitted the global constraint. Preserve it for this migration; any later change to slug semantics requires its own review.
- Recorded source migration versions differ slightly from repository filenames. Preserve the recorded source catalog; do not claim those histories are identical.
- Only one Edge Function exists in the inspected source tree: `generate-testimonials`. It currently uses Lovable's AI gateway and `LOVABLE_API_KEY`.

The full profile and inspected catalog were captured in `underwriter-verified-source-snapshot.json`, outside Git. The pasted seed is not a data export: it omits the original UUID, timestamps, and headshot. Import the captured row, not a replacement seed. Existing profile content is preserved without asserting that the testimonials are verified client feedback.

## Prepared, guarded restore

Run the offline generator with the saved snapshot and a new private output directory:

```sh
node scripts/prepare-supabase-transfer.mjs /absolute/path/underwriter-verified-source-snapshot.json /absolute/path/new-transfer-output
```

It writes `bootstrap.sql` and a SHA-256 manifest, and does not connect to any service. It stops if the inspected source inventory or canonical ownership changed.

The generated SQL stops if the destination contains any public table, auth user, bucket, or storage object. It creates the source schema from reviewed migrations, applies the ownership lock before the consent schema, and inserts the full original profile without an upsert. Unsafe historical anonymous-write migrations are excluded. All SQL must execute atomically through `apply_migration`; wrap the whole file in a transaction when using SQL Editor or psql. No partial execution.

Use a named bootstrap migration, retain the manifest, and reconcile the new squashed baseline before any future CLI `db push`. Do not replay the historical files or fabricate source migration history. The original historical files remain unchanged in Git.

The last successful source count check still showed one agent, zero auth users, and zero storage objects. Lovable's free-plan MCP query limit prevented refreshing the full row immediately before import. The saved complete snapshot was restored to the empty destination. After the limit reset, a fresh source/destination comparison at approximately 21:30 UTC confirmed one profile, zero auth users, zero storage objects, and matching complete-profile JSON MD5 `874dc44f79c06c8536d01b5b667c5387`. Repeat the delta check immediately before a later cutover; stop on changed data and reconcile deliberately. Keep synthetic form submissions in isolated tests.

Local verification on October 3 passed in isolated PGlite: exact equality of every restored profile field (including the image and microsecond timestamps), refusal to run on a nonempty destination, no anonymous profile-write privileges, signup-trigger ownership, anonymous intake saving two separate non-grants, and the five-request daily AI quota with client execution denied. No hosted synthetic auth accounts or intake records were created.

## Applied and verified in the destination

- Hosted bootstrap migration: `20261003205343_bootstrap_underwriter_verified_from_lovable`. Bootstrap SHA-256: `83ba2dd3400c69db5db6e9e678306f3ba2cec2238ecd2e6765a508d30824d142`.
- Hosted follow-up: `20261003211036_secure_transferred_functions`, from local `20261003205704_secure_transferred_functions.sql`. The management tool assigns its own applied timestamp. Preserve this mapping rather than replaying it through `db push`.
- Before account setup, exact hosted JSON comparison confirmed all original profile fields, original ID, image, ownership, and timestamps matched the snapshot. The approved ownership assignment below intentionally changed only ownership and the automatic update timestamp. Intake requests and consent events remain empty.
- All seven application tables have RLS. Anonymous profile INSERT/UPDATE/DELETE privileges are absent; authenticated profile and inbox access remains owner-scoped.
- The three mutable-search-path advisor warnings are fixed. Remaining advisor findings reflect intentional access: validated public `submit_public_intake`, owner-scoped authenticated `my_sms_eligibility`, and server-only tables with no client policies. See [public definer guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [RLS policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Email/Password enabled, email confirmation enabled, anonymous sign-ins disabled. Site URL: `https://www.underwriterverified.com`; exact redirects: `https://www.underwriterverified.com/agent-admin` and `https://underwriterverified.com/agent-admin`.
- `generate-testimonials` deployed ACTIVE, version 1, JWT verification enabled. The handler additionally verifies a real Auth user and owned profile, validates input/output, and limits generation to five attempts per user per UTC day. Provider failures do not expose raw errors or credentials. Generated output always includes fictional-sample labels.
- `AI_API_KEY` has not been supplied. Generation stays unavailable until it is configured as an Edge Function secret; no OpenAI calls or charges were made. Platform-provided Supabase credentials remain server-side.
- Historical pre-cutover note: the draft frontend was moved to `jzdzeevjpootbeuniygx`, preview intake was disabled, and preview-only Vercel overrides were used to prove the destination before release. Inspection caught and corrected older preview configuration that still referenced Lovable. Production cutover later completed at `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015`; current production no longer uses the Lovable backend.
- Profile saving now explicitly updates the loaded owner-scoped row (or inserts when absent), because the preserved partial `user_id` unique index cannot support the previous PostgREST `onConflict` upsert.
- All 55 tests, TypeScript, changed-file ESLint, and the preview build passed. Function tests use mocked services. Real owner sign-in and empty inbox refresh are now verified in the preview; profile saving and an authenticated paid generation remain unverified.

## Approved destination ownership assignment

Chris explicitly confirmed `chris@fflagent.com` as this website's login and created the confirmed destination account `0e1b5e00-f63b-4c36-8d60-a4460ed7d55b`. No password was read or stored by the assistant. Signup created the blank starter profile `2ee5b0f9-ed17-4905-bcaf-a3b8eba32332` (`agency/chris`), conflicting with the one-profile-per-user index.

After separate approval of the data-preserving resolution, a guarded atomic transaction at **2026-10-04 00:14:04 UTC** unlinked that starter (`user_id = NULL`) and assigned the original `e7c2f35a-e215-4e9e-9492-176a344384eb` (`cg-financial/christopher-garness`) to the confirmed account. It checked the exact account, locked the profile rows, checked full pre-change hashes, and verified no starter-linked intake, consent, or suppression records existed. No row was deleted, no permission changed, and the starter remains publicly readable under the existing profile SELECT policy; it was not archived or hidden.

Independent post-commit readback confirmed two profiles preserved, exactly the original profile owned by the confirmed user, and the starter unlinked. Every field except `user_id` and the trigger-managed `updated_at` remained unchanged on both rows. Content JSON MD5 excluding those two fields: original `43ded92460cf1601e8620bc071ea6329`; starter `ce9a2ab9eeed3c3206af6a2404eb41ba`. RLS remains enabled and anonymous UPDATE remains denied. Intake, consent, suppression, and AI usage counts are all zero. A real owner browser sign-in subsequently succeeded through the secure credential prompt on October 4 UTC. At `https://underwriterverified-k4fnljgt3-cgarness-projects.vercel.app/agent-admin`, the dashboard loaded the original profile, photo, licenses, and testimonials. The owner inbox showed no requests and Refresh completed with the same empty result. No profile fields were edited or saved, no request submitted, and no generation invoked.

The historical source/destination full-row equality and zero-auth counts above describe the state **before** this approved setup. Future delta checks must explicitly account for the new destination auth account, preserved starter, and intentional canonical ownership/timestamp differences, while still comparing all canonical profile content and reviewing any new source records.

## Post-cutover state and remaining optional work

1. Production cutover is complete on `jzdzeevjpootbeuniygx`; do not repeat the old source-to-destination cutover procedure or replay the squashed bootstrap migrations.
2. Chris's confirmed account owns the canonical CG Financial profile. Preserve the documented unlinked starter row and existing owner/RLS model; no ownership change is part of the October 5 A2P refinement.
3. The optional `AI_API_KEY` remains unrelated to A2P readiness. Add it only through the Edge Function secret path if sample testimonial generation is wanted.
4. The October 5 A2P refinement is a separate forward release: it changes legal copy/link routing and adds one disclosure-version migration. That migration must receive exact production approval before application.
5. Keep the retired Lovable backend only as historical transfer/rollback context. AgentFlow remains a separate database and application.

Historical preparation note: the October 3 transfer preparation did not change production DNS, AgentFlow, Twilio registration, messaging, or phone numbers. A later separately approved release completed the website production cutover to `jzdzeevjpootbeuniygx`. The October 5 A2P refinement has not yet changed production data or messaging configuration.

Official migration references: [Lovable external deployment](https://docs.lovable.dev/tips-tricks/external-deployment-hosting) and [Lovable data export](https://docs.lovable.dev/features/advanced-settings). A full database export can also preserve auth password hashes if accounts are added before cutover; storage files are separate. Use the current inventory rather than assuming it stays empty.
