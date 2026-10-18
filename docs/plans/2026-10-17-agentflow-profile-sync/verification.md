## 2026-10-18 continuation: validator and release-document corrections (NOT live)

GitHub heads and mains match the handoff. Direct git and terminal access work. The canonical Vercel team is team_iPboOWpwdIQRwdxmA5GJp5Rq. AF project prj_vUIiwhdXPw4H9uxRZ1zTf28KIXbc serves www.fflagent.com from production dpl_8PzuVCmhxzo7bszbMYvgC7p4S7uk at e2ddef261e0288a058f8bf1eaa6f9c1ace8d7881. UV project prj_8B75x0g4FBYsP2uzSIEeCYHhMJSw serves www.underwriterverified.com from production dpl_5YuTWhQn1Y2aAh9LoWFWa4MYgDX2 at 2501713d368aa1ad0cea6acc1792fb51f3cb1c8c. Preview success is not production release.

Fresh exact-project UV get_project and list_migrations calls both returned permission denial. AF read-only inspection found no sync tables/migration/worker; latest hosted migration is 20261017043757. UV schema, advisors and receiver preimage remain unverified. No production action performed.

Public browser navigation succeeded for https://www.underwriterverified.com/cg-financial/christopher-garness; no form or message submitted. This workspace's browser cannot reach its separate terminal localhost (ERR_CONNECTION_REFUSED), not the old workspace's administrator-denial error. Desktop/mobile synthetic feature acceptance and hosted end-to-end acceptance remain unverified.

Both payload validators now use explicit C0/DEL character-code checks, preserving Unicode and length limits, with exhaustive negative tests. This also rejects a terminal newline on a license string that JavaScript's dollar-anchor previously let through; accepted payloads are not broadened. No lint suppression or protocol/authentication change; protocol.ts stays unchanged and paired bytes remain identical. CI lint now covers changed Edge/shared TypeScript as well as frontend code. UV release names now match executable code: VITE_UV_PROFILE_ENABLED, UV_PROFILE_SYNC_ENABLED, UV_PROFILE_WORKER_SECRET (distinct from UV_PROFILE_SYNC_SECRET); RECEIVER_URL is a code constant, not a runtime environment variable.

Reports run 39086300919 is FAILED, not pending: final assertion follows eslint exit 1 and build exit 0. New exact-candidate workflow results must supersede it. Local root/project TypeScript, focused frontend tests, changed-TypeScript lint and builds passed; AF's 84 inherited app diagnostics must remain exact-base matched. Final paired/native/Deno and broader regression runs remain gates.

New provisioning remains blocked: generated rows have user_id null and owner-only inbox access. No UV-owner SSO or consumer import is implemented. Keep allow_provisioning=false pending separately approved owner-access/intake/legal acceptance. No profile mapping, credentials, activation, cron, migration, frontend merge or production deployment; retain all mapping/version/withdrawal/consent records during any future rollback.

# Isolated build verification

Synthetic data only; no hosted project modifications, credentials, leads or messages.

- Paired SQL + real handler harness: 18 checks pass in two independent PGlite 0.5.8 databases. It runs actual new migration files and complete worker/receiver handler modules, with minimum synthetic baseline schemas. Tests cover opt-in defaults, grants/tenant/owner checks, unsigned requests, publication, change propagation, expiry filtering, stable URLs, retries/outage, version ordering, invalid-photo privacy tombstones, unpublishing races, private reads, protected linked edits, global slug collisions, preserved consent evidence and deactivation/deletion. This is not proof of identical UV live schema.
- Native PostgreSQL concurrency check is implemented in the same harness when UV_PROFILE_NATIVE_DB_URL points to an isolated localhost server. It must pass in CI before backend release.
- UV: 83 tests pass (11 files), including existing intake/A2P regression tests and new protocol/public-identity/metadata checks. Root, app and node TypeScript checks pass. Build passes. Changed-file ESLint has zero errors and the pre-existing mixed-export Fast Refresh warning in AgentDataContext.
- AF: 21 initial protocol/control tests plus 80 hook/profile regression tests pass (101 total across non-overlapping selections). Root `npx tsc --noEmit` and build pass. App typecheck produces the identical 84 diagnostics on an exact-source baseline and candidate; no added diagnostic. Changed frontend lint passes. Additional tests/CI results must be recorded at final candidate head.
- Browser: local Chromium launch succeeded, but localhost navigation was blocked by an administrator policy. No visual or authenticated production browser pass is claimed.
- UI integration is default-off in AF. No new mock data is added to production integration paths; test data lives only in fixtures/tests.
- Supabase CLI produced migration filenames. Both new functions use dedicated server authentication; hosted function readback, native Edge runtime checks, advisor comparison and real server connectivity remain production release gates.

## Reproduction
AF: `npx tsc --noEmit`; `npx vitest run src/test/uvProfile*.test.* src/components/agent-profile src/components/settings/profile/__tests__/myProfileSurface.test.tsx src/lib/__tests__/profileSetupWizardRemoval.test.ts`; `UV_PROFILE_PEER=/path/to/uv node scripts/tests/uv-profile/paired.mjs`. Test-only PGlite is pinned in CI rather than added to application dependencies.
UV: `npm ci`; use an inert local Supabase URL and synthetic publishable key for tests/build; `npx vitest run`; both TypeScript project checks. Never point synthetic tests at production.

## Inherited lock repair
The baseline package.json declared packages absent from package-lock.json, so npm ci failed before tests. The lock was reconciled without changing package.json: 131 missing package entries, no removed entry; existing version changes only debug 4.3.7→4.4.3, @jridgewell/sourcemap-codec 1.5.0→1.6.0, hasown 2.0.2→2.0.4, and tslib 2.8.0→2.8.1. Candidate tests/build used this exact resolved install. This is an install-reproducibility correction, not a new application feature or production dependency deployment.
