import { useLegalPaths } from "@/hooks/useLegalPaths";
import PublicIntakeForm from "@/components/PublicIntakeForm";
import type { IntakeFormSource } from "@/lib/submitPublicIntake";

interface SmsOptInFormProps {
  agentName: string;
  agencyName: string;
  agencySlug: string;
  agentSlug: string;
  pagePath: string;
  formSource?: IntakeFormSource;
  privacyHref?: string;
  termsHref?: string;
}

export default function SmsOptInForm({
  agentName,
  agencyName,
  agencySlug,
  agentSlug,
  pagePath,
  formSource = "quote",
  privacyHref,
  termsHref,
}: SmsOptInFormProps) {
  const legal = useLegalPaths();

  return (
    <PublicIntakeForm
      formSource={formSource}
      pagePath={pagePath}
      agentName={agentName}
      agencyName={agencyName}
      agencySlug={agencySlug}
      agentSlug={agentSlug}
      privacyHref={privacyHref ?? legal.privacy}
      termsHref={termsHref ?? legal.terms}
      includeState
      submitLabel="Get My Free Quote"
    />
  );
}
