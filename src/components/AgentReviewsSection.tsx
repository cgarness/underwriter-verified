import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { useAgentData } from "@/contexts/AgentDataContext";
import { useAgentReviews, useAgentReviewSummary, type PublicAgentReview } from "@/hooks/useAgentReviews";
import { MAX_REVIEW_LENGTH, reviewRatingLabel, reviewValidationError } from "@/lib/agentReviews";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function RatingStars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={rating + " out of 5 stars"}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} aria-hidden="true" className={i < rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40"} />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: PublicAgentReview }) {
  return (
    <li className="rounded-xl border border-border bg-background p-5">
      <RatingStars rating={review.rating} size={16} />
      {review.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{review.comment}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        Anonymous client · {new Date(review.created_at).toLocaleDateString()}
      </p>
    </li>
  );
}

export default function AgentReviewsSection() {
  const { data: agent } = useAgentData();
  const { data: summary } = useAgentReviewSummary(agent.id);
  const { data: reviews, isError: fetchError } = useAgentReviews(agent.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  if (!agent.id) return null;

  const count = summary?.review_count ?? 0;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = reviewValidationError(rating, comment);
    if (validationError) { toast.error(validationError); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-agent-review", {
        body: {
          agentId: agent.id,
          rating,
          comment: comment.trim(),
          website,
          requestId: submissionId,
        },
      });
      if (error) throw error;
      setOpen(false);
      setRating(0);
      setComment("");
      setWebsite("");
      setSubmissionId(crypto.randomUUID());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agent-reviews", agent.id] }),
        queryClient.invalidateQueries({ queryKey: ["agent-review-summary", agent.id] }),
      ]);
      toast.success("Thank you for sharing your review.");
    } catch {
      toast.error("We couldn't submit your review. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="client-reviews" className="scroll-mt-20 bg-muted/30 py-14 md:py-20" aria-labelledby="client-reviews-heading">
      <div className="container max-w-4xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 id="client-reviews-heading" className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Client Ratings & Reviews</h2>
            <p className="mt-2 text-sm text-muted-foreground">Feedback submitted by visitors to this agent's profile. Reviews are not independently verified purchases.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2"><Star size={17} /> Leave a Review</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>How was your experience with {agent.firstName || agent.name}?</DialogTitle>
                <DialogDescription>Choose 1–5 stars. A written review is optional, and no sign-in is needed.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(event) => void submit(event)} className="space-y-5">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Your rating</legend>
                  <div className="flex justify-center gap-1" role="group" aria-label="Select star rating">
                    {Array.from({ length: 5 }, (_, i) => {
                      const value = i + 1;
                      return (
                        <button key={value} type="button" onClick={() => setRating(value)} aria-label={"Rate " + value + (value === 1 ? " star" : " stars")} aria-pressed={rating === value} className="rounded-md p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <Star size={34} aria-hidden="true" className={value <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40"} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="min-h-5 text-center text-sm text-muted-foreground" aria-live="polite">{rating ? reviewRatingLabel(rating) : "Select a star rating"}</p>
                </fieldset>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Written review <span className="font-normal text-muted-foreground">(optional)</span></span>
                  <Textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={MAX_REVIEW_LENGTH} rows={4} placeholder="Share your experience..." />
                  <span className="block text-right text-xs text-muted-foreground">{comment.length}/{MAX_REVIEW_LENGTH}</span>
                </label>
                <input aria-hidden="true" tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} className="absolute -left-[9999px] h-px w-px opacity-0" />
                <p className="text-xs text-muted-foreground">Your rating and comment may appear publicly as an anonymous client review. Please don't include private policy or medical information. Reviews of every star rating are accepted.</p>
                <Button type="submit" className="w-full" disabled={rating === 0 || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {count > 0 ? (
          <div className="flex items-center gap-3" aria-label={"Average rating " + summary?.average_rating + " from " + count + " reviews"}>
            <span className="text-3xl font-bold tabular-nums">{summary?.average_rating.toFixed(1)}</span>
            <RatingStars rating={Math.round(summary?.average_rating ?? 0)} size={19} />
            <span className="text-sm text-muted-foreground">{count} {count === 1 ? "review" : "reviews"}</span>
          </div>
        ) : <p className="text-sm text-muted-foreground">No client reviews yet. Be the first to share your experience.</p>}
        {fetchError && <p role="alert" className="text-sm text-destructive">Reviews could not be loaded at this time.</p>}
        {reviews && reviews.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2">
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </ul>
        )}
        {count > 20 && <p className="text-xs text-muted-foreground">Showing the 20 most recent published reviews.</p>}
      </div>
    </section>
  );
}
