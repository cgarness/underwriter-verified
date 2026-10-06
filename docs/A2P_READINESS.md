# A2P 10DLC readiness draft — Christopher Garness / CG Financial

Review only. Nothing in this change was submitted to Twilio. This is not an approval, and it does not choose a Brand tier.

Production site: https://www.underwriterverified.com

Production currently serves `cgarness/underwriter-verified` commit `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015` and uses the active **Underwriter Verified** Supabase project `jzdzeevjpootbeuniygx` in organization `bmuykmwtwicpltmpenqm`. The former Lovable backend `rtgmdbqzkwlmplurypyh` is retired and is not the active production backend. AgentFlow database `jncvvsvckxhqgqvkppmj` is separate and excluded from this website release. This repository records consent evidence but does not send SMS. The October 5 policy/link refinement is a release candidate only until Chris separately approves the exact production migration, merge, and deployment.

## Campaign description

CG Financial, operated by Christopher Garness, an independent life insurance agent, offers two optional website checkboxes. The informational checkbox covers recurring SMS/MMS about a quote the person requested, appointments, and application or policy updates. The marketing checkbox is a separate choice covering recurring SMS/MMS about life insurance products and coverage reviews. A quote or call request can be submitted with either or both boxes left unchecked. Providing a phone number, requesting a call, or accepting the privacy policy or terms does not grant text permission. This website records the choices. It does not itself send text messages. Message frequency varies. Message and data rates may apply. Reply STOP to opt out. Reply HELP for help.

Suggested use case if Chris later registers one campaign for both kinds of messages: Mixed, with sub-use cases Customer Care and Marketing. Do not submit that choice until the business identity and Twilio account below are confirmed. Do not use the Sole Proprietor Brand route just because Chris works independently. Sole Proprietor vs Standard depends on the EIN and the current Brand rules, which are not verified here.

## Message flow and opt-in routes

Only website forms are implemented. There is no keyword, paper, verbal, QR, or Facebook opt-in in this repository. Do not tell Twilio that Facebook instant-form consent is covered. Chris must confirm whether any non-website source exists. Until then those sources are pending and are not part of this flow.

Each implemented route shows two unchecked boxes, the frequency and rate disclosures, STOP and HELP, the statement that SMS consent is not required to request a quote, request a call, or purchase insurance, the carrier delivery disclaimer, and links to that agent’s privacy policy and terms.

1. Dedicated quote page for this brand only: https://www.underwriterverified.com/sms-opt-in
   The server accepts this path only for agency slug `cg-financial` and agent slug `christopher-garness`. Another agency’s identity is rejected. The visitor completes the quote form and may check one box, both, or neither.

2. Quote section on the agent profile: https://www.underwriterverified.com/cg-financial/christopher-garness
   Same two boxes. The names on the boxes come from the agent row for that profile, resolved again on the server from the page path.

3. Call request: https://www.underwriterverified.com/cg-financial/christopher-garness/bookcall and the `/book` alias.
   Same two boxes. Submitting a call request does not grant SMS permission unless a box is checked, and the confirmation says the call is not yet scheduled.

Not opt-in methods: the “Get in touch” section on the profile (it now only links to the quote form and the call request form and does not collect anything), the calendar link, and a `sms:` link that only opens the visitor’s own texting app. Following a link never records SMS consent; only the two checkboxes on the quote and call forms do.

Privacy policy: https://www.underwriterverified.com/cg-financial/christopher-garness/privacy-policy
Terms: https://www.underwriterverified.com/cg-financial/christopher-garness/terms-and-conditions
Current production policy text is effective September 29, 2026. This release candidate advances the Privacy Policy and Terms to October 5, 2026 and archives the exact September 29 page sources in `docs/legal/`; the April 15, 2026 archives remain unchanged.

## Exact consent language

Informational:

> I agree to receive recurring informational SMS/MMS from Christopher Garness and CG Financial about my requested quote, appointments, and application or policy updates.

Marketing:

> I agree to receive recurring marketing SMS/MMS from Christopher Garness and CG Financial about life insurance products and coverage reviews.

Shared disclosure:

> Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. SMS consent is not required to request a quote, request a call, or purchase insurance. Carriers are not liable for any delayed or undelivered messages.

Disclosure version stored with each choice: `2026-09-29-separate-sms`.

A saved submission writes two consent events, one per purpose, with `granted` or `not_granted`. `not_granted` means this submission added no new grant. It does not erase an earlier grant. The server copies the disclosure text, sender name, policy URLs, and policy effective date from its own records. Client-supplied consent text and timestamps are not accepted.

## Sample messages

Embedded link: yes. Embedded phone number: yes. The samples below are the intended content if a sender is connected later. This website does not send them.

1. Requested-quote response (informational):
   CG Financial: [FirstName], we received your life insurance quote request. Christopher Garness will follow up about that request. Call 909-775-6963 or visit https://www.underwriterverified.com/cg-financial/christopher-garness/bookcall. Reply STOP to opt out. Msg & data rates may apply.

2. Appointment reminder (informational):
   CG Financial: Reminder, your appointment with Christopher Garness is [Date] at [Time]. Details: https://www.underwriterverified.com/cg-financial/christopher-garness. Reply STOP to opt out. Reply HELP for help.

3. Application or policy update (informational):
   CG Financial: [FirstName], there is an update on your life insurance application. Call 909-775-6963 with questions. Reply STOP to opt out. Msg & data rates may apply.

4. Marketing:
   CG Financial: [FirstName], Christopher Garness can review life insurance coverage options with you. Visit https://www.underwriterverified.com/cg-financial/christopher-garness or call 909-775-6963. Reply STOP to opt out. Reply HELP for help.

The appointment sample is the wording for a reminder after a time has actually been scheduled. The website does not book that time by itself, and the call form does not say an appointment is confirmed.

## STOP and HELP

Shown on the forms, footer, privacy policy, and terms: reply STOP to opt out and HELP for help. Support contact on the policy is 909-775-6963 and chris@fflagent.com.

What is implemented in this repository:

- `public.record_sms_suppression` can store a STOP or provider block for one agent and phone. It is not granted to the public site key. A repeated call does not delete the row.
- `public.evaluate_sms_eligibility` returns `suppressed` when that row exists, even if a later form records a grant. It returns `granted` only when that purpose has a grant and no suppression. Informational and marketing are checked separately.
- An unchecked box on a later visit does not delete a prior grant and does not delete a STOP.
- There is no re-enrollment tool. Clearing a STOP would require a new, explicit process. Deleting the suppression row is blocked by a database trigger.

What is not verified and must not be described as done:

- No Twilio webhook is implemented here, and Twilio Advanced Opt-Out / default STOP replies were not inspected. No Twilio configuration was changed.
- HELP has no application auto-reply. If Twilio’s default replies are turned on later, this application should not also send STOP or HELP replies.
- There is no outbound sender and no message queue in this repository, so queued-send rechecking cannot be demonstrated against a live queue. Any future sender, including AgentFlow, has to call `evaluate_sms_eligibility` at send time.

## Where a request can be retrieved

A signed-in agent opens `/agent-admin`. The “Quote and call requests” section reads `intake_requests` and `sms_consent_events` for the agent row whose `user_id` matches that login. Visitors cannot read those tables. One agent cannot read another agent’s rows.

The inbox loads 25 requests at a time, newest first (ties broken by id), with “Load older requests”, Refresh, and a retry button on error. The consent choices shown on each row are the choices recorded at submission time. They are historical evidence, not proof that a text may be sent today; a later STOP, a later submission, or a provider block can override an earlier choice, and only `evaluate_sms_eligibility` answers the send-time question.

AgentFlow delivery is not connected. A saved row in this site’s database is not a lead inside AgentFlow.

## Agent profile ownership (corrected before intake can go live)

Inherited problem: migration `20260416003500_allow_anon_admin_writes.sql` created policies named “Anyone can insert agents (anon)” and “Anyone can update agents (anon)”. Migration `20260506175748` later dropped the un-suffixed names (“Anyone can insert agents” / “Anyone can update agents”) and added owner-only policies, so the anon policies stayed in effect. Because RLS policies are permissive, the anon site key could still create agent profiles and change any profile’s `user_id`, which would let an anonymous visitor take over the profile that the intake tables key on.

Fix: forward migration `20260929203000_lock_agent_ownership.sql`. It does not edit the historical migration. It:

- drops the two anon write policies (and the legacy names, if any still exist);
- revokes INSERT/UPDATE/DELETE on `public.agents` from `anon` and grants only SELECT, so public profile pages keep working;
- keeps owner-only INSERT/UPDATE/DELETE policies for `authenticated` (`auth.uid() = user_id`);
- adds a trigger, `agents_protect_ownership`, that rejects any change to `user_id` made by `anon` or `authenticated`. Reassigning ownership is only possible with the service role, on purpose, by an administrator.

Signup provisioning (`handle_new_agent_user` on `auth.users`) is unchanged and still creates a profile owned by the new login.

What this migration does not do: it does not touch the existing production agent row or its `user_id`. Whether that row belongs to the login Chris actually uses at `/agent-admin` has to be confirmed by Chris after deploy. It must not be reassigned to a guessed account.

Hosted recheck on October 3, 2026 through the newly connected Lovable account confirms the canonical profile still has **`user_id = NULL`**, with **zero auth users**, one application table (`agents`), and no storage objects. Current source RLS has only public read and owner write policies; the historical anonymous policies described above are absent from the actual source. Broad source table grants remain; destination hardening has now been applied and verified. Source catalog and the full original profile were captured read-only. The consent schema is hosted in the new destination, with zero intake/consent records; the source remains unchanged. Follow `docs/SUPABASE_TRANSFER.md` for the new destination; preserve profile data and avoid automatic deletion when assigning ownership.

Destination ownership update, 2026-10-04 00:14:04 UTC: Chris confirmed `chris@fflagent.com` and created the confirmed account. Following specific approval, a guarded transaction unlinked the blank signup starter without deleting it and attached the original Christopher Garness / CG Financial profile to that account. Independent readback verified both profiles and all content preserved, RLS enabled, anonymous UPDATE denied, and zero intake/consent/suppression/AI-usage rows. Only ownership and automatic update timestamps changed; the Lovable source remained untouched. Real owner sign-in, original profile loading, and empty inbox refresh passed before cutover. Production cutover subsequently completed at `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015`; the active production backend is now `jzdzeevjpootbeuniygx`. See SUPABASE_TRANSFER.md for exact IDs and hashes.

## Three different kinds of “ready”

1. **Website readiness** — the Supabase cutover is complete in production at `0e64478c0e15ba3630a76228b8ffb3a4f3f3e015`, using `jzdzeevjpootbeuniygx`. The live forms already preserve two independent optional unchecked SMS choices, append-only evidence, and STOP suppression. The October 5 refinement release candidate strengthens the mobile-information non-sharing statement, fixes the dedicated `/sms-opt-in` footer links, clarifies Terms section 4, and advances the legal/disclosure version forward-only. It is not live until the exact migration and release are separately approved.
2. **Twilio/TCR registration readiness** — the website/message-flow evidence is prepared for review, but final registration still depends on exact legal business identity/EIN data, the actual Twilio account/Brand route, expected volume, and confirmation of every real opt-in source. Nothing in this repository work submits a Brand or Campaign or guarantees approval.
3. **SMS sending readiness** — separate and not complete here. This website has no outbound sender or message queue. AgentFlow is a separate system and must enforce purpose-specific consent plus suppression at send time before it sends on behalf of this profile.

## Still needed from Chris

- Exact IRS legal business name and EIN. Not guessed.
- Legal business structure. Not guessed, and not assumed to be Sole Proprietor.
- Confirmation that the filing contact is Christopher Garness, chris@fflagent.com, 909-775-6963, 6768 Regal Park Dr, Fontana, CA 92336. These are the public website details only.
- Approximate daily SMS volume.
- Which Twilio account or subaccount, existing Brand, Messaging Service, and sending numbers to use.
- Whether any opt-in source besides the three website routes exists, including Facebook.

## Registration route

Not selected. The website database cutover is already complete. Confirm the exact EIN/legal business identity and actual Twilio account ownership, then choose the appropriate Brand/registration path from Twilio’s current rules. Do not submit a Brand, Campaign, Trust Hub profile, or phone number as part of this website release.


## Registration fields and route — pending confirmation

These are proposed values for review, not a completed registration. No Twilio connector was found in the available plugin search, so existing Brand/Campaign/Messaging Service/number resources have not been inspected. Do not create replacements before that inspection.

| Field | Proposed value / missing confirmation |
|---|---|
| Customer registration route | Direct Customer if CG Financial uses its own Twilio account; ISV customer flow if AgentFlow registers the agency under its platform. Confirm actual account ownership first |
| Brand display name | CG Financial — confirm authorized business/DBA use |
| Legal business name / tax ID / structure | Missing; must match EIN records exactly. An EIN document helps compare entered information but does not itself establish government verification |
| Industry | Insurance — confirm the provider's available classification |
| Website | https://www.underwriterverified.com/cg-financial/christopher-garness |
| Business identity | Direct customer or ISV customer, pending account confirmation |
| Business address / country | 6768 Regal Park Dr, Fontana, CA 92336, US is the supplied public address; filing address not confirmed |
| Authorized representative | Christopher Garness; title/position and authority to represent the business must be confirmed |
| Contact email / phone | chris@fflagent.com / +1 909-775-6963 are public contact values, not yet confirmed filing contacts |
| Tax-ID jurisdiction / business regions | US proposed; confirm registration country and actual operations |
| Brand tier | With a US EIN, evaluate Low Volume Standard vs Standard using actual volume/throughput. Do not use the no-tax-ID Sole Proprietor route merely because Chris is an independent agent |
| Message volume | Missing; collect daily SMS segments/MMS and expected peak sending rate, not just contact count |
| Campaign use case | Low Volume Mixed or Mixed with Customer Care and Marketing, depending on approved tier and actual use |
| Campaign description / samples / message flow | Draft sections above; revise to actual sender behavior and only opt-in methods that have been verified live |
| Privacy / terms | The two scoped production URLs above; verify live before submission |
| Embedded links / phone numbers | Yes / yes, as shown in sample messages |
| Opt-in keywords / confirmation reply | No keyword enrollment implemented; leave keyword fields blank unless the sender actually supports a separately reviewed flow |
| STOP / HELP | Provider settings, replies, and application handling still require inspection and verification; do not mark as complete from website copy |
| Facebook or other lead sources | Not covered by the website evidence. Confirm each actual source and its separate consent language/evidence before listing it |
| Twilio account, Brand, Campaign, Messaging Service, numbers | Missing; inspect existing resources and reuse the correct ones where appropriate |

Current official guidance reviewed October 5, 2026:

- [Opt-in must allow consumers to decline, error 30931](https://www.twilio.com/docs/api/errors/30931)
- [Privacy policy mobile-information non-sharing, error 30932](https://www.twilio.com/docs/api/errors/30932)
- [Required business and campaign information](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info)
- [Direct Standard / Low-Volume Standard onboarding](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/direct-standard-onboarding)
- [ISV customer onboarding](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv-api)
- [Separate marketing and informational consent, error 30913](https://www.twilio.com/docs/api/errors/30913)
- [Twilio fee schedule](https://help.twilio.com/articles/1260803965530-What-pricing-and-fees-are-associated-with-the-A2P-10DLC-service)

Fee review remains provisional: Twilio's indexed Help Center schedule quotes **$4.50** for Low Volume Standard Brand registration or **$46** for Standard Brand registration. Campaign vetting is separately listed at **$15**; monthly campaign, phone-number, message, and carrier fees are additional. Some Twilio marketing pages still show older $4/$44 figures. Re-read the live account's exact tier, campaign recurring fee, and resubmission terms before presenting the final total for Chris's explicit approval. No fee is authorized by this draft.

## Future AgentFlow integration boundary

This site retains agent/profile-scoped evidence with immutable sender identity, purpose, path, disclosure version/text, and timestamps. The planned AgentFlow wizard is agency-level. Before connecting them, define and verify the agency-to-profile/Brand mapping and suppression scope; do not assume a grant for one sender/profile covers every agent at that agency. This release does not change AgentFlow, its dialer, its database, or provider sending configuration.

## AgentFlow consent bridge — isolated implementation (October 5, 2026)

The additive bridge implementation is prepared on `codex/agentflow-consent-bridge-20261005`. It is **not deployed or activated**. Website production remains the October 5 policy release. See `docs/AGENTFLOW_CONSENT_BRIDGE.md` for its exact activation boundary, secrets, worker, and rollback constraints. The website still does not send SMS.
