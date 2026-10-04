import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IntakeRequestsPanel from "@/components/IntakeRequestsPanel";
import { INTAKE_PAGE_SIZE } from "@/hooks/useIntakeRequests";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

type Row = {
  id: string;
  created_at: string;
  form_source: string;
  page_path: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_display: string;
  state: string | null;
};

function makeRows(count: number, offset = 0): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${offset + i}`,
    created_at: new Date(Date.UTC(2026, 8, 29, 12, 0, count - i)).toISOString(),
    form_source: i % 2 ? "call_request" : "quote",
    page_path: "/cg-financial/christopher-garness",
    first_name: `First${offset + i}`,
    last_name: "Tester",
    email: `t${offset + i}@example.com`,
    phone_display: "(909) 555-0100",
    state: "California",
  }));
}

function eventsFor(rows: Row[], marketing: "granted" | "not_granted") {
  return rows.flatMap((row) => [
    {
      intake_request_id: row.id,
      purpose: "informational",
      choice: "granted",
      disclosure_version_id: "2026-09-29-separate-sms",
      suppressed_at_capture: false,
    },
    {
      intake_request_id: row.id,
      purpose: "marketing",
      choice: marketing,
      disclosure_version_id: "2026-09-29-separate-sms",
      suppressed_at_capture: false,
    },
  ]);
}

const orCalls: string[] = [];

function mockFrom(pages: Array<{ requests?: Row[]; requestError?: unknown }>) {
  let call = 0;
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === "intake_requests") {
      const page = pages[Math.min(call, pages.length - 1)];
      call += 1;
      const builder = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        or: (expr: string) => {
          orCalls.push(expr);
          return builder;
        },
        then: (resolve: (value: unknown) => void) =>
          resolve(
            page.requestError
              ? { data: null, error: page.requestError }
              : { data: page.requests ?? [], error: null },
          ),
      };
      return builder;
    }
    const builder = {
      select: () => builder,
      in: (_column: string, ids: string[]) => {
        const rows = pages.flatMap((p) => p.requests ?? []).filter((r) => ids.includes(r.id));
        return Promise.resolve({ data: eventsFor(rows, "not_granted"), error: null });
      },
    };
    return builder;
  }) as never);
}

describe("owner inbox", () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
    orCalls.length = 0;
  });

  it("shows the empty state when the owner has no requests", async () => {
    mockFrom([{ requests: [] }]);
    render(<IntakeRequestsPanel />);
    expect(await screen.findByText(/no quote or call requests yet/i)).toBeInTheDocument();
  });

  it("labels stored choices as historical evidence", async () => {
    mockFrom([{ requests: makeRows(2) }]);
    render(<IntakeRequestsPanel />);
    expect(await screen.findByText(/First0 Tester/)).toBeInTheDocument();
    expect(screen.getAllByText(/Submitted choices — informational SMS: granted; marketing SMS: not_granted/).length).toBe(2);
    expect(screen.getByText(/historical evidence, not proof that a text may be sent today/i)).toBeInTheDocument();
    expect(screen.getByText(/No older requests/i)).toBeInTheDocument();
  });

  it("loads older requests with a created_at and id tie-breaker cursor", async () => {
    const first = makeRows(INTAKE_PAGE_SIZE);
    const second = makeRows(3, INTAKE_PAGE_SIZE);
    mockFrom([{ requests: first }, { requests: second }]);
    render(<IntakeRequestsPanel />);
    await screen.findByText(/First0 Tester/);
    fireEvent.click(screen.getByRole("button", { name: /load older requests/i }));
    await screen.findByText(new RegExp(`First${INTAKE_PAGE_SIZE} Tester`));
    const last = first[first.length - 1];
    expect(orCalls[0]).toContain(`created_at.lt."${last.created_at}"`);
    expect(orCalls[0]).toContain(`id.lt."${last.id}"`);
    expect(screen.getByText(`${INTAKE_PAGE_SIZE + 3} shown`)).toBeInTheDocument();
    expect(screen.getByText(/No older requests/i)).toBeInTheDocument();
  });

  it("shows an error with retry and recovers", async () => {
    mockFrom([{ requestError: { message: "permission denied" } }, { requests: makeRows(1) }]);
    render(<IntakeRequestsPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(screen.getByText(/First0 Tester/)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("refreshes from the newest request", async () => {
    mockFrom([{ requests: makeRows(1) }, { requests: makeRows(2, 10) }]);
    render(<IntakeRequestsPanel />);
    await screen.findByText(/First0 Tester/);
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    await screen.findByText(/First10 Tester/);
    expect(screen.queryByText(/First0 Tester/)).not.toBeInTheDocument();
    expect(orCalls).toHaveLength(0);
  });
});
