# AgentFlow profile synchronization — UV receiver

2026-10-17. Chris approved the isolated two-repository code build. Production migration/RLS application, existing-profile ownership/link mapping, credentials, merge/deploy and activation remain separately controlled and are NOT authorized by this build.
Base: 2501713d368aa1ad0cea6acc1792fb51f3cb1c8c. Paired AF base: e2ddef261e0288a058f8bf1eaa6f9c1ace8d7881. Branch: codex/uv-profile-sync-20261017.

## Review
Reviewed WORK_LOG.md, PROFILE_LINK_PREVIEWS.md, AGENTFLOW_CONSENT_BRIDGE.md, SUPABASE_TRANSFER.md and current profile/admin/schema/metadata code. AGENT_RULES.md, VISION.md and AGENTS.md are absent, not invented. UV live management access is currently denied; live schema, policies and Edge preimages must be confirmed before release. Preserve recent agent-specific previews. Active backend is jzdzeevjpootbeuniygx; retired Lovable backend is outside scope.

## Design approved for isolated implementation
AgentFlow supplies explicitly approved public fields, not credentials, internal users, leads, call history or commissions. A dedicated HMAC-authenticated endpoint receives versioned updates. Each project keeps its own service key; use a distinct profile-sync secret, never SMS bridge credentials. Map AF organization/profile UUIDs in private storage to immutable UV agent UUIDs. Never claim by matching names/emails. Existing-profile linking requires a separately approved identity-checked operation; new profiles can be provisioned without separate UV signup after AF publication opt-in.

Preserve existing UV ownership, canonical URLs, content and consent evidence. An existing consent-linked name/agency/slug must not change automatically. Return a bounded identity-review status rather than bypassing SMS identity checks. Keep biography/booking/testimonials UV-owned for this initial release and do not synthesize content. Keep linked fields immutable to ordinary UV admin writes, with database enforcement as well as UI.

Add explicit publication state with existing rows preserving current visibility and new profiles unpublished until opt-in. Public page/search/metadata reads must exclude unpublished records even for authenticated owners. Private AF identity mappings are never exposed by the public agents table. Fix the public page's context handoff so it cannot render another visitor's cached/default identity before an effect runs. Support idempotency, stale-version rejection, duplicate-body mismatch refusal, replay prevention, bounded image/payload validation and tombstone/unpublish updates. Real licensing/identity verification stays out of scope.

## Intended files before editing
- This implementation_plan.md, verification.md, release.md and newest-first WORK_LOG.md entry.
- Generated supabase/migrations/*_agentflow_profile_sync.sql (not applied).
- supabase/functions/agentflow-profile-sync/*, dedicated shared protocol helper and only corresponding config.toml entry.
- src/hooks/useAgentProfile.ts, src/pages/Search.tsx, server/agentPreview.ts (published-only reads).
- src/contexts/AgentDataContext.tsx, src/pages/Index.tsx (scoped loaded data provider, no generic profile flash).
- src/pages/Admin.tsx plus a focused linked-profile editor helper (lock managed identity/profile fields, preserve editable UV-only content).
- Focused public/private scope, admin, protocol and SQL tests.
- .github/workflows/uv-profile-sync.yml, test-only and no production secrets or deploy.
Additional files require a documented plan amendment before editing. Keep changes surgical; use Zod, Tailwind and possible-zero .maybeSingle().

## Verification/release
Isolated synthetic SQL and endpoint tests: tenant/identity mismatch, unauthorized callers, replay/stale/duplicate deliveries, stable slug collisions, unpublished visibility, unchanged ownership and consent links, linked-field protection, unchanged legal/forms/booking behavior. Typecheck both TS configs, tests/lint/build, desktop/mobile public profile and AgentFlow controls. Migration filenames come from Supabase CLI. Test workflow may retrieve source and dependencies to the authenticated working session; never export secrets, .env or repository credentials.

No production action or generated lead/SMS. Full receiver content and live verify_jwt must be read before any later deploy. New handler must explicitly validate dedicated auth before privileged work. Supabase advisors after approved production DDL. Separate gates: exact UV backend/RLS/mapping, exact AF backend/credentials, frontend, pilot activation. Record actual evidence and blockers; no premature live-success claim.
