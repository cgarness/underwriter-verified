import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  equal,
  failure,
  json,
  signedHeaders,
  SmsError,
} from "../_shared/sms/wire.ts";
const target =
  "https://jncvvsvckxhqgqvkppmj.supabase.co/functions/v1/sms-consent-events";

export async function handle(req: Request) {
  try {
    const token = Deno.env.get("UV_CONSENT_WORKER_TOKEN") ?? "";
    if (
      req.method !== "POST" || token.length < 32 ||
      !equal(req.headers.get("Authorization") ?? "", `Bearer ${token}`)
    ) throw new SmsError("WORKER_AUTH", "Unauthorized.", 403);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: rows, error } = await db.rpc("claim_consent_bridge_events");
    if (error) throw new SmsError("OUTBOX", "Worker unavailable.", 503);
    for (const row of rows ?? []) {
      const { lease_id, ...event } = row;
      let ok = false;
      try {
        const body = JSON.stringify(event);
        const res = await fetch(target, {
          method: "POST",
          body,
          headers: await signedHeaders(
            Deno.env.get("SMS_BRIDGE_SECRET") ?? "",
            new URL(target).pathname,
            body,
          ),
          signal: AbortSignal.timeout(8000),
        });
        ok = res.ok && (await res.json()).received === true;
      } catch { /* Retain for bounded recovery; never log consent payloads. */ }
      const { error: finishError } = await db.from("consent_bridge_outbox")
        .update({
          delivered_at: ok ? new Date().toISOString() : null,
          lease_until: null,
          lease_id: null,
          retry_at: new Date(Date.now() + 60000).toISOString(),
          last_error: ok ? null : "delivery_failed",
        }).eq("request_id", row.request_id).eq("lease_id", lease_id);
      if (finishError) {
        throw new SmsError("OUTBOX", "Worker checkpoint failed.", 503);
      }
    }
    return json({ processed: rows?.length ?? 0 });
  } catch (error) {
    return failure(error);
  }
}
if (import.meta.main) Deno.serve(handle);
