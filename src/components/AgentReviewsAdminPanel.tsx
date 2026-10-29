import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RatingStars } from "@/components/AgentReviewsSection";

export default function AgentReviewsAdminPanel({ agentId }: { agentId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["agent-owner-reviews", agentId],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from("agent_reviews")
        .select("id, rating, comment, status, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return reviews ?? [];
    },
  });
  return (
    <section className="space-y-4" aria-labelledby="admin-reviews-heading">
      <h2 id="admin-reviews-heading" className="flex items-center gap-2 text-xl font-bold"><Star size={19} /> Client Reviews</h2>
      <p className="text-sm text-muted-foreground">View feedback on your public profile. Reviews cannot be edited or deleted by agents. Platform administrators handle fraudulent or abusive submissions.</p>
      {isLoading && <p className="text-sm text-muted-foreground">Loading reviews...</p>}
      {isError && <p role="alert" className="text-sm text-destructive">Reviews could not be loaded.</p>}
      {data?.length === 0 && <p className="text-sm text-muted-foreground">No reviews have been submitted yet.</p>}
      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((review) => (
            <li key={review.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <RatingStars rating={review.rating} size={16} />
                <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                {review.status !== "published" && <span className="rounded bg-muted px-2 py-0.5 text-xs">Hidden by moderation</span>}
              </div>
              {review.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
