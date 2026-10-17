import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildProfileMetadata, getPublicAgent, isProfileSlug } from "../server/agentPreview.js";

// Bundle the exact Vite-generated HTML shell (including hashed JS/CSS assets).
// The Vercel function's includeFiles setting packages dist/index.html.
const shellPromise = readFile(resolve(process.cwd(), "dist/index.html"), "utf8");

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const agency = url.searchParams.get("agency");
  const agentSlug = url.searchParams.get("agent");

  let shell: string;
  try {
    shell = await shellPromise;
  } catch (err) {
    console.error("Link preview HTML shell unavailable", err);
    return new Response("Page temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  let html = shell;
  if (isProfileSlug(agency) && isProfileSlug(agentSlug)) {
    try {
      const profile = await getPublicAgent(agency, agentSlug, AbortSignal.timeout(5000));
      if (profile) {
        const path = "/" + agency + "/" + agentSlug;
        const photo = new URL("/api/agent-photo", url.origin);
        photo.searchParams.set("agency", agency);
        photo.searchParams.set("agent", agentSlug);
        html = buildProfileMetadata(shell, profile, url.origin + path, photo.toString());
      }
    } catch (err) {
      // Link-preview data must never break the existing React profile page.
      console.error("Link preview metadata unavailable", err);
    }
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
