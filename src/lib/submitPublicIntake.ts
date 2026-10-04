import { supabase } from "@/integrations/supabase/client";
import { SMS_DISCLOSURE_VERSION_ID } from "@/lib/smsDisclosure";
import { canSubmitPublicIntake, INTAKE_PREVIEW_MESSAGE } from "@/lib/intakeEnvironment";

export type IntakeFormSource = "quote" | "call_request";

export interface PublicIntakeSubmission {
  idempotencyKey: string;
  formSource: IntakeFormSource;
  pagePath: string;
  agencySlug: string;
  agentSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state?: string;
  informationalConsent: boolean;
  marketingConsent: boolean;
  faxNumber?: string;
}

export type IntakeErrorCode =
  | "unknown_agent"
  | "invalid_input"
  | "disclosure_version"
  | "rate_limited"
  | "idempotency_conflict"
  | "preview_disabled"
  | "save_failed";

const KNOWN_CODES: IntakeErrorCode[] = [
  "unknown_agent",
  "invalid_input",
  "disclosure_version",
  "rate_limited",
  "idempotency_conflict",
  "preview_disabled",
];

export function intakeErrorCode(error: { message?: string } | null | undefined): IntakeErrorCode {
  const message = error?.message ?? "";
  return KNOWN_CODES.find((code) => message.includes(code)) ?? "save_failed";
}

export function intakeErrorMessage(code: IntakeErrorCode): string {
  switch (code) {
    case "preview_disabled":
      return INTAKE_PREVIEW_MESSAGE;
    case "unknown_agent":
      return "This page is not an active agent profile. Your request was not saved.";
    case "disclosure_version":
      return "This form is out of date. Refresh the page and try again.";
    case "rate_limited":
      return "Too many attempts for this phone number. Please wait and try again.";
    case "idempotency_conflict":
      return "This attempt did not match the saved request. Refresh the page and submit again.";
    case "invalid_input":
      return "Check the form and try again.";
    default:
      return "We could not save your request. Please try again.";
  }
}

export async function submitPublicIntake(
  input: PublicIntakeSubmission,
): Promise<{ requestId: string; duplicate: boolean }> {
  if (!canSubmitPublicIntake()) throw new Error("preview_disabled");
  const { data, error } = await supabase.rpc("submit_public_intake", {
    p_idempotency_key: input.idempotencyKey,
    p_form_source: input.formSource,
    p_page_path: input.pagePath,
    p_agency_slug: input.agencySlug,
    p_agent_slug: input.agentSlug,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_phone: input.phone,
    p_state: input.state ?? "",
    p_informational_consent: input.informationalConsent,
    p_marketing_consent: input.marketingConsent,
    p_disclosure_version_id: SMS_DISCLOSURE_VERSION_ID,
    p_fax_number: input.faxNumber ?? "",
  });

  if (error) {
    throw new Error(intakeErrorCode(error));
  }

  const payload = data as { request_id?: string; duplicate?: boolean } | null;
  if (!payload?.request_id) {
    throw new Error("save_failed");
  }

  return { requestId: payload.request_id, duplicate: payload.duplicate === true };
}
