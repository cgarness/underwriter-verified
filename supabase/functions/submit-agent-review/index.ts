import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedOrigin = (origin: string) =>
  /^https:\/\/(www\.)?underwriterverified\.com$/.test(origin) ||
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

function response(body: Record<string, unknown>, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "vary": "Origin",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    },
  });
}

async function hashFingerprint(agentId: string, ip: string, secret: string): Promise<string> {
  const bytes = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", bytes.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, bytes.encode(agentId + ":" + ip));
  return Array.from(new Uint8Array(signed), (part) => part.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const corsOrigin = allowedOrigin(origin) ? origin : "https://www.underwriterverified.com";
  if (request.method === "OPTIONS") return response({}, allowedOrigin(origin) ? 200 : 403, corsOrigin);
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405, corsOrigin);
  if (!allowedOrigin(origin)) return response({ error: "origin_unavailable" }, 403, corsOrigin);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "not_configured" }, 503, corsOrigin);

  const ip = (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    ""
  ).trim();
  if (ip.length < 3 || ip.length > 128) return response({ error: "temporarily_unavailable" }, 503, corsOrigin);

  let payload: Record<string, unknown>;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 5000) throw Error("too_large");
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("invalid");
    payload = parsed as Record<string, unknown>;
  } catch {
    return response({ error: "review_invalid" }, 400, corsOrigin);
  }

  const { agentId, rating, comment, website, requestId } = payload;
  if (typeof agentId !== "string" || !uuidPattern.test(agentId) ||
      typeof requestId !== "string" || !uuidPattern.test(requestId) ||
      !Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5 ||
      typeof comment !== "string" || comment.length > 1000 ||
      typeof website !== "string" || website.length > 100) {
    return response({ error: "review_invalid" }, 400, corsOrigin);
  }
  // Low-friction bot trap; do not display or retain the submitted value.
  if (website) return response({ error: "review_invalid" }, 400, corsOrigin);

  const fingerprint = await hashFingerprint(agentId, ip, serviceKey);
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.rpc("record_agent_review_v1", {
    p_agent_id: agentId,
    p_rating: rating,
    p_comment: comment,
    p_fingerprint: fingerprint,
    p_request_id: requestId,
  });
  if (error) {
    if (error.message.includes("review_rate_limited")) return response({ error: "review_rate_limited" }, 429, corsOrigin);
    if (error.message.includes("review_unavailable")) return response({ error: "review_unavailable" }, 404, corsOrigin);
    if (error.message.includes("review_invalid")) return response({ error: "review_invalid" }, 400, corsOrigin);
    return response({ error: "review_failed" }, 503, corsOrigin);
  }
  return response({ submitted: true }, 200, corsOrigin);
});
