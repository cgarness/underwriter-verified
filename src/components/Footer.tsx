import { useAgentData } from "@/contexts/AgentDataContext";
import LegalNavLinks from "@/components/LegalNavLinks";
import { CARRIER_LIABILITY_STATEMENT } from "@/lib/a2pBrand";

export default function Footer() {
  const { data } = useAgentData();
  const sender = data.agency || data.name;

  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="mx-auto mb-8 h-1 w-12 rounded-full bg-accent" />
      <div className="container text-center">
        <p className="text-sm font-medium text-foreground">
          © {new Date().getFullYear()} {data.name}{data.agency ? ` — ${data.agency}` : ""} — Licensed Life Insurance Agent
        </p>

        <LegalNavLinks className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground" />

        <p className="mx-auto mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Text messages from {sender} are optional. This website does not send them. An informational
          text is allowed only if you check the informational box. A marketing text is allowed only
          if you check the marketing box.
          Message frequency varies. Message and data rates may apply. Reply <strong>STOP</strong> to
          opt out. Reply <strong>HELP</strong> for help. SMS consent is not required to request a
          quote, request a call, or purchase insurance. {CARRIER_LIABILITY_STATEMENT}
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          This website is for informational purposes only and does not
          constitute legal or financial advice. {data.name}{data.agency ? ` and ${data.agency}` : ""} is not affiliated
          with or endorsed by the U.S. government or any federal agency.
          Guarantees are based on the claims-paying ability of the issuing
          insurance company. Policy availability, features, and costs may vary
          by state. Please consult your policy documents and a qualified
          professional for specific guidance.
        </p>
      </div>
    </footer>
  );
}
