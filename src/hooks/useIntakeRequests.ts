import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const INTAKE_PAGE_SIZE = 25;

export interface IntakeRow {
  id: string;
  created_at: string;
  form_source: string;
  page_path: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_display: string;
  state: string | null;
  informational: string;
  marketing: string;
  disclosureVersion: string;
  suppressedAtCapture: boolean;
}

type Cursor = { created_at: string; id: string } | null;

const REQUEST_COLUMNS =
  "id, created_at, form_source, page_path, first_name, last_name, email, phone_display, state";

async function fetchPage(cursor: Cursor): Promise<IntakeRow[]> {
  let query = supabase
    .from("intake_requests")
    .select(REQUEST_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(INTAKE_PAGE_SIZE);

  if (cursor) {
    const ts = `"${cursor.created_at}"`;
    query = query.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt."${cursor.id}")`);
  }

  const { data: requests, error } = await query;
  if (error) throw error;
  const rows = requests ?? [];
  if (rows.length === 0) return [];

  const { data: events, error: eventError } = await supabase
    .from("sms_consent_events")
    .select("intake_request_id, purpose, choice, disclosure_version_id, suppressed_at_capture")
    .in("intake_request_id", rows.map((row) => row.id));
  if (eventError) throw eventError;

  return rows.map((row) => {
    const own = (events ?? []).filter((event) => event.intake_request_id === row.id);
    const informational = own.find((event) => event.purpose === "informational");
    const marketing = own.find((event) => event.purpose === "marketing");
    return {
      ...row,
      informational: informational?.choice ?? "missing",
      marketing: marketing?.choice ?? "missing",
      disclosureVersion: informational?.disclosure_version_id ?? marketing?.disclosure_version_id ?? "",
      suppressedAtCapture: own.some((event) => event.suppressed_at_capture),
    };
  });
}

export function useIntakeRequests() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loading-more" | "ready" | "error">("idle");
  const [hasMore, setHasMore] = useState(false);
  const lastAction = useRef<"refresh" | "more">("refresh");
  const requestId = useRef(0);

  const load = useCallback(async (mode: "refresh" | "more") => {
    const id = ++requestId.current;
    lastAction.current = mode;
    setStatus(mode === "refresh" ? "loading" : "loading-more");
    const cursor: Cursor =
      mode === "more" && rows.length > 0
        ? { created_at: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id }
        : null;
    try {
      const page = await fetchPage(cursor);
      if (id !== requestId.current) return;
      setRows((current) => (mode === "refresh" ? page : [...current, ...page]));
      setHasMore(page.length === INTAKE_PAGE_SIZE);
      setStatus("ready");
    } catch {
      if (id !== requestId.current) return;
      setStatus("error");
    }
  }, [rows]);

  useEffect(() => {
    void load("refresh");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    rows,
    status,
    hasMore,
    refresh: () => load("refresh"),
    loadMore: () => load("more"),
    retry: () => load(lastAction.current),
  };
}
