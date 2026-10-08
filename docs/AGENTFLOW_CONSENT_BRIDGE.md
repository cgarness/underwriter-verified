# AgentFlow consent bridge release review

Status: October 8 production preparation applied under Chris's instruction to get SMS working. Both functions and the guarded CG Financial mapping are deployed; relay remains disabled pending secret administration and coordinated activation. The release order below remains the safety boundary.

Baseline: website production commit `8a1d81e78d096c521b325b2b8232c204007e881e`, active project `jzdzeevjpootbeuniygx`. Preserve the applied October 5 policy migration and historical September 29 evidence. Retired projects are outside scope.

## Changes

- `20261005194718_agentflow_consent_bridge.sql`: server-only organization/profile mapping, transactional consent outbox, replay nonces, scoped eligibility and suppression functions. No mapping, activation, schema replay, number or provider resource is seeded.
- `agentflow-consent`: HMAC authenticated eligibility/suppression endpoint. Exact body, POST path, nonce and 60-second timestamp window; 16 KiB body cap. Its own service key stays within this project.
- `consent-event-worker`: authenticated bounded outbox delivery to AgentFlow. The transactional trigger asks pg_net to wake it after commit. Failed wake/delivery retains the durable row; recovery runs separately.
- Both Edge functions use `verify_jwt=false` because they verify dedicated server credentials. They must never be deployed without those handlers.

## Coordinated release, separately approved

1. Reconfirm both heads and production functions/preimages. Apply only this new migration to the active project; never replay the earlier policy migration.
2. Provision a high-entropy `SMS_BRIDGE_SECRET` in both projects and `UV_CONSENT_WORKER_TOKEN` only here. Store the identical worker token in Vault as `uv_consent_worker_token`. Do not put values in git or a browser.
3. Deploy the two functions. Configure exactly the confirmed CG Financial agency and profile (`cg-financial/christopher-garness`), with normalized sender name/agency checked by the RPC. Relay stays disabled until coordinated enforcement/activation.
4. Enable pg_net and a monitored one-minute recovery cron that calls `consent-event-worker` with the Vault token. Validate real post-commit wake, authentication, function availability and retry behavior before activation. Worker claims at most five requests; eight failed delivery attempts require operator review. Retain exhausted rows; do not erase evidence.
5. Set the same reviewed activation watermark on both sides. AgentFlow enforcement must be installed on every SMS path first. Enable relay only for new qualifying events. Source evidence older than activation cannot enroll; confirmation recovery is limited to 30 minutes from source evidence. Do not backfill or mass-replay.
6. Provider registration, five-number attachment and live sending remain separate approvals. UV suppression remains effective regardless of worker health; AF also blocks locally before relay succeeds.

## Verification and limits

The paired AgentFlow SQL harness loads all UV migrations and real intake functions, then checks bridge/outbox, purpose-specific enrollment, confirmations, receipts and STOP in two isolated PostgreSQL engines. UV's existing 57 frontend tests and production build pass. Eight paired Edge entry points type-check using a local adapter to the installed Supabase SDK because the direct Deno remote loader is unavailable in this runtime. Native PostgreSQL contention and real pg_net wake are additional gates; no live form or message was submitted.

Recovery: disable relay and pause AgentFlow sends; retain policies, evidence, outbox, nonces and receipts. Never weaken consent enforcement or clear STOP to recover delivery. No website frontend route/legal-copy change is included.
