import React from "react";
import { Loader2 } from "lucide-react";
import SmsOptInForm from "@/components/SmsOptInForm";
import LegalNavLinks from "@/components/LegalNavLinks";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAgentProfile } from "@/hooks/useAgentProfile";
import {
  A2P_AGENT_PATH,
  CANONICAL_AGENCY_SLUG,
  CANONICAL_AGENT_SLUG,
  DEFAULT_BRAND,
} from "@/lib/a2pBrand";

const SmsOptIn: React.FC = () => {
  const { data: agent, isLoading, error } = useAgentProfile(CANONICAL_AGENCY_SLUG, CANONICAL_AGENT_SLUG);
  usePageTitle(
    agent
      ? `SMS Opt-In | ${agent.name} | ${agent.agency}`
      : `SMS Opt-In | ${DEFAULT_BRAND.name} | ${DEFAULT_BRAND.agency}`,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Opt-in page unavailable</h1>
        <p className="max-w-md text-muted-foreground">
          The Christopher Garness / CG Financial profile could not be loaded, so this form will not
          use another agency’s name.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Get Your Free Life Insurance Quote
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {agent.name} | {agent.agency} | Independent Insurance Agent
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <SmsOptInForm
            agentName={agent.name}
            agencyName={agent.agency}
            agencySlug={CANONICAL_AGENCY_SLUG}
            agentSlug={CANONICAL_AGENT_SLUG}
            pagePath="/sms-opt-in"
            privacyHref={`${A2P_AGENT_PATH}/privacy-policy`}
            termsHref={`${A2P_AGENT_PATH}/terms-and-conditions`}
          />
        </div>

        <LegalNavLinks
          privacyHref={`${A2P_AGENT_PATH}/privacy-policy`}
          termsHref={`${A2P_AGENT_PATH}/terms-and-conditions`}
        />
      </div>
    </div>
  );
};

export default SmsOptIn;
