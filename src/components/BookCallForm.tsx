import { useLegalPaths } from "@/hooks/useLegalPaths";
import PublicIntakeForm from "@/components/PublicIntakeForm";

interface BookCallFormProps {
  agentName: string;
  agencyName: string;
  agencySlug: string;
  agentSlug: string;
  pagePath: string;
}

export default function BookCallForm({
  agentName,
  agencyName,
  agencySlug,
  agentSlug,
  pagePath,
}: BookCallFormProps) {
  const { privacy, terms } = useLegalPaths();

  return (
    <PublicIntakeForm
      formSource="call_request"
      pagePath={pagePath}
      agentName={agentName}
      agencyName={agencyName}
      agencySlug={agencySlug}
      agentSlug={agentSlug}
      privacyHref={privacy}
      termsHref={terms}
      includeState={false}
      submitLabel="Request a Call"
    />
  );
}
