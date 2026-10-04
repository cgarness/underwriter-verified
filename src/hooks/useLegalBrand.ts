import { useParams } from "react-router-dom";
import { useAgentProfile } from "@/hooks/useAgentProfile";
import { CANONICAL_AGENCY_SLUG, CANONICAL_AGENT_SLUG, DEFAULT_BRAND, normalizeBrandText } from "@/lib/a2pBrand";

export type LegalBrand = {
  name: string;
  agency: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
};

export function useLegalBrand() {
  const { agencySlug, agentSlug } = useParams<{ agencySlug: string; agentSlug: string }>();
  const scoped = Boolean(agencySlug && agentSlug);
  const query = useAgentProfile(agencySlug, agentSlug);

  const isCanonical =
    agencySlug === CANONICAL_AGENCY_SLUG && agentSlug === CANONICAL_AGENT_SLUG;
  const showSuppliedAddress = !scoped || isCanonical;
  const brand: LegalBrand = query.data
    ? {
        name: normalizeBrandText(query.data.name),
        agency: normalizeBrandText(query.data.agency),
        phone: normalizeBrandText(query.data.phone),
        email: normalizeBrandText(query.data.email),
        addressLine1: showSuppliedAddress ? DEFAULT_BRAND.addressLine1 : "",
        addressLine2: showSuppliedAddress ? DEFAULT_BRAND.addressLine2 : "",
      }
    : { ...DEFAULT_BRAND };

  return {
    brand,
    scoped,
    profileHref: scoped ? `/${agencySlug}/${agentSlug}` : "/",
    isLoading: scoped && query.isLoading,
    notFound: scoped && !query.isLoading && (query.isError || !query.data),
  };
}
