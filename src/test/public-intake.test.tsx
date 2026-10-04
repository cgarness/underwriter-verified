import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BookCallForm from "@/components/BookCallForm";
import SmsOptInForm from "@/components/SmsOptInForm";
import { supabase } from "@/integrations/supabase/client";
import { SMS_DISCLOSURE_VERSION_ID } from "@/lib/smsDisclosure";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

const saved = {
  data: { request_id: "11111111-1111-4111-8111-111111111111", duplicate: false },
  error: null,
};

function renderCallForm() {
  return render(
    <MemoryRouter initialEntries={["/cg-financial/christopher-garness/bookcall"]}>
      <BookCallForm
        agentName="Christopher Garness"
        agencyName="CG Financial"
        agencySlug="cg-financial"
        agentSlug="christopher-garness"
        pagePath="/cg-financial/christopher-garness/bookcall"
      />
    </MemoryRouter>,
  );
}

function fillCallForm() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
  fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "(909) 555-1212" } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
}

describe("public intake forms", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.rpc).mockResolvedValue(saved as never);
  });

  it("starts with both SMS choices unchecked", () => {
    renderCallForm();
    expect(screen.getByRole("checkbox", { name: /informational SMS\/MMS/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i })).not.toBeChecked();
  });

  it("disables preview submission and explains how to use the live form", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://jzdzeevjpootbeuniygx.supabase.co");
    vi.stubEnv("VITE_DEPLOYMENT_ENV", "preview");
    renderCallForm();
    expect(screen.getByRole("button", { name: /request a call/i })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/submissions are disabled on this preview/i);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("saves a call request with neither SMS box selected", async () => {
    renderCallForm();
    fillCallForm();
    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));

    expect(await screen.findByRole("heading", { name: /request saved/i })).toBeInTheDocument();
    expect(screen.getByText(/not a confirmed appointment/i)).toBeInTheDocument();
    expect(supabase.rpc).toHaveBeenCalledWith(
      "submit_public_intake",
      expect.objectContaining({
        p_form_source: "call_request",
        p_page_path: "/cg-financial/christopher-garness/bookcall",
        p_agency_slug: "cg-financial",
        p_agent_slug: "christopher-garness",
        p_informational_consent: false,
        p_marketing_consent: false,
        p_disclosure_version_id: SMS_DISCLOSURE_VERSION_ID,
      }),
    );
  });

  it("saves informational consent without selecting marketing", async () => {
    renderCallForm();
    fillCallForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /informational SMS\/MMS/i }));
    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));
    await screen.findByRole("heading", { name: /request saved/i });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "submit_public_intake",
      expect.objectContaining({
        p_informational_consent: true,
        p_marketing_consent: false,
      }),
    );
  });

  it("saves marketing consent without selecting informational", async () => {
    renderCallForm();
    fillCallForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i }));
    expect(screen.getByRole("checkbox", { name: /informational SMS\/MMS/i })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));
    await screen.findByRole("heading", { name: /request saved/i });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "submit_public_intake",
      expect.objectContaining({
        p_informational_consent: false,
        p_marketing_consent: true,
      }),
    );
  });

  it("saves both SMS choices when both boxes are checked", async () => {
    renderCallForm();
    fillCallForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /informational SMS\/MMS/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i }));
    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));
    await screen.findByRole("heading", { name: /request saved/i });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "submit_public_intake",
      expect.objectContaining({
        p_informational_consent: true,
        p_marketing_consent: true,
      }),
    );
  });

  it("does not show success when the save fails and reuses the attempt key on retry", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "rate_limited" },
    } as never);
    renderCallForm();
    fillCallForm();
    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/too many attempts/i);
    expect(screen.queryByRole("heading", { name: /request saved/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));
    await screen.findByRole("alert");
    const first = vi.mocked(supabase.rpc).mock.calls[0][1] as { p_idempotency_key: string };
    const second = vi.mocked(supabase.rpc).mock.calls[1][1] as { p_idempotency_key: string };
    expect(first.p_idempotency_key).toBe(second.p_idempotency_key);
  });

  it("uses a new attempt key after the consent choice changes", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "save_failed" },
    } as never);
    renderCallForm();
    fillCallForm();
    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i }));
    fireEvent.click(screen.getByRole("button", { name: /request a call/i }));
    await screen.findByRole("alert");
    const first = vi.mocked(supabase.rpc).mock.calls[0][1] as { p_idempotency_key: string };
    const second = vi.mocked(supabase.rpc).mock.calls[1][1] as { p_idempotency_key: string };
    expect(first.p_idempotency_key).not.toBe(second.p_idempotency_key);
  });

  it("keeps a checkbox unchanged when a policy link is clicked", () => {
    renderCallForm();
    fireEvent.click(screen.getByRole("link", { name: /privacy-policy/i }));
    expect(screen.getByRole("checkbox", { name: /informational SMS\/MMS/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i })).not.toBeChecked();
  });

  it("does not preselect consent on a second render", () => {
    const view = renderCallForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i }));
    view.unmount();
    renderCallForm();
    expect(screen.getByRole("checkbox", { name: /informational SMS\/MMS/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /marketing SMS\/MMS/i })).not.toBeChecked();
  });

  it("submits the dedicated quote page with the canonical identity", async () => {
    render(
      <MemoryRouter>
        <SmsOptInForm
          agentName="Christopher Garness"
          agencyName="CG Financial"
          agencySlug="cg-financial"
          agentSlug="christopher-garness"
          pagePath="/sms-opt-in"
          privacyHref="/cg-financial/christopher-garness/privacy-policy"
          termsHref="/cg-financial/christopher-garness/terms-and-conditions"
        />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "9095551212" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /get my free quote/i }));
    expect(await screen.findByText(/please select a state/i)).toBeInTheDocument();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
