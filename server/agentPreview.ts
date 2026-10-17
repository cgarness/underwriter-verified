/**
 * Public, read-only agent metadata for social link previews.
 * API URL and publishable key match the existing browser config in .env.
 * A publishable key is public; NEVER use a service-role key in this module.
 * Agents are already public-readable under the existing RLS policy.
 */
const API_URL = "https://jzdzeevjpootbeuniygx.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_uPzrTCO-73285tblDxclUQ_2s9shmhF";

export interface PreviewAgent {
  name: string;
  agency: string;
  headshot_url: string;
}

export const isProfileSlug = (s: string | null): s is string =>
  typeof s === "string" && /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(s);

export async function getPublicAgent(
  agency: string | null,
  agent: string | null,
  signal?: AbortSignal,
): Promise<PreviewAgent | null> {
  if (!isProfileSlug(agency) || !isProfileSlug(agent)) return null;

  const params = new URLSearchParams({
    select: "name,agency,headshot_url",
    agency_slug: "eq." + agency,
    slug: "eq." + agent,
    limit: "1",
  });

  // The hostname is fixed; request-controlled slugs are only URL query values.
  const response = await fetch(API_URL + "/rest/v1/agents?" + params.toString(), {
    method: "GET",
    headers: {
      apikey: PUBLISHABLE_KEY,
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) throw new Error("Public agent lookup failed (" + response.status + ")");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (!row || typeof row.name !== "string" || !row.name.trim()) return null;
  return {
    name: row.name.slice(0, 120).trim(),
    agency: typeof row.agency === "string" ? row.agency.slice(0, 120).trim() : "",
    headshot_url: typeof row.headshot_url === "string" ? row.headshot_url : "",
  };
}

export const GENERIC_OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/68dcfaa4-78f7-48eb-8c9d-f27f1a71d581/id-preview-bcd6d824--6ab991ff-a95a-4825-ac82-d10ad1e01aca.lovable.app-1774645333029.png";

export function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function buildProfileMetadata(
  html: string,
  agent: PreviewAgent,
  absoluteUrl: string,
  photoUrl: string,
): string {
  const name = escapeHTML(agent.name);
  const agency = escapeHTML(agent.agency || "Licensed Life Insurance Agent");
  const title = name + " | ✅ Agent Verified";
  const description = "✅ Agent Verified · " + agency + " · Underwriter Verified";
  const canonical = escapeHTML(absoluteUrl);
  const image = escapeHTML(photoUrl);
  const tags = [
    '<meta name="description" content="' + description + '">',
    '<meta property="og:type" content="profile">',
    '<meta property="og:site_name" content="Underwriter Verified">',
    '<meta property="og:title" content="' + title + '">',
    '<meta property="og:description" content="' + description + '">',
    '<meta property="og:url" content="' + canonical + '">',
    '<meta property="og:image" content="' + image + '">',
    '<meta property="og:image:alt" content="Profile photo of ' + name + '">',
    '<meta name="twitter:card" content="summary">',
    '<meta name="twitter:title" content="' + title + '">',
    '<meta name="twitter:description" content="' + description + '">',
    '<meta name="twitter:image" content="' + image + '">',
    '<link rel="canonical" href="' + canonical + '">',
  ].join("\n    ");

  // Remove generic tags instead of adding duplicates that scrapers interpret
  // inconsistently. Keep unrelated viewport/charset/favicon metadata intact.
  return html
    .replace(/<meta\s+(?:name|property)=["'](?:description|og:[a-z:_-]+|twitter:[a-z:_-]+)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<title>[^<]*<\/title>/i, "<title>" + title + "</title>")
    .replace(/<\/head>/i, "    " + tags + "\n</head>");
}
