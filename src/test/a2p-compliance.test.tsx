import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgentDataProvider } from "@/contexts/AgentDataContext";
import SmsOptInForm from "@/components/SmsOptInForm";
import { CANONICAL_AGENCY_SLUG, CANONICAL_AGENT_SLUG } from "@/lib/a2pBrand";
import Footer from "@/components/Footer";
import LegalNavLinks from "@/components/LegalNavLinks";
import LegalSection from "@/components/LegalSection";
import ContactSection from "@/components/ContactSection";
import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { useLegalPaths } from "@/hooks/useLegalPaths";
import {
  A2P_OPT_IN_URL,
  A2P_PRIVACY_URL,
  A2P_SITE_ORIGIN,
  A2P_TERMS_URL,
  A2P_WEBSITE_URL,
  CARRIER_LIABILITY_STATEMENT,
  SMS_NON_SHARING_STATEMENT,
  normalizeBrandText,
} from "@/lib/a2pBrand";

function renderWithProviders(ui: ReactElement, path = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <AgentDataProvider>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </AgentDataProvider>
    </QueryClientProvider>
  );
}

const quoteForm = (
  <SmsOptInForm
    agentName="Christopher Garness"
    agencyName="CG Financial"
    agencySlug={CANONICAL_AGENCY_SLUG}
    agentSlug={CANONICAL_AGENT_SLUG}
    pagePath="/sms-opt-in"
    privacyHref="/cg-financial/christopher-garness/privacy-policy"
    termsHref="/cg-financial/christopher-garness/terms-and-conditions"
  />
);

describe("A2P campaign surfaces", () => {
  it("shows separate unchecked SMS choices on the quote form", () => {
    renderWithProviders(quoteForm);

    const informational = screen.getByRole("checkbox", { name: /informational SMS\/MMS/i });
    const marketing = screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i });
    expect(informational).not.toBeChecked();
    expect(marketing).not.toBeChecked();
    expect(screen.getAllByText(/Christopher Garness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CG Financial/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/message and data rates may apply/i)).toBeInTheDocument();
    expect(screen.getByText(/message frequency varies/i)).toBeInTheDocument();
    expect(screen.getByText(/STOP/)).toBeInTheDocument();
    expect(screen.getByText(/HELP/)).toBeInTheDocument();
    expect(screen.getByText(/SMS consent is not required/i)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Carriers are not liable for any delayed or undelivered messages/i);
    expect(screen.getByRole("link", { name: /privacy-policy/i })).toHaveAttribute(
      "href",
      "/cg-financial/christopher-garness/privacy-policy"
    );
    expect(screen.getByRole("link", { name: /terms-and-conditions/i })).toHaveAttribute(
      "href",
      "/cg-financial/christopher-garness/terms-and-conditions"
    );
    expect(screen.queryByText(/calls, SMS\/MMS, and emails/i)).not.toBeInTheDocument();
  });

  it("puts privacy and terms links in the agent footer", () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms and conditions/i })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Reply\s*STOP\s*to opt out/i);
    expect(document.body.textContent).toMatch(/Carriers are not liable/i);
  });

  it("replaces the inactive message form with links to the real intake flows", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AgentDataProvider>
          <MemoryRouter initialEntries={["/cg-financial/christopher-garness"]}>
            <Routes>
              <Route path="/:agencySlug/:agentSlug" element={<ContactSection />} />
            </Routes>
          </MemoryRouter>
        </AgentDataProvider>
      </QueryClientProvider>
    );

    expect(document.querySelector("form")).toBeNull();
    expect(document.querySelector("input")).toBeNull();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to the quote form/i })).toHaveAttribute("href", "#free-quote");
    expect(screen.getByRole("link", { name: /open the call request form/i })).toHaveAttribute(
      "href",
      "/cg-financial/christopher-garness/bookcall"
    );
    expect(screen.getAllByText(/does not opt you in to text messages/i).length).toBeGreaterThan(0);
  });

  it("points to one privacy policy instead of a second conflicting copy", () => {
    renderWithProviders(<LegalSection />);

    expect(screen.queryByText(/March 27, 2026/)).not.toBeInTheDocument();
    expect(screen.getByText(/Messaging Program/i)).toBeInTheDocument();
    expect(screen.getByText(SMS_NON_SHARING_STATEMENT)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read the privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read the terms and conditions/i })).toBeInTheDocument();
  });

  it("brands the homepage as a directory, not an SMS sender", () => {
    renderWithProviders(<Landing />);

    expect(screen.getAllByText(/Underwriter Verified/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/FFL Agent/i)).not.toBeInTheDocument();
    expect(screen.getByText(/does not send text messages/i)).toBeInTheDocument();
  });

  it("keeps the public privacy policy on CG Financial", () => {
    renderWithProviders(<PrivacyPolicy />);

    expect(screen.getByRole("heading", { name: /privacy policy for cg financial/i })).toBeInTheDocument();
    expect(screen.getByText(SMS_NON_SHARING_STATEMENT)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/two separate, optional SMS choices remain unchanged/i);
    expect(screen.getByText(/message frequency varies/i)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Carriers are not liable for any delayed or undelivered messages/i);
  });

  it("scopes legal URLs to the agent profile path", () => {
    function Probe() {
      const { privacy, terms } = useLegalPaths();
      return (
        <div>
          <span>{privacy}</span>
          <span>{terms}</span>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/cg-financial/christopher-garness"]}>
        <Routes>
          <Route path="/:agencySlug/:agentSlug" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByText("/cg-financial/christopher-garness/privacy-policy")
    ).toBeInTheDocument();
    expect(
      screen.getByText("/cg-financial/christopher-garness/terms-and-conditions")
    ).toBeInTheDocument();
  });
  it("keeps required SMS terms on the terms page and separates call requests from SMS consent", async () => {
    const { default: TermsAndConditions } = await import("@/pages/TermsAndConditions");
    renderWithProviders(<TermsAndConditions />);

    expect(
      screen.getByRole("heading", { name: /terms and conditions for cg financial/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/CG Financial Messaging Program/i)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Carriers are not liable for any delayed or undelivered messages/i);
    expect(screen.getByText(SMS_NON_SHARING_STATEMENT)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/A call request by itself asks us to contact you about scheduling a call/i);
    expect(document.body.textContent).toMatch(/If you separately select one of the optional SMS checkboxes described in Section 3/i);
  });

  it("lets the dedicated opt-in footer use scoped legal links without changing shared fallback behavior", () => {
    renderWithProviders(
      <LegalNavLinks
        privacyHref="/cg-financial/christopher-garness/privacy-policy"
        termsHref="/cg-financial/christopher-garness/terms-and-conditions"
      />,
      "/sms-opt-in",
    );

    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
      "href",
      "/cg-financial/christopher-garness/privacy-policy",
    );
    expect(screen.getByRole("link", { name: /terms and conditions/i })).toHaveAttribute(
      "href",
      "/cg-financial/christopher-garness/terms-and-conditions",
    );
  });

  it("publishes the custom domain URLs for A2P registration", () => {
    expect(A2P_SITE_ORIGIN).toBe("https://www.underwriterverified.com");
    expect(A2P_WEBSITE_URL).toBe(
      "https://www.underwriterverified.com/cg-financial/christopher-garness"
    );
    expect(A2P_OPT_IN_URL).toBe("https://www.underwriterverified.com/sms-opt-in");
    expect(A2P_PRIVACY_URL).toContain("/privacy-policy");
    expect(A2P_TERMS_URL).toContain("/terms-and-conditions");
  });

  it("normalizes double spaces in brand names from the database", () => {
    expect(normalizeBrandText("Christopher  Garness")).toBe("Christopher Garness");
  });

});
