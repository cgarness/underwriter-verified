import type { AgentData } from "@/contexts/AgentDataContext";
import { Mail, Phone } from "lucide-react";

/** Contact-only surface: no intake, SMS program, booking or verification claims. */
export default function ManagedContactCard({ agent }: { agent: AgentData }) {
  const initials = `${agent.firstName.charAt(0)}${agent.lastName.charAt(0)}`.toUpperCase();
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:py-20">
      <article className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-4">
          {agent.headshotUrl ? <img src={agent.headshotUrl} alt={agent.name} className="h-20 w-20 rounded-full object-cover" /> :
            <div aria-label={`${agent.name} profile initials`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-semibold">{initials}</div>}
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold">{agent.name}</h1>
            {agent.agency && <p className="mt-1 break-words text-sm text-muted-foreground">{agent.agency}</p>}
          </div>
        </div>
        {(agent.phone || agent.email) && <nav aria-label="Contact agent" className="mt-6 flex flex-wrap gap-3">
          {agent.phone && <a href={`tel:${agent.phone}`} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm"><Phone className="h-4 w-4" />Call</a>}
          {agent.email && <a href={`mailto:${agent.email}`} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm"><Mail className="h-4 w-4" />Email</a>}
        </nav>}
        {agent.npn && <p className="mt-6 break-words text-sm"><span className="text-muted-foreground">NPN: </span>{agent.npn}</p>}
        {agent.stateLicenses.length > 0 && <section className="mt-5" aria-label="State licenses on file">
          <h2 className="text-sm font-medium">State licenses on file</h2>
          <ul className="mt-2 flex flex-wrap gap-2">{agent.stateLicenses.map(license => <li key={license} className="break-all rounded-md bg-muted px-3 py-1 text-sm">{license}</li>)}</ul>
        </section>}
      </article>
    </main>
  );
}
