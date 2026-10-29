import { Star } from "lucide-react";
import { useAgentData } from "@/contexts/AgentDataContext";
import { useAgentReviewSummary } from "@/hooks/useAgentReviews";

export default function AgentReviewSummary() {
  const { data: agent } = useAgentData();
  const { data: summary } = useAgentReviewSummary(agent.id);
  if (!agent.id) return null;
  const count = summary?.review_count ?? 0;
  return (
    <a href="#client-reviews" className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={count ? "Read " + count + " client reviews, average " + summary?.average_rating + " of 5 stars" : "Be the first to review this agent"}>
      <Star size={17} aria-hidden="true" className={count ? "fill-amber-400 text-amber-500" : "text-muted-foreground"} />
      {count > 0 ? (
        <>
          <span className="font-bold tabular-nums">{summary?.average_rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({count} {count === 1 ? "review" : "reviews"})</span>
        </>
      ) : <span className="text-muted-foreground">Be the first to review</span>}
    </a>
  );
}
