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
