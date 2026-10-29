# Agent client ratings & reviews — prepared release

Status: **development PR only; no production database change, Edge deployment or frontend release**.

Repository: cgarness/underwriter-verified
Baseline: main 356204b22aa5787161cb89a712078450003afa9e
Active production Supabase: jzdzeevjpootbeuniygx
AgentFlow production database jncvvsvckxhqgqvkppmj is explicitly out of scope.

## Product behavior

* Public agent cards show a real average/rating count beneath the existing profile badge. Zero reviews show an invitation, not a fabricated rating.
* Client selects 1–5 stars and optionally enters up to 1,000 characters. No login is required. All ratings are treated equally. No positive-only gating or review incentives.
* A submitted rating appears in the public review section when the server acknowledges it. An anonymous review may be displayed without a comment.
* Original agent-provided testimonials are unchanged and are never included in the client review average.
* Only published agents and published reviews are visible to the public; owners of website-managed pages can inspect all of their own reviews read-only. Managed AgentFlow agents can see public feedback on their linked card; a private AgentFlow-native review inbox is a separate integration.
* Agents may neither edit nor delete genuine ratings; platform moderation can set a review to hidden through restricted database administration.

## Security / privacy

* Explicit column grants and RLS; no anonymous insert/update/delete access to reviews, no public access to request identifiers or hashed rate limits.
* Anonymous submissions go through the Edge Function using a server-only service-role key. A service-only RPC atomically verifies the profile, enforces 1 per visitor network fingerprint per profile per 24 hours, and 50 per agent per rolling 24 hours, with request idempotency. The Edge handler HMAC-hashes the network identifier; no raw IP is stored in the database.
* Origin allowlist and honeypot reduce unsophisticated abuse but **do not constitute reliable identity verification**. Network-address restrictions can block two legitimate reviewers sharing a network and can be evaded with proxies. Operational abuse monitoring and moderation are still required.
* Review texts are rendered as plain text and request no personal health/insurance details. Do not imply reviews are verified purchases.
* No edits to SMS consent, policy URLs, protected CG Financial identity, AgentFlow sync, A2P migrations, or existing agent profiles.

## Ordered release gate (not yet authorized)

1. Review the exact PR and database migration: supabase/migrations/20261029061000_agent_client_reviews.sql.
2. Run CI and isolated SQL testing, check API/RLS grants, one-star and five-star submissions, rate limits, publishing, unpublished profiles, owner isolation, and idempotency. Confirm no public REST write path.
3. With separate explicit production DB approval, apply ONLY this migration to jzdzeevjpootbeuniygx and verify fresh metadata. Do not apply to the AgentFlow Supabase project.
4. With separate explicit Edge approval, deploy ONLY submit-agent-review with JWT verification disabled and verify that service keys are never sent to the browser.
5. With separate explicit frontend release approval, merge the exact reviewed PR and verify Vercel production, public profile mobile/desktop, A2P route regression, and a controlled test review. Remove or hide any synthetic test review through separately approved moderation.
6. Monitor submission errors, spam complaints and owner access; do not activate unrestricted public review traffic until abuse monitoring is ready.

**No production actions are authorized simply by publishing this PR.**
