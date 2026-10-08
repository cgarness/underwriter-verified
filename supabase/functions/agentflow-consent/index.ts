import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  boundedBody,
  failure,
  json,
  phone,
  purpose,
  SmsError,
  UUID,
  verifyRequest,
} from "../_shared/sms/wire.ts";

export async function handle(req: Request) {
  try {
    const raw = await boundedBody(req);
    const nonce = await verifyRequest(
      req,
      raw,
      Deno.env.get("SMS_BRIDGE_SECRET") ?? "",
      "/functions/v1/agentflow-consent",
    );
    const body = JSON.parse(raw);
    if (!UUID.test(body.organization_id) || !UUID.test(body.profile_id)) {
      throw new SmsError("SCOPE", "Invalid mapping.", 400);
    }
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { error: replay } = await db.from("consent_bridge_nonces").insert({
      nonce,
    });
    if (replay) {
      throw new SmsError(
        "BRIDGE_REPLAY",
        "Request could not be accepted.",
        409,
      );
    }
    const args = {
      p_org: body.organization_id,
      p_agent: body.profile_id,
      p_phone: phone(body.phone),
    };
    if (body.action === "eligibility") {
      const { data, error } = await db.rpc("agentflow_consent_check", {
        ...args,
        p_purpose: purpose(body.purpose),
      });
      if (error || !data) {
        throw new SmsError(
          "CONSENT_UNAVAILABLE",
          "Could not verify consent.",
          503,
        );
      }
      return json(data);
    }
    if (
      body.action === "suppress" &&
      ["stop", "provider_block"].includes(body.reason)
    ) {
      const { data, error } = await db.rpc("agentflow_consent_suppress", {
        ...args,
        p_reason: body.reason,
      });
      if (error || !data) {
        throw new SmsError(
          "SUPPRESSION_UNAVAILABLE",
          "Could not record suppression.",
          503,
        );
      }
      return json({ recorded: true });
    }
    throw new SmsError("ACTION", "Invalid action.", 400);
  } catch (error) {
    return failure(error);
  }
}
if (import.meta.main) Deno.serve(handle);
