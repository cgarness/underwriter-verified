import { A2P_SITE_ORIGIN, CARRIER_LIABILITY_STATEMENT, normalizeBrandText } from "@/lib/a2pBrand";

/** Must match the current sms_disclosure_versions.id in the forward policy migration. */
export const SMS_DISCLOSURE_VERSION_ID = "2026-10-05-policy-clarifications";

export const SMS_INFORMATIONAL_TEMPLATE =
  "I agree to receive recurring informational SMS/MMS from {sender} about my requested quote, appointments, and application or policy updates.";

export const SMS_MARKETING_TEMPLATE =
  "I agree to receive recurring marketing SMS/MMS from {sender} about life insurance products and coverage reviews.";

export const SMS_DISCLOSURE_BODY = `Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. SMS consent is not required to request a quote, request a call, or purchase insurance. ${CARRIER_LIABILITY_STATEMENT}`;

export type SmsPurpose = "informational" | "marketing";

export function formatSmsSender(agentName: string, agencyName: string): string {
  const name = normalizeBrandText(agentName);
  const agency = normalizeBrandText(agencyName);
  return agency ? `${name} and ${agency}` : name;
}

export function renderSmsLabel(template: string, agentName: string, agencyName: string): string {
  return template.split("{sender}").join(formatSmsSender(agentName, agencyName));
}

export function absoluteLegalUrls(agencySlug: string, agentSlug: string) {
  const base = `${A2P_SITE_ORIGIN}/${agencySlug}/${agentSlug}`;
  return {
    privacy: `${base}/privacy-policy`,
    terms: `${base}/terms-and-conditions`,
  };
}

export function buildDisplayedConsentText(input: {
  purpose: SmsPurpose;
  agentName: string;
  agencyName: string;
  privacyUrl: string;
  termsUrl: string;
}): string {
  const label = renderSmsLabel(
    input.purpose === "informational" ? SMS_INFORMATIONAL_TEMPLATE : SMS_MARKETING_TEMPLATE,
    input.agentName,
    input.agencyName,
  );
  return [
    label,
    SMS_DISCLOSURE_BODY,
    `Privacy Policy: ${input.privacyUrl}`,
    `Terms and Conditions: ${input.termsUrl}`,
  ].join("\n");
}
