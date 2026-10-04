import { useRef, useState } from "react";
import {
  intakeErrorCode,
  intakeErrorMessage,
  submitPublicIntake,
  type IntakeFormSource,
  type PublicIntakeSubmission,
} from "@/lib/submitPublicIntake";

export interface PublicIntakeValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  state?: string;
  informationalConsent: boolean;
  marketingConsent: boolean;
  faxNumber?: string;
}

function fingerprint(values: PublicIntakeValues): string {
  return JSON.stringify({
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    state: values.state ?? "",
    informationalConsent: values.informationalConsent === true,
    marketingConsent: values.marketingConsent === true,
  });
}

export function usePublicIntake(identity: {
  formSource: IntakeFormSource;
  pagePath: string;
  agencySlug: string;
  agentSlug: string;
}) {
  const [status, setStatus] = useState<"editing" | "submitting" | "saved">("editing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempt = useRef<{ key: string; fingerprint: string } | null>(null);

  async function submit(values: PublicIntakeValues) {
    if (status === "submitting") return;
    const nextFingerprint = fingerprint(values);
    if (!attempt.current || attempt.current.fingerprint !== nextFingerprint) {
      attempt.current = { key: crypto.randomUUID(), fingerprint: nextFingerprint };
    }

    const payload: PublicIntakeSubmission = {
      idempotencyKey: attempt.current.key,
      formSource: identity.formSource,
      pagePath: identity.pagePath,
      agencySlug: identity.agencySlug,
      agentSlug: identity.agentSlug,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      state: values.state,
      informationalConsent: values.informationalConsent === true,
      marketingConsent: values.marketingConsent === true,
      faxNumber: values.faxNumber ?? "",
    };

    setStatus("submitting");
    setErrorMessage(null);
    try {
      await submitPublicIntake(payload);
      setStatus("saved");
    } catch (error) {
      const code = intakeErrorCode(error instanceof Error ? error : null);
      setErrorMessage(intakeErrorMessage(code));
      setStatus("editing");
    }
  }

  return { status, errorMessage, submit };
}
