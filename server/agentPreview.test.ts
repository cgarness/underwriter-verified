import { describe, expect, it } from "vitest";
import { buildProfileMetadata, escapeHTML, isProfileSlug } from "./agentPreview";

const shell = '<!doctype html><html><head><meta name="description" content="Generic"><meta property="og:title" content="Underwriter Verified"><meta property="og:image" content="generic.png"><meta name="twitter:card" content="summary_large_image"><title>Underwriter Verified</title></head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>';

describe("agent SMS link preview metadata", () => {
  it.each([undefined, false])("uses neutral unverified contact-card metadata: %s", (profile_verified) => {
    const html = buildProfileMetadata(shell,
      { name: "Jordan Example", agency: "Example Life", headshot_url: "", contact_card_only: true, profile_verified },
      "https://www.underwriterverified.com/example-life/jordan", "https://www.underwriterverified.com/photo.png");
    expect(html).toContain("Jordan Example | Agent Profile");
    expect(html).toContain("Agent profile · Example Life");
    expect(html).not.toContain("✅");
    expect(html).not.toContain("Agent Verified");
    expect(html).toContain('property="og:image"');
  });
  it("uses the confirmed agent title across SMS and social previews", () => {
    const html = buildProfileMetadata(shell,
      { name: "Jordan Example", agency: "Example Life", headshot_url: "", contact_card_only: true, profile_verified: true },
      "https://www.underwriterverified.com/example-life/jordan", "https://www.underwriterverified.com/photo.png");
    expect(html).toContain('<title>Jordan Example | ✅ Agent Verified</title>');
    expect(html).toContain('property="og:title" content="Jordan Example | ✅ Agent Verified"');
    expect(html).toContain('name="twitter:title" content="Jordan Example | ✅ Agent Verified"');
    expect(html).toContain('property="og:description" content="✅ Agent Verified · Example Life · Underwriter Verified"');
    expect(html).toContain('property="og:image" content="https://www.underwriterverified.com/photo.png"');
    expect(html).not.toContain('Jordan Example | Agent Profile');
  });
  it("renders a unique title, agency, green checkmark and agent photo URL", () => {
    const html = buildProfileMetadata(
      shell,
      { name: "Christopher Garness", agency: "CG Financial", headshot_url: "data:image/png;base64,abc" },
      "https://www.underwriterverified.com/cg-financial/christopher-garness",
      "https://www.underwriterverified.com/api/agent-photo?agency=cg-financial&agent=christopher-garness",
    );
    expect(html).toContain("Christopher Garness | ✅ Agent Verified");
    expect(html).toContain("✅ Agent Verified · CG Financial");
    expect(html).toContain("api/agent-photo?agency=cg-financial&amp;agent=christopher-garness");
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>');
  });

  it("escapes agent-generated content rather than interpreting HTML", () => {
    const html = buildProfileMetadata(
      shell, { name: '<script>alert("x")</script>', agency: 'A & "B"', headshot_url: "" },
      "https://www.underwriterverified.com/a/b", "https://www.underwriterverified.com/photo.png",
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("A &amp; &quot;B&quot;");
    expect(escapeHTML("'")).toBe("&#39;");
  });

  it("rejects invalid route slugs before any Supabase query", () => {
    expect(isProfileSlug("cg-financial")).toBe(true);
    expect(isProfileSlug("agent-admin")).toBe(true);
    expect(isProfileSlug("../foo")).toBe(false);
    expect(isProfileSlug("<script>")).toBe(false);
    expect(isProfileSlug("")).toBe(false);
    expect(isProfileSlug("a".repeat(90))).toBe(false);
  });
});
