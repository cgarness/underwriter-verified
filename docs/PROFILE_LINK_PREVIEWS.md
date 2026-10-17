# Agent profile SMS link-preview implementation (visual only)

Date: 2026-10-17
Scope: Underwriter Verified website, `cgarness/underwriter-verified`.

## Purpose
When an agent profile link is sent over SMS/iMessage or shared via messaging/social apps, show that specific agent's name, agency, photo, and the requested green-check `✅ Agent Verified` visual copy instead of the generic Underwriter Verified title/image.

## Implementation
- `vercel.json` matches only two-segment profile URLs. Reserved `/agent-admin/*`, `/api/*`, asset URLs, and all other 1/3+ segment website routes remain on their existing paths.
- `api/profile-page.ts` serves the unchanged compiled Vite SPA shell with server-generated per-agent Open Graph/Twitter metadata and a canonical URL. Bots need no JavaScript. If a read fails, the original SPA shell is returned.
- `api/agent-photo.ts` serves a public PNG/JPEG/WebP profile headshot from the existing public-read `agents.headshot_url` data URI or redirects for HTTPS-hosted public photos; generic preview artwork is the fallback.
- `server/agentPreview.ts` reads **only** public agent fields with the site's pre-existing publishable Supabase key, with strict slug validation and HTML escaping. Never use a service-role key here.
- Cache lifetime is five minutes, but iMessage and other apps may cache independently. Preview layouts and whether title/description are visible are client-controlled.

## Visual text
Title: `[Agent Name] | ✅ Agent Verified`
Description: `✅ Agent Verified · [Agency Name] · Underwriter Verified`
Image: agent's saved profile headshot (public image binary).
The checkmark is in metadata text, not a status-checked verification API or a separate drawn badge over the photo. Actual identity/credential validation and gated badges are a future feature.

## Non-goals
No database migration, agent identity changes, new verification status, SMS sending, opt-in/STOP/HELP, AgentFlow, A2P registration, or consent bridge modifications.

## Release checks
- Verify the pull-request preview's HTML source includes exactly one agent-specific `og:title`, `og:description`, and publicly fetchable `og:image` URL.
- Verify returned image content type is `image/png` (or another supported format) and real image bytes, not a `data:` URL.
- Verify the ordinary agent profile, admin signup/login, quote, bookcall, legal pages, and root pages load their original React behavior.
- Test the actual production profile link in iMessage after production deployment. Apple may show an older cached preview temporarily.
- No production deployment without confirming a healthy tested candidate and addressing any Vercel platform routing errors.

## Note
The visual `Agent Verified` label is not evidence of licensing, identity verification, or third-party endorsement. Real verification logic must be implemented before advertising it as a verified credential claim.
