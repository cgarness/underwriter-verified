import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIntakeRequests, type IntakeRow } from "@/hooks/useIntakeRequests";

export default function IntakeRequestsPanel() {
  const { rows, status, hasMore, refresh, loadMore, retry } = useIntakeRequests();
  const busy = status === "loading" || status === "loading-more";

  return (
    <section className="space-y-4" aria-labelledby="intake-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="intake-heading" className="text-xl font-bold text-foreground">Quote and call requests</h2>
          <div className="mt-1.5 h-0.5 w-10 rounded-full bg-accent" />
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw size={14} className={status === "loading" ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Requests saved from your public pages, newest first. Only the signed-in owner of this
        profile can see them. The SMS choices shown are what the visitor selected when the request
        was saved. They are historical evidence, not proof that a text may be sent today: a later
        STOP, another submission, or a provider block can override an earlier choice. This screen
        does not send texts, and delivery into AgentFlow is not connected.
      </p>

      {status === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
        </p>
      )}

      {status === "error" && (
        <div role="alert" className="space-y-2 rounded-xl border border-destructive/40 p-4 text-sm">
          <p className="text-destructive">
            Requests could not be loaded. If the intake migration has not been applied yet, or you
            are not signed in as the owner of this profile, nothing will appear here.
          </p>
          <Button variant="outline" size="sm" onClick={() => void retry()}>Try again</Button>
        </div>
      )}

      {status === "ready" && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No quote or call requests yet.</p>
      )}

      <ul className="space-y-3">
        {rows.map((row) => (
          <IntakeRowCard key={row.id} row={row} />
        ))}
      </ul>

      {rows.length > 0 && (
        <div className="flex items-center gap-3">
          {hasMore ? (
            <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={busy}>
              {status === "loading-more" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Load older requests
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">No older requests.</p>
          )}
          <p className="text-xs text-muted-foreground">{rows.length} shown</p>
        </div>
      )}
    </section>
  );
}

function IntakeRowCard({ row }: { row: IntakeRow }) {
  return (
    <li className="space-y-1 rounded-xl border border-border p-4 text-sm">
      <p className="font-medium text-foreground">
        {row.first_name} {row.last_name} · {row.form_source === "call_request" ? "Call request" : "Quote"}
      </p>
      <p className="text-muted-foreground">
        {row.phone_display} · {row.email}
        {row.state ? ` · ${row.state}` : ""}
      </p>
      <p className="text-muted-foreground">
        {new Date(row.created_at).toLocaleString()} · {row.page_path}
      </p>
      <p className="text-muted-foreground">
        Submitted choices — informational SMS: {row.informational}; marketing SMS: {row.marketing};
        disclosure version {row.disclosureVersion || "n/a"}.
      </p>
      {row.suppressedAtCapture && (
        <p className="text-muted-foreground">
          An opt-out was already on file when this was saved. This request did not remove it.
        </p>
      )}
    </li>
  );
}
