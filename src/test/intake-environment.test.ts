import { afterEach, describe, expect, it, vi } from "vitest";
import { intakeEnvironmentAllowsSubmission } from "@/lib/intakeEnvironment";
import { submitPublicIntake, type PublicIntakeSubmission } from "@/lib/submitPublicIntake";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
const productionDb = "https://jzdzeevjpootbeuniygx.supabase.co";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("intake environment safeguard", () => {
  it.each(["https://www.underwriterverified.com", "https://underwriterverified.com"])(
    "allows the production build on %s", (origin) => {
      expect(intakeEnvironmentAllowsSubmission(productionDb, origin, "production")).toBe(true);
    },
  );

  it.each([
    ["https://underwriterverified-preview.vercel.app", "preview"],
    ["https://underwriterverified-preview.vercel.app", "production"],
    ["https://www.underwriterverified.com", "preview"],
    ["https://www.underwriterverified.com", "development"],
    ["https://www.underwriterverified.com.attacker.test", "production"],
    ["http://www.underwriterverified.com", "production"],
    ["http://localhost:8080", "development"],
  ])("blocks production intake from %s (%s)", (origin, environment) => {
    expect(intakeEnvironmentAllowsSubmission(productionDb, origin, environment)).toBe(false);
  });

  it("permits local API integration while refusing unknown hosted databases", () => {
    expect(intakeEnvironmentAllowsSubmission("http://127.0.0.1:3001", "http://localhost:8080", "development")).toBe(true);
    expect(intakeEnvironmentAllowsSubmission("https://unknown.supabase.co", "http://localhost:8080", "development")).toBe(false);
    expect(intakeEnvironmentAllowsSubmission("invalid", "http://localhost:8080", "development")).toBe(false);
  });

  it("refuses the former Lovable backend and AgentFlow after the transfer", () => {
    for (const host of ["rtgmdbqzkwlmplurypyh", "jncvvsvckxhqgqvkppmj"]) {
      expect(intakeEnvironmentAllowsSubmission(`https://${host}.supabase.co`, "https://www.underwriterverified.com", "production")).toBe(false);
    }
  });

  it("rejects direct submission before any RPC when a preview points at production", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", productionDb);
    vi.stubEnv("VITE_DEPLOYMENT_ENV", "preview");
    await expect(submitPublicIntake({} as PublicIntakeSubmission)).rejects.toThrow("preview_disabled");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
