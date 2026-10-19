import { BadgeCheck } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAgentData } from "@/contexts/AgentDataContext";

export default function CredentialsSection() {
  const ref = useScrollReveal();
  const { data } = useAgentData();

  return (
    <section id="credentials" className="md:py-28 py-[15px]">
      <div className="container max-w-3xl" ref={ref}>
        <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Licenses & Credentials
        </h2>
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-accent" />
        <p className="mx-auto mt-4 max-w-lg text-center text-muted-foreground">
          {data.contactCardOnly ? "Producer information and state licenses provided by this agent." :
            "I am a fully licensed and regulated insurance professional, committed to the highest standards of transparency and service."}
        </p>

        <div className="mx-auto mt-10 flex flex-col items-center gap-1">
          <BadgeCheck className="text-accent" size={32} />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            National Producer Number
          </p>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {data.npn || "—"}
          </p>
        </div>

        <div className="mt-10">
          <p className="mb-5 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            State Licenses
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {data.stateLicenses.map((lic) =>
            <span
              key={lic}
              className="inline-block rounded-full bg-card px-3.5 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-colors duration-200 hover:bg-accent hover:text-accent-foreground hover:ring-accent">
              
                {lic}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>);

}