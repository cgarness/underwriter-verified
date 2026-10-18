import { GENERIC_OG_IMAGE, getPublicAgent } from "../server/agentPreview.js";

function fallback(): Response {
  return new Response(null, { status: 302, headers: { Location: GENERIC_OG_IMAGE, "Cache-Control": "no-store" } });
}

const HEADER = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  try {
    const profile = await getPublicAgent(
      url.searchParams.get("agency"),
      url.searchParams.get("agent"),
      AbortSignal.timeout(5000),
    );
    const value = profile?.headshot_url || "";

    // Existing profile photos are base64 PNGs in the public agents table.
    // Serve real binary image bytes: social crawlers cannot use a data URL.
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/i.exec(value);
    if (match) {
      if (match[2].length > 6_700_000) return fallback();
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length === 0 || bytes.length > 5_000_000) return fallback();
      const type = match[1].toLowerCase();
      const valid =
        (type === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
        (type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
        (type === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP");
      if (!valid) return fallback();
      return new Response(bytes, {
        status: 200,
        headers: { ...HEADER, "Content-Type": type },
      });
    }

    // Other agents may eventually use HTTPS-hosted public photos.
    // Redirect rather than fetching arbitrary owner-controlled URLs server-side.
    if (value.length < 2048 && /^https:\/\//i.test(value)) {
      const external = new URL(value);
      if (external.username === "" && external.password === "") {
        return new Response(null, { status: 302, headers: { ...HEADER, Location: external.href } });
      }
    }
    return fallback();
  } catch (err) {
    console.error("Agent photo preview unavailable", err);
    return fallback();
  }
}
