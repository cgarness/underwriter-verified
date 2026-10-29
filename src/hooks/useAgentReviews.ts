import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicAgentReview = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type AgentReviewSummary = {
  review_count: number;
  average_rating: number;
};

export function useAgentReviews(agentId?: string) {
  return useQuery({
    queryKey: ["agent-reviews", agentId],
    enabled: Boolean(agentId),
    staleTime: 20_000,
    queryFn: async (): Promise<PublicAgentReview[]> => {
      const { data, error } = await supabase
        .from("agent_reviews")
        .select("id, rating, comment, created_at")
        .eq("agent_id", agentId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAgentReviewSummary(agentId?: string) {
  return useQuery({
    queryKey: ["agent-review-summary", agentId],
    enabled: Boolean(agentId),
    staleTime: 20_000,
    queryFn: async (): Promise<AgentReviewSummary> => {
      const { data, error } = await supabase
        .from("agent_review_summary")
        .select("review_count, average_rating")
        .eq("agent_id", agentId!)
        .maybeSingle();
      if (error) throw error;
      return {
        review_count: data?.review_count ?? 0,
        average_rating: data?.average_rating ?? 0,
      };
    },
  });
}
