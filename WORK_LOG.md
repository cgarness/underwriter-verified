## 2026-10-17 — AgentFlow → Underwriter Verified profile synchronization (approved isolated build; not live)

Chris authorized taking care of the build. Implemented on `codex/uv-profile-sync-20261017`; no main merge, hosted migration/RLS, secret, scheduler, production data or deployment action is authorized or performed. Paired plan and exact release gates: `docs/plans/2026-10-17-agentflow-profile-sync/implementation_plan.md` and `release.md`.

**Changes:** organization/profile UUID mapping, opt-in public contact fields, stable public links, dedicated signed one-way sync, durable revisions/leases/retries/tombstones, fresh canonical AF profile/license reads without profile-save triggers, and public/owner separation. Existing UV owner, URL and consent-linked identity/evidence remain preserved. AF has compact View/Copy/Manage controls in Agent Profile and My Profile, default-off. UV uses published-only reads, synchronous resolved-agent context, neutral missing-photo initials, masked contact actions and server-enforced linked-field ownership; website-only bio/booking/testimonials remain UV-owned. No actual credential verification, intake-to-AF import, owner SSO, SMS or dialer change.

**Files:** scoped plans/release/verification; new focused profile UI/API/hook/tests and/or UV profile/render/admin/metadata integration files; dedicated function/protocol modules; one new unapplied migration per repository; test-only verification workflow. The UV npm lock repair preserves dependency declarations and is detailed in verification.md.

**Verification:** paired SQL/handler harness 18/18 in separate isolated PostgreSQL-WASM engines; UV 83/83 tests; AF 101 targeted protocol/control/hook/profile regressions; root typechecks and builds pass; AF app diagnostics match the 84-diagnostic exact-source baseline. No production or real-browser pass claimed; local browser navigation was administratively blocked. Native PostgreSQL concurrency test is included for CI; exact-head CI outcomes remain to be checked.

**Migrations/deployments:** none applied/deployed. Candidate migration hashes and explicit RLS/function/authentication/activation gates are in release.md.

**Blockers/next:** UV project management access is currently denied; verify live schema/preimages before release. Run exact-head CI, review the paired PRs, approve exact backend phases separately, confirm canonical contact/legal behavior, pilot mapping and publication choices. New-profile intake routing/owner access and real browser acceptance are not assumed complete. Preserve all unrelated concurrent work.

---

## 2026-10-14 — Audited informational re-enrollment

Added private append-only restoration evidence for the owner's explicit new permission to receive ClearPath lead alerts. Original STOP and website evidence preserved. Marketing stays blocked; repeated STOP and provider blocks remain effective. No public/service-role restoration writes or new public RPC. Eight rollback-only database assertions passed; migration applied, owner authorization recorded separately, eligibility read back informational allowed/marketing suppressed. See docs/informational-sms-reenrollment.md. Alert delivery verification remains separate; no A2P or sender configuration changed.

## 2026-10-08 — Consent bridge activated and informational confirmation delivered

Chris approved server credentials and an informational opt-in/test to his own confirmed phone. Created the scoped bridge/worker secrets, matching worker Vault entry and authenticated one-minute outbox recovery (hosted 20261008033219). Fixed exact Edge public/runtime path handling with canonical-path HMAC unchanged; agentflow-consent v3 was deployed and every file read back exact. A real service_role call exposed missing EXECUTE on normalize_us_phone_e164; hosted 20261008034841 grants only that server role, preserving anon/authenticated denial and SECURITY INVOKER. The SQL bootstrap now models those production function ACLs rather than silently granting every function to service_role.

Hosted activation 20261008035127 enabled only the verified CG Financial mapping from 2026-10-08T03:52:00Z. The genuine browser form submitted at 03:52:15 UTC with informational checked and marketing unchecked; immutable evidence uses 2026-10-05-policy-clarifications. Outbox delivered once, AgentFlow confirmed informational enrollment once, and Twilio independently returned delivered for the resulting message. One older intake/two events remain intact; final totals are two intakes/four events. HELP/STOP handset replies remain pending. No legal/frontend wording, RLS, historical evidence or voice behavior changed. Repository migrations preserve the exact hosted SQL; the private submission record contains dispatch identifiers.

## 2026-10-08 — AgentFlow consent bridge production preparation

Chris authorized getting SMS working. Applied the byte-identical bridge migration as hosted 20261008022320 and guarded CG Financial mapping as 20261008022521. Deployed agentflow-consent and consent-event-worker v1; all source files were read back byte-identical and unauthenticated requests were rejected. Relay remains disabled with no activation watermark while credentials/recovery workers and the coordinated SMS activation are completed. No frontend/legal change is part of this release. One pre-existing intake/two consent events were found and are not replayed. No form or SMS was submitted by this release.

## 2026-10-05 — AgentFlow consent bridge isolated build

Chris approved the paired implementation plan. Added the HMAC-scoped eligibility/suppression endpoint and transactional outbox with authenticated delivery worker; no mapping, secret, cron or activation was applied. Website legal UI and production remain unchanged. Existing 57 tests/build pass; paired SQL and Edge evidence lives in AgentFlow's `docs/plans/2026-10-05-sms-consent/verification.md`. Native provider/browser checks remain release gates. See `docs/AGENTFLOW_CONSENT_BRIDGE.md`.

# Work Log

## 2026-10-05 — CG Financial A2P website refinement release candidate

- Started from verified production `main` commit `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015`; production Vercel deployment `dpl_GZuyHXvegWx3YwUVAjk1PL6hAbap` is READY and active Supabase is `jzdzeevjpootbeuniygx`.
- Confirmed no open PR conflicted with this work. The only diverged historical branch touches `HeroSection.tsx` / `TrustBar.tsx`, outside this change.
- `AGENTS.md`, `AGENT_RULES.md`, `VISION.md`, and a prior `WORK_LOG.md` were absent; no instructions were invented.
- Created isolated branch `codex/cg-financial-a2p-refinements-20261005` and added `implementation_plan.md`; Chris approved implementation before application/backend changes.
- Updated the shared SMS non-sharing statement to explicitly cover mobile numbers, mobile information, SMS opt-in data, and SMS consent.
- Fixed the `/sms-opt-in` footer by adding optional scoped overrides to `LegalNavLinks`; generic and other agent-scoped routing remains unchanged.
- Clarified Terms section 4 so a call request by itself is not SMS consent and a separately checked box grants only its corresponding section 3 permission.
- Advanced Privacy/Terms release-candidate effective dates to October 5, 2026 and archived the September 29 page sources.
- Used `supabase migration --help` and `supabase migration new` in isolated CI; the CLI generated `20261005182200_advance_a2p_policy_disclosure.sql`.
- Prepared that forward-only migration to preserve the September 29 row, insert `2026-10-05-policy-clarifications`, and change no schema/RLS/ownership/suppression/messaging configuration. **It has not been applied to production.**
- Exact-base verification passed: both TypeScript checks, 33 targeted tests, 55 full-suite tests, and the production build. Existing warnings were React Router future warnings, stale Browserslist data, and the pre-existing >500 kB bundle warning.
- Final verification on application/legal head `08da6618431c18b91e4a9e126427767e0b6d006b` passed: both TypeScript checks; 42/42 targeted A2P/intake/eligibility tests; 57/57 full-suite tests; changed-file ESLint; `git diff --check`; the local PostgreSQL release-order harness (`INTAKE_SQL_OK`); production build; and all five required routes at 1440×900 desktop and 390×844 mobile widths. Both SMS consent controls remained unchecked on `/sms-opt-in` and `/bookcall`; no form was submitted.
- Existing diagnostics were unchanged from the exact-base run: React Router v7 future-flag notices, stale Browserslist data, and the existing >500 kB bundle-size warning. No new TypeScript, test, lint, SQL, or rendered-route diagnostic was introduced.
- The temporary branch-only verification workflow was removed before PR preparation.
- No production form was submitted, no lead/message was generated, and no AgentFlow, Twilio/TCR, phone-number, Messaging Service, production ownership, or production Supabase data change was made.
- Remaining gate: prepare the draft PR/release summary and obtain Chris's explicit Gate 2 approval before the exact production migration, merge, or deployment.
