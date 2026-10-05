import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { decideSmsEligibility } from "@/lib/smsEligibility";
import {
  SMS_DISCLOSURE_BODY,
  SMS_DISCLOSURE_VERSION_ID,
  SMS_INFORMATIONAL_TEMPLATE,
  SMS_MARKETING_TEMPLATE,
  buildDisplayedConsentText,
} from "@/lib/smsDisclosure";

describe("SMS eligibility", () => {
  it("treats a missing choice as no permission", () => {
    expect(
      decideSmsEligibility({
        messageClass: "informational",
        hasSuppression: false,
        hasInformationalGrant: false,
        hasMarketingGrant: false,
      }),
    ).toEqual({ allowed: false, reason: "no_grant" });
  });

  it("does not let one purpose satisfy the other", () => {
    expect(
      decideSmsEligibility({
        messageClass: "marketing",
        hasSuppression: false,
        hasInformationalGrant: true,
        hasMarketingGrant: false,
      }).allowed,
    ).toBe(false);
    expect(
      decideSmsEligibility({
        messageClass: "informational",
        hasSuppression: false,
        hasInformationalGrant: false,
        hasMarketingGrant: true,
      }).allowed,
    ).toBe(false);
  });

  it("allows only the purpose that was granted", () => {
    expect(
      decideSmsEligibility({
        messageClass: "marketing",
        hasSuppression: false,
        hasInformationalGrant: true,
        hasMarketingGrant: true,
      }),
    ).toEqual({ allowed: true, reason: "granted" });
  });

  it("keeps a suppression ahead of any grant", () => {
    expect(
      decideSmsEligibility({
        messageClass: "informational",
        hasSuppression: true,
        hasInformationalGrant: true,
        hasMarketingGrant: true,
      }),
    ).toEqual({ allowed: false, reason: "suppressed" });
  });

  it("rejects an unknown message class", () => {
    expect(
      decideSmsEligibility({
        messageClass: "promotional-reminder",
        hasSuppression: false,
        hasInformationalGrant: true,
        hasMarketingGrant: true,
      }).reason,
    ).toBe("invalid_class");
  });
});

describe("disclosure text stored by the migrations", () => {
  const intakeSql = readFileSync(
    path.resolve(process.cwd(), "supabase/migrations/20260929183000_public_intake_and_sms_consent.sql"),
    "utf8",
  );
  const policySql = readFileSync(
    path.resolve(process.cwd(), "supabase/migrations/20261005182200_advance_a2p_policy_disclosure.sql"),
    "utf8",
  );

  it("preserves the historical disclosure and advances the current evidence version", () => {
    expect(intakeSql).toContain("2026-09-29-separate-sms");
    expect(policySql).toContain(SMS_DISCLOSURE_VERSION_ID);
    expect(policySql).toContain(SMS_INFORMATIONAL_TEMPLATE);
    expect(policySql).toContain(SMS_MARKETING_TEMPLATE);
    expect(policySql).toContain(SMS_DISCLOSURE_BODY);
  });

  it("builds the evidence text reviewers can compare with a saved row", () => {
    expect(
      buildDisplayedConsentText({
        purpose: "marketing",
        agentName: "Christopher Garness",
        agencyName: "CG Financial",
        privacyUrl: "https://www.underwriterverified.com/cg-financial/christopher-garness/privacy-policy",
        termsUrl: "https://www.underwriterverified.com/cg-financial/christopher-garness/terms-and-conditions",
      }),
    ).toContain("recurring marketing SMS/MMS from Christopher Garness and CG Financial");
  });
});
