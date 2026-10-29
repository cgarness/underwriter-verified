import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicAgentDataProvider, type AgentData } from "@/contexts/AgentDataContext";
import AgentReviewSummary from "@/components/AgentReviewSummary";
import { reviewValidationError, reviewRatingLabel, MAX_REVIEW_LENGTH } from "@/lib/agentReviews";

const mock = vi.hoisted(() => ({ summary: { review_count: 0, average_rating: 0 } }));
vi.mock("@/hooks/useAgentReviews", () => ({
  useAgentReviewSummary: () => ({ data: mock.summary }),
}));

const agent: AgentData = {
  id: "00000000-0000-4000-8000-000000000111",
  name: "Example Agent", firstName: "Example", lastName: "Agent",
  agency: "Example", phone: "", email: "", npn: "", bio: "", shortBio: "",
  headshotUrl: "", calendarUrl: "", stateLicenses: [], testimonials: [],
};

describe("public client reviews", () => {
  it("accepts all five ratings and an empty optional comment", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(reviewValidationError(rating, "")).toBeNull();
      expect(reviewRatingLabel(rating)).not.toBe("");
    }
    expect(reviewValidationError(0, "")).toMatch(/select/i);
    expect(reviewValidationError(6, "")).toMatch(/select/i);
    expect(reviewValidationError(3.5, "")).toMatch(/select/i);
    expect(reviewValidationError(5, "a".repeat(MAX_REVIEW_LENGTH + 1))).toMatch(/shorten/i);
  });
  it("shows no invented stars or review count for an agent with no feedback", () => {
    mock.summary = { review_count: 0, average_rating: 0 };
    render(<PublicAgentDataProvider data={agent}><AgentReviewSummary /></PublicAgentDataProvider>);
    expect(screen.getByRole("link", { name: /be the first to review/i })).toHaveAttribute("href", "#client-reviews");
    expect(screen.queryByText("4.9")).not.toBeInTheDocument();
  });
  it("shows the real count and average once reviews exist", () => {
    mock.summary = { review_count: 3, average_rating: 4.3 };
    render(<PublicAgentDataProvider data={agent}><AgentReviewSummary /></PublicAgentDataProvider>);
    expect(screen.getByText("4.3")).toBeInTheDocument();
    expect(screen.getByText("(3 reviews)")).toBeInTheDocument();
  });
});
