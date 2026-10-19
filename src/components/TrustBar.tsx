import { BadgeCheck, MapPin, UserRound } from "lucide-react";
import { useAgentData } from "@/contexts/AgentDataContext";

export default function TrustBar() {
  const { data } = useAgentData();

  return (
    <div className="sticky top-0 z-[60] w-full bg-foreground py-1.5">
      <div className="container flex items-center justify-center gap-4 text-xs font-medium tracking-wide text-background sm:gap-6">
        <span className={`flex items-center gap-1.5 font-semibold ${data.contactCardOnly ? "text-accent" : "text-emerald-400"}`}>
          {data.contactCardOnly ? <UserRound size={14} aria-hidden="true" /> : <BadgeCheck size={14} aria-hidden="true" />}
          {data.contactCardOnly ? "Agent Profile" : "Verified"}
        </span>
        <span className="h-3 w-px bg-background/25" />
        <span className="flex items-center gap-1.5">
          NPN: {data.npn || "—"}
        </span>
        <span className="hidden h-3 w-px bg-background/25 sm:block" />
        <span className="hidden items-center gap-1.5 sm:flex">
          <MapPin size={14} className="text-accent" aria-hidden="true" />
          {data.contactCardOnly ? `${data.stateLicenses.length} States on file` : `Licensed in ${data.stateLicenses.length} States`}
        </span>
      </div>
    </div>
  );
}
