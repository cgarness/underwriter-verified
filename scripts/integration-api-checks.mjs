// HTTP checks against the local PostgREST harness started by
// scripts/integration-postgrest.sh. Synthetic data only; nothing here can reach
// the hosted project because POSTGREST_URL is the local process.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.POSTGREST_URL;
if (!url || !/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) {
  throw new Error(`POSTGREST_URL must be a local 127.0.0.1 address, got ${url}`);
}
const AGENT_A = "11111111-1111-1111-1111-111111111111";
const PAGE = 25;
const results = [];

const client = (jwt) =>
  createClient(url, jwt, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
const anon = client(process.env.JWT_ANON);
const ownerA = client(process.env.JWT_OWNER_A);
const ownerB = client(process.env.JWT_OWNER_B);
const service = client(process.env.JWT_SERVICE);

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) console.error(`FAIL ${name} ${detail}`);
}
const denied = (error) => !!error && (error.code === "42501" || /permission denied/i.test(error.message ?? ""));

function intakeArgs(overrides) {
  return {
    p_idempotency_key: randomUUID(),
    p_form_source: "quote",
    p_page_path: "/sms-opt-in",
    p_agency_slug: "cg-financial",
    p_agent_slug: "christopher-garness",
    p_first_name: "TEST Synthetic",
    p_last_name: "Visitor",
    p_email: "synthetic-visitor@example.test",
    p_phone: "(909) 555-0199",
    p_state: "California",
    p_informational_consent: false,
    p_marketing_consent: false,
    p_disclosure_version_id: "2026-09-29-separate-sms",
    p_fax_number: "",
    ...overrides,
  };
}

// --- public.agents: reads stay public, writes are owner-only, ownership is locked
{
  const { data, error } = await anon.from("agents").select("id, slug, agency_slug").eq("agency_slug", "cg-financial");
  check("anon can read public profile", !error && data?.length === 1, JSON.stringify(error ?? data));
}
{
  const { error } = await anon.from("agents").update({ bio: "anon-probe" }).eq("id", AGENT_A).select();
  check("anon UPDATE agents denied", denied(error), JSON.stringify(error));
}
{
  const { error } = await anon.from("agents").insert({ slug: "anon-x", agency_slug: "anon-x", name: "Anon X", first_name: "Anon", last_name: "X" }).select();
  check("anon INSERT agents denied", denied(error), JSON.stringify(error));
}
{
  const { error } = await anon.from("agents").delete().eq("id", AGENT_A).select();
  check("anon DELETE agents denied", denied(error), JSON.stringify(error));
}
{
  const { data, error } = await ownerB.from("agents").update({ bio: "owner-b-probe" }).eq("id", AGENT_A).select();
  check("other owner edit affects 0 rows", !error && data?.length === 0, JSON.stringify(error ?? data));
}
{
  const { data, error } = await ownerB.from("agents").update({ user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }).eq("id", AGENT_A).select();
  check("other owner cannot claim profile", !error && data?.length === 0, JSON.stringify(error ?? data));
}
{
  const { error } = await ownerA.from("agents").update({ user_id: "cccccccc-cccc-cccc-cccc-cccccccccccc" }).eq("id", AGENT_A).select();
  check("owner cannot hand off ownership", denied(error) && /agent_ownership_locked/.test(error.message), JSON.stringify(error));
}
{
  const { data, error } = await ownerA.from("agents").update({ bio: "owner-a-edit" }).eq("id", AGENT_A).select("bio");
  check("owner edits own profile", !error && data?.[0]?.bio === "owner-a-edit", JSON.stringify(error ?? data));
}

// --- intake RPC over PostgREST as anon
let neitherId = null;
{
  const { data, error } = await anon.rpc("submit_public_intake", intakeArgs({}));
  neitherId = data?.request_id ?? null;
  check("submit with neither box checked succeeds", !error && !!neitherId, JSON.stringify(error ?? data));
}
{
  const { data: req } = await service.from("intake_requests").select("*").eq("id", neitherId).maybeSingle();
  const { data: events } = await service.from("sms_consent_events").select("*").eq("intake_request_id", neitherId).order("purpose");
  const ageMs = req ? Date.now() - new Date(req.created_at).getTime() : Infinity;
  check(
    "saved request has agent, path, server timestamp",
    req?.agent_id === AGENT_A && req?.page_path === "/sms-opt-in" && req?.form_source === "quote" && ageMs >= 0 && ageMs < 60_000 && req?.phone_e164 === "+19095550199",
    JSON.stringify(req),
  );
  check(
    "two consent events, both not_granted, with disclosure text",
    events?.length === 2 &&
      events.every((e) => e.choice === "not_granted" && e.disclosure_version_id === "2026-09-29-separate-sms" && e.agent_id === AGENT_A) &&
      events.map((e) => e.purpose).join(",") === "informational,marketing" &&
      events[0].displayed_text.startsWith("I agree to receive recurring informational SMS/MMS from Christopher Garness and CG Financial") &&
      events[0].displayed_text.includes("Privacy Policy: https://www.underwriterverified.com/cg-financial/christopher-garness/privacy-policy"),
    JSON.stringify(events?.map((e) => [e.purpose, e.choice, e.displayed_text.slice(0, 60)])),
  );
}
{
  const args = intakeArgs({
    p_form_source: "call_request",
    p_page_path: "/cg-financial/christopher-garness/bookcall",
    p_state: null,
    p_phone: "909-555-0198",
    p_informational_consent: true,
  });
  const { data, error } = await anon.rpc("submit_public_intake", args);
  const { data: events } = await service.from("sms_consent_events").select("purpose, choice").eq("intake_request_id", data?.request_id ?? neitherId).order("purpose");
  check(
    "call request records informational granted, marketing not_granted",
    !error && events?.map((e) => `${e.purpose}:${e.choice}`).join(",") === "informational:granted,marketing:not_granted",
    JSON.stringify(error ?? events),
  );
  const again = await anon.rpc("submit_public_intake", args);
  check("same idempotency key returns duplicate", !again.error && again.data?.duplicate === true && again.data?.request_id === data?.request_id, JSON.stringify(again));
}
{
  const { error } = await anon.rpc("submit_public_intake", intakeArgs({ p_phone: "123" }));
  check("invalid phone rejected with invalid_input", !!error && /invalid_input/.test(error.message), JSON.stringify(error));
}
{
  const { error } = await anon.rpc("submit_public_intake", intakeArgs({ p_agency_slug: "other-agency", p_agent_slug: "other-agent" }));
  check("/sms-opt-in rejects another agency", !!error && /unknown_agent/.test(error.message), JSON.stringify(error));
}
{
  const args = { p_agent_id: AGENT_A, p_message_class: "informational", p_phone: "+19095550199" };
  const { error } = await anon.rpc("evaluate_sms_eligibility", args);
  check("anon cannot call evaluate_sms_eligibility", denied(error), JSON.stringify(error));
  const owner = await ownerA.rpc("evaluate_sms_eligibility", args);
  check("owner login cannot call evaluate_sms_eligibility directly", denied(owner.error), JSON.stringify(owner.error));
  const svc = await service.rpc("evaluate_sms_eligibility", args);
  check("service role eligibility answers no_grant for neither-box request", !svc.error && svc.data?.[0]?.allowed === false && svc.data?.[0]?.reason === "no_grant", JSON.stringify(svc.error ?? svc.data));
}

// --- private records
{
  const { error } = await anon.from("intake_requests").select("id").limit(1);
  check("anon cannot read intake_requests", denied(error), JSON.stringify(error));
}
{
  const { error } = await anon.from("sms_consent_events").select("id").limit(1);
  check("anon cannot read sms_consent_events", denied(error), JSON.stringify(error));
}
{
  const { data, error } = await ownerB.from("intake_requests").select("id");
  check("other owner sees none of agent A requests", !error && data?.length === 0, JSON.stringify(error ?? data));
}
{
  const { error } = await ownerA.from("intake_requests").delete().eq("id", neitherId);
  check("owner cannot delete evidence", !!error, JSON.stringify(error));
}

// --- pagination through real PostgREST with the exact filter the inbox uses
for (let i = 0; i < 53; i++) {
  const n = String(1000 + i);
  const { error } = await anon.rpc(
    "submit_public_intake",
    intakeArgs({ p_page_path: "/cg-financial/christopher-garness", p_phone: `909555${n}`, p_last_name: `Fixture${n}`, p_email: `fixture-${n}@example.test` }),
  );
  if (error) {
    check(`fixture ${n}`, false, JSON.stringify(error));
    break;
  }
}
const { data: all } = await service.from("intake_requests").select("id, created_at").eq("agent_id", AGENT_A).order("created_at", { ascending: false }).order("id", { ascending: false });
const pages = [];
let cursor = null;
for (let guard = 0; guard < 10; guard++) {
  let q = ownerA.from("intake_requests").select("id, created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE);
  if (cursor) {
    const ts = `"${cursor.created_at}"`;
    q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt."${cursor.id}")`);
  }
  const { data, error } = await q;
  if (error) {
    check("pagination page request", false, JSON.stringify(error));
    break;
  }
  pages.push(data);
  if (data.length < PAGE) break;
  cursor = { created_at: data[data.length - 1].created_at, id: data[data.length - 1].id };
}
const walked = pages.flat().map((r) => r.id);
check(
  "keyset pagination walks every row once in order",
  walked.length === all.length && walked.every((id, i) => id === all[i].id) && new Set(walked).size === walked.length,
  `pages=${pages.map((p) => p.length).join(",")} total=${all.length}`,
);
{
  const ts = `"2026-09-30T12:00:00+00:00"`;
  const { data, error } = await ownerA
    .from("intake_requests")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE)
    .or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt."aaaa0001-0000-0000-0000-000000000002")`);
  check(
    "tie-break cursor lands on the lower id with the same timestamp",
    !error && data?.[0]?.id === "aaaa0001-0000-0000-0000-000000000001" && data.length === 1,
    JSON.stringify(error ?? data),
  );
}
{
  const { data, error } = await ownerB.from("intake_requests").select("id").order("created_at", { ascending: false }).limit(PAGE);
  check("other owner pagination returns nothing from agent A", !error && data?.length === 0, JSON.stringify(error ?? data));
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.ok && r.detail && r.name.startsWith("keyset") ? ` (${r.detail})` : ""}`);
console.log(`${results.length - failed.length}/${results.length} API checks passed`);
if (failed.length) process.exit(1);
