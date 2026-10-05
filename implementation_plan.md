# CG Financial A2P website refinements — implementation plan

Status: **planning only; not approved for implementation or production changes**

Prepared: 2026-10-05  
Repository: `cgarness/underwriter-verified`  
Base / verified production commit: `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015`  
Working branch: `codex/cg-financial-a2p-refinements-20261005`  
Production site: `https://www.underwriterverified.com`  
Active website Supabase: `jzdzeevjpootbeuniygx`  
Excluded: retired Lovable backend `rtgmdbqzkwlmplurypyh`; AgentFlow database `jncvvsvckxhqgqvkppmj`

## Verified starting state

- GitHub `main` is exactly `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015`.
- Vercel production deployment `dpl_GZuyHXvegWx3YwUVAjk1PL6hAbap` is READY from that same commit.
- `www.underwriterverified.com` is a verified production domain; the apex redirects to `www`.
- Active Supabase project `jzdzeevjpootbeuniygx` is ACTIVE_HEALTHY.
- Hosted migrations are `20261003205343_bootstrap_underwriter_verified_from_lovable` and `20261003211036_secure_transferred_functions`.
- Hosted consent state is clean: 0 intake requests, 0 SMS consent events, and 0 suppressions.
- The one current hosted disclosure version is `2026-09-29-separate-sms`, with privacy and terms effective dates of 2026-09-29.
- No open PRs exist. All older branches are behind `main` except `cursor/verified-badge-above-fold-3283`, which is one commit ahead / 23 behind and only changes `src/components/HeroSection.tsx` and `src/components/TrustBar.tsx`; this plan does not touch those files.
- `AGENTS.md`, `AGENT_RULES.md`, `VISION.md`, `WORK_LOG.md`, and an existing `implementation_plan.md` are absent on `main`. No missing instructions are inferred.
- `docs/A2P_READINESS.md`, `docs/RELEASE_PREFLIGHT.md`, and `docs/SUPABASE_TRANSFER.md` contain historical cutover-pending statements that are now stale. Current GitHub/Vercel/Supabase evidence shows the production cutover is complete and the active backend is `jzdzeevjpootbeuniygx`.
- Direct Vercel environment-variable listing is unavailable to the current connector (403). Production nevertheless deploys the exact verified commit, whose fail-closed Vite/intake configuration targets `jzdzeevjpootbeuniygx` and rejects both the retired Lovable backend and AgentFlow. Live rendered/bundle verification will be repeated before release.

## Current compliance findings

Twilio's current Error 30931 guidance requires SMS consent to be voluntary, separable from the primary action, and unchecked by default. The current forms already have two independent optional booleans, default both to false, and allow submission with neither, either, or both selected.

Twilio's current Error 30932 guidance requires a publicly accessible privacy policy that clearly states mobile information / opt-in data is not shared with third parties or affiliates for marketing or promotional purposes. The current shared statement is directionally correct, but the requested wording is more explicit.

The software currently supports the proposed non-sharing statement: carrier processing is limited to a requested quote/underwriting, messaging-provider processing is limited to delivery of permitted texts, and neither path transfers SMS marketing permission. This review cannot verify off-system business practices; if CG Financial actually sells, rents, or shares mobile information or SMS consent for third-party/affiliate marketing, the proposed statement must not be published until that practice is corrected.

Official references reviewed:
- https://www.twilio.com/docs/api/errors/30931
- https://www.twilio.com/docs/api/errors/30932
- https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info

## Surgical implementation

### 1. Explicit mobile-information non-sharing

Change the shared `SMS_NON_SHARING_STATEMENT` to exactly:

> We do not sell, rent, or share mobile numbers, mobile information, SMS opt-in data, or SMS consent with third parties or affiliates for marketing or promotional purposes.

Because the profile Messaging Program, Privacy Policy, and Terms already consume this shared constant, they will stay consistent without duplicating wording.

On the Privacy Policy, retain and tighten the surrounding explanations so the new statement does not conflict with legitimate processing:
- preserve messaging-provider processing only to deliver a text permitted by the stored choice and current opt-out state;
- preserve carrier processing needed for a quote or underwriting requested by the visitor;
- continue to exclude SMS consent from those sharing/processing categories;
- explicitly preserve the distinction between processing information for the visitor's request and transferring permission for a different business to market by SMS.

No broader sharing right will be added.

### 2. Scoped policy links on `/sms-opt-in`

The form's consent links are already correctly scoped. The page-level footer is wrong because `LegalNavLinks` falls back to generic paths when `/sms-opt-in` has no agency/agent route parameters.

Implement a tenant-safe override pattern:
- extend `LegalNavLinks` with optional `privacyHref` and `termsHref` props;
- when omitted, preserve the existing `useLegalPaths()` behavior for generic and agent-scoped pages;
- on `src/pages/SmsOptIn.tsx` only, pass the canonical CG Financial scoped paths using the existing `A2P_AGENT_PATH` constant.

This avoids hardcoding CG Financial inside the shared component and preserves all unrelated profiles/routes.

### 3. Clarify Terms section 4

Revise section 4 so it says, in substance:

> A call request by itself asks us to contact you about scheduling a call. It is not a confirmed appointment, and by itself it does not authorize informational or marketing SMS/MMS, marketing email, or prerecorded or autodialed calls. If you separately select one of the optional SMS checkboxes described in Section 3, that checkbox grants only the corresponding SMS permission stated there.

This preserves the separate checkbox grants and makes clear that a phone number, call request, or acceptance of the Terms does not itself create SMS permission.

### 4. Forward-only legal/disclosure versioning

The Privacy Policy and Terms are materially changing, so their effective dates should move forward to **October 5, 2026**. Do not relabel the changed text as the September 29 version.

Archive the exact current September 29 page source before editing it:
- `docs/legal/privacy-policy-2026-09-29.txt`
- `docs/legal/terms-2026-09-29.txt`

Update the public policy constants to:
- privacy effective date: `2026-10-05`
- terms effective date: `2026-10-05`
- display label: `October 5, 2026`
- immediate prior version label/date: `September 29, 2026`

The April 15 archives remain unchanged.

Create a new disclosure identifier:
- `2026-10-05-policy-clarifications`

The informational checkbox template, marketing checkbox template, and shared SMS disclosure body do **not** change. The new version exists because future consent evidence must snapshot the new policy/terms effective dates rather than continuing to claim the September 29 policies were displayed.

After approval, create the migration with the repository/Supabase CLI migration generator (do not invent a timestamp), conceptually:

`supabase migration new advance_a2p_policy_disclosure`

The generated forward migration will:
1. fail closed unless the expected current row `2026-09-29-separate-sms` exists and still has the expected templates/body/effective dates;
2. fail if `2026-10-05-policy-clarifications` already exists unexpectedly;
3. set only `is_current = false` on `2026-09-29-separate-sms`;
4. insert `2026-10-05-policy-clarifications` with the same two templates and same disclosure body, privacy/terms dates `2026-10-05`, and `is_current = true`;
5. make no schema, RLS, ownership, intake, suppression, or historical-event changes.

The already-applied intake migration will not be edited. Existing/historical consent events remain immutable and retain their original disclosure ID/text/date snapshot.

Frontend `SMS_DISCLOSURE_VERSION_ID` will move to `2026-10-05-policy-clarifications` in the same release.

**Release-order consequence:** the current RPC accepts only the row marked `is_current`. To preserve evidence integrity without adding a broader compatibility mechanism, production activation should apply the exact approved forward migration immediately before the matching production frontend is deployed. During that narrow interval an older open page would fail closed with `disclosure_version` rather than save evidence under the wrong policy version. No consent would be falsely recorded. No production migration will be applied without a separate approval of the exact SQL/action.

### 5. Tests and evidence

Update current-flow fixtures to use the new current disclosure ID while deliberately preserving historical fixtures that are intended to prove old evidence can still be displayed.

Add/adjust tests to prove:
- the shared explicit non-sharing statement appears on the relevant legal/profile surfaces;
- `/sms-opt-in` footer links resolve to the CG Financial scoped privacy/terms pages;
- shared `LegalNavLinks` still preserves route-derived and generic behavior elsewhere;
- Terms section 4 says a call request by itself does not grant SMS while a separately checked box still does;
- informational and marketing controls remain independent, optional, and unchecked;
- neither/either/both combinations still submit correctly in isolated tests;
- current submissions use the new disclosure ID;
- the old disclosure row remains available as historical evidence and only the new row is current;
- STOP/suppression continues to override later grants.

Before editing, capture diagnostics on exact base `0e64478...`; after editing, require no new diagnostics.

Use the repository's verified install method:
`bun@1.3.10 install --frozen-lockfile`

Required verification:
- `npx tsc --noEmit`
- `npx tsc -p tsconfig.app.json --noEmit`
- relevant existing A2P/intake/link tests
- full `npx vitest run`
- applicable local SQL/intake harnesses where the verified local database prerequisite is available
- `VERCEL_ENV=production npm run build`
- changed-file lint / `git diff --check`

Do not submit any production form or create a real lead/message during verification.

### 6. Rendered-route review

Before requesting release approval, verify these five routes against the tested preview/local production build at desktop and mobile widths, without submitting:
1. `/cg-financial/christopher-garness`
2. `/sms-opt-in`
3. `/cg-financial/christopher-garness/privacy-policy`
4. `/cg-financial/christopher-garness/terms-and-conditions`
5. `/cg-financial/christopher-garness/bookcall`

Check public access, Christopher Garness / CG Financial identity, scoped policy links, optional unchecked consent controls, STOP/HELP, frequency/rates, carrier disclosure, support phone/email, and mobile layout.

After a separately approved production deployment, repeat the same five live route checks without submitting.

### 7. Documentation and release record

Correct the stale cutover history and clearly separate:
1. **Website readiness** — what is live/tested on Underwriter Verified.
2. **Registration readiness** — what is prepared for Twilio/TCR, with no claim of guaranteed approval and no submission in this work.
3. **SMS sending readiness** — still separate; this website records consent but does not send SMS, and AgentFlow integration/send-time suppression enforcement remains a separate handoff.

Create `WORK_LOG.md` because it does not currently exist and add the newest entry first.

Prepare a tested PR from the isolated branch. Do not merge or deploy until Chris explicitly approves the tested PR/release summary. No Twilio/TCR registration, fee acceptance, phone-number operation, Messaging Service change, SMS send, AgentFlow change, profile ownership change, or production data mutation is included.

## Intended files

Planning-only file already allowed:
- `implementation_plan.md`

Application/legal:
- `src/lib/a2pBrand.ts`
- `src/components/LegalNavLinks.tsx`
- `src/pages/SmsOptIn.tsx`
- `src/pages/PrivacyPolicy.tsx`
- `src/pages/TermsAndConditions.tsx`
- `src/lib/smsDisclosure.ts`

Legal archives:
- `docs/legal/privacy-policy-2026-09-29.txt` (new)
- `docs/legal/terms-2026-09-29.txt` (new)

Forward migration and current-flow integration assertions:
- `supabase/migrations/<generated>_advance_a2p_policy_disclosure.sql` (new; generated after approval)
- `supabase/tests/intake_assertions.sql`
- `scripts/integration-api-checks.mjs` if the current-flow harness still hardcodes the former version ID

Frontend tests:
- `src/test/a2p-compliance.test.tsx`
- `src/test/public-intake.test.tsx` only if an explicit version/link regression assertion is needed; current behavior tests otherwise remain untouched

Readiness/release records:
- `docs/A2P_READINESS.md`
- `docs/RELEASE_PREFLIGHT.md`
- `docs/SUPABASE_TRANSFER.md`
- `WORK_LOG.md` (new)

Historical fixture files that intentionally represent old evidence (for example inbox fixtures or seeded historical consent events) will not be mechanically changed merely to replace the old disclosure ID.

## Approval gates

**Gate 1 — now:** Chris approves or changes this surgical implementation plan.

Only after Gate 1 will code/test changes be made on this branch. No backend mutation will occur.

**Gate 2 — after implementation/testing:** present the exact PR head, diff/file list, diagnostics, tests, rendered-route results, exact generated migration SQL, and release sequence. Chris must explicitly approve merge/deploy and the exact production database action.

**Gate 3 — after approved deployment:** re-read the exact production commit/deployment and five live pages, then report remaining registration/sending limitations and prepare the AgentFlow handoff. Twilio/TCR submission remains outside this release.
