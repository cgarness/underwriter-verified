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
- Post-change source verification after the regression fix passed both TypeScript checks, 35 targeted tests, all 57 tests, and the production build. A temporary CI workflow is being used only to complete release-order SQL, lint/diff, and desktop/mobile rendered-route gates; it will be removed before the final PR.
- No production form was submitted, no lead/message was generated, and no AgentFlow, Twilio/TCR, phone-number, Messaging Service, production ownership, or production Supabase data change was made.
- Remaining gate: complete final branch verification, prepare the PR/release summary, and obtain Chris's explicit Gate 2 approval before migration/merge/deployment.
