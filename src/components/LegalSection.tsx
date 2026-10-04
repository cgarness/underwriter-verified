import { Link } from "react-router-dom";
import { useAgentData } from "@/contexts/AgentDataContext";
import { useLegalPaths } from "@/hooks/useLegalPaths";
import { CARRIER_LIABILITY_STATEMENT, SMS_NON_SHARING_STATEMENT } from "@/lib/a2pBrand";

export default function LegalSection() {
  const { data } = useAgentData();
  const { privacy, terms } = useLegalPaths();
  const sender = `${data.name}${data.agency ? ` and ${data.agency}` : ""}`;

  return (
    <section id="legal" className="py-16 bg-background">
      <div className="container max-w-3xl mx-auto px-4 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Messaging Program</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {sender} uses two optional SMS checkboxes. The informational box covers quote follow-ups,
            appointment reminders, and application or policy updates. The marketing box covers life
            insurance products and coverage reviews. Message frequency varies. Message and data rates
            may apply. SMS consent is not required to request a quote, request a call, or purchase
            insurance. Reply <strong>STOP</strong> to opt out. Reply <strong>HELP</strong> for help.{" "}
            {CARRIER_LIABILITY_STATEMENT}
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            <strong>{SMS_NON_SHARING_STATEMENT}</strong>
          </p>
        </div>

        <div id="privacy-policy" className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Privacy Policy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our full Privacy Policy explains what information we collect, how we use it, and how
            mobile numbers and messaging consent are protected.{" "}
            <Link to={privacy} className="underline underline-offset-2 hover:text-accent">
              Read the Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div id="terms" className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Terms and Conditions</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our Terms and Conditions govern use of this website and our SMS program.{" "}
            <Link to={terms} className="underline underline-offset-2 hover:text-accent">
              Read the Terms and Conditions
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
