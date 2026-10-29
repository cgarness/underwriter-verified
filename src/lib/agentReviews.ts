export const MAX_REVIEW_LENGTH = 1000;

export function reviewValidationError(rating: number, comment: string): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "Please select 1 to 5 stars.";
  if (comment.length > MAX_REVIEW_LENGTH) return "Please shorten your review to 1,000 characters.";
  return null;
}

export function reviewRatingLabel(rating: number): string {
  return ["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating] ?? "";
}
