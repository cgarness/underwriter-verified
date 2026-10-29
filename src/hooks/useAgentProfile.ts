import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentData } from "@/contexts/AgentDataContext";
import { normalizeBrandText } from "@/lib/a2pBrand";

export function useAgentProfile(agencySlug: string | undefined, agentSlug: string | undefined) {
  return useQuery({
    queryKey: ["agent", agencySlug, agentSlug],
    queryFn: async (): Promise<AgentData> => {
      if (!agencySlug || !agentSlug) throw new Error("No agent slug provided");

      const { data, error } = await supabase
        .from("agents")
        .select("id, name, first_name, last_name, phone, email, agency, npn, bio, short_bio, headshot_url, calendar_url, state_licenses, testimonials, contact_card_only, profile_verified")
        .eq("agency_slug", agencySlug)
        .eq("slug", agentSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Agent not found");

      return {
        id: data.id,
        contactCardOnly: data.contact_card_only === true,
        profileVerified: data.profile_verified === true,
        name: normalizeBrandText(data.name),
        firstName: normalizeBrandText(data.first_name),
        lastName: normalizeBrandText(data.last_name),
        phone: normalizeBrandText(data.phone),
        email: normalizeBrandText(data.email),
        agency: normalizeBrandText(data.agency),
        npn: data.npn,
        bio: data.bio,
        shortBio: data.short_bio,
        headshotUrl: data.headshot_url,
        calendarUrl: data.calendar_url,
        stateLicenses: data.state_licenses as string[],
        testimonials: data.testimonials as { quote: string; name: string }[],
      };
    },
    enabled: !!agencySlug && !!agentSlug,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 60_000,
  });
}
