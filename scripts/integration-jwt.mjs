// Mints HS256 JWTs for the local PostgREST harness. Prints shell exports.
// Uses PGRST_JWT_SECRET, a random secret generated per run. Never a hosted key.
import { createHmac } from "node:crypto";

const secret = process.env.PGRST_JWT_SECRET;
if (!secret) throw new Error("PGRST_JWT_SECRET is required");

const b64 = (value) => Buffer.from(value).toString("base64url");
const sign = (claims) => {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ iss: "ffl-local-harness", exp: Math.floor(Date.now() / 1000) + 86400, ...claims }));
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
};

export const OWNER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const OWNER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const tokens = {
  JWT_ANON: sign({ role: "anon" }),
  JWT_OWNER_A: sign({ role: "authenticated", sub: OWNER_A, aud: "authenticated" }),
  JWT_OWNER_B: sign({ role: "authenticated", sub: OWNER_B, aud: "authenticated" }),
  JWT_SERVICE: sign({ role: "service_role" }),
};

for (const [name, value] of Object.entries(tokens)) {
  process.stdout.write(`export ${name}=${value}\n`);
}
