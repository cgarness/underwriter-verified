import type { SmsPurpose } from "@/lib/smsDisclosure";

export type SmsEligibilityReason = "granted" | "no_grant" | "suppressed" | "invalid_class";

export interface SmsEligibilityInput {
  messageClass: string;
  hasSuppression: boolean;
  hasInformationalGrant: boolean;
  hasMarketingGrant: boolean;
  /** Effective, server-verified restoration; never inferred from a raw START body. */
  hasInformationalReenrollment?: boolean;
}

/**
 * Same decision table as public.evaluate_sms_eligibility.
 * A later unchecked box is "no new grant" and does not erase an earlier grant.
 * A suppression blocks both purposes until a separate re-enrollment exists.
 * Only a verified, synchronized START lifecycle can restore informational consent.
 * This repository has no outbound sender.
 */
export function decideSmsEligibility(input: SmsEligibilityInput): {
  allowed: boolean;
  reason: SmsEligibilityReason;
} {
  if (input.messageClass !== "informational" && input.messageClass !== "marketing") {
    return { allowed: false, reason: "invalid_class" };
  }
  if (input.hasSuppression && !(input.messageClass === "informational" && input.hasInformationalReenrollment)) {
    return { allowed: false, reason: "suppressed" };
  }
  const purpose = input.messageClass as SmsPurpose;
  const granted =
    purpose === "informational" ? input.hasInformationalGrant : input.hasMarketingGrant;
  if (!granted) {
    return { allowed: false, reason: "no_grant" };
  }
  return { allowed: true, reason: "granted" };
}
