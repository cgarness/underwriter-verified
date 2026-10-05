export const DEFAULT_BRAND = {
  name: "Christopher Garness",
  agency: "CG Financial",
  phone: "909-775-6963",
  email: "chris@fflagent.com",
  addressLine1: "6768 Regal Park Dr",
  addressLine2: "Fontana, CA 92336",
} as const;

/** Public production origin for A2P brand / campaign website fields. */
export const A2P_SITE_ORIGIN = "https://www.underwriterverified.com";

export const CANONICAL_AGENCY_SLUG = "cg-financial";
export const CANONICAL_AGENT_SLUG = "christopher-garness";
export const A2P_AGENT_PATH = `/${CANONICAL_AGENCY_SLUG}/${CANONICAL_AGENT_SLUG}`;

export const PRIVACY_EFFECTIVE_ON = "2026-10-05";
export const TERMS_EFFECTIVE_ON = "2026-10-05";
export const PRIVACY_EFFECTIVE_LABEL = "October 5, 2026";
export const PRIOR_POLICY_EFFECTIVE_ON = "2026-09-29";
export const PRIOR_POLICY_EFFECTIVE_LABEL = "September 29, 2026";

export const A2P_WEBSITE_URL = `${A2P_SITE_ORIGIN}${A2P_AGENT_PATH}`;
export const A2P_OPT_IN_URL = `${A2P_SITE_ORIGIN}/sms-opt-in`;
export const A2P_PRIVACY_URL = `${A2P_SITE_ORIGIN}${A2P_AGENT_PATH}/privacy-policy`;
export const A2P_TERMS_URL = `${A2P_SITE_ORIGIN}${A2P_AGENT_PATH}/terms-and-conditions`;

export const SMS_NON_SHARING_STATEMENT =
  "We do not sell, rent, or share mobile numbers, mobile information, SMS opt-in data, or SMS consent with third parties or affiliates for marketing or promotional purposes.";

export const CARRIER_LIABILITY_STATEMENT =
  "Carriers are not liable for any delayed or undelivered messages.";

/** Collapse accidental double spaces from CRM / DB name fields. */
export function normalizeBrandText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
