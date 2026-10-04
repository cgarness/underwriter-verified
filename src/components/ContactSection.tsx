import { CalendarDays, FileText, PhoneCall } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAgentData } from "@/contexts/AgentDataContext";

export default function ContactSection() {
  const ref = useScrollReveal();
  const { data } = useAgentData();
  const { agencySlug, agentSlug } = useParams<{ agencySlug: string; agentSlug: string }>();
  const bookPath = agencySlug && agentSlug ? `/${agencySlug}/${agentSlug}/bookcall` : null;

  return (
    <section id="contact" className="py-20 md:py-28">
      <div className="container" ref={ref}>
        <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Let's Build Your Plan
        </h2>
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-accent" />

        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col justify-center">
            <Button variant="hero" size="xl" className="w-full md:w-fit" asChild>
              <a href={data.calendarUrl}>
                <CalendarDays size={20} />
                Book on My Calendar
              </a>
            </Button>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Two ways to reach {data.name}: request a quote or request a call. Both forms save your
              request. Their text-message boxes are optional, start unchecked, and are not required.
              Opening either page does not opt you in to text messages.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl bg-card p-7 shadow-sm ring-1 ring-border/60">
            <ContactPath
              icon={<FileText size={18} />}
              title="Request a free quote"
              body="Share your name, contact details, and state. The quote form is on this page."
              cta={
                <Button variant="outline" size="lg" className="w-full" asChild>
                  <a href="#free-quote">Go to the quote form</a>
                </Button>
              }
            />
            <ContactPath
              icon={<PhoneCall size={18} />}
              title="Request a call"
              body="Ask for a call back. A request is not a scheduled appointment until a time is set with you."
              cta={
                bookPath ? (
                  <Button variant="hero" size="lg" className="w-full" asChild>
                    <Link to={bookPath}>Open the call request form</Link>
                  </Button>
                ) : (
                  <Button variant="hero" size="lg" className="w-full" asChild>
                    <a href="#free-quote">Use the quote form</a>
                  </Button>
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Requesting contact does not opt you in to text messages. SMS permission is only
              recorded from the separate checkboxes on those forms.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactPath({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <div className="flex items-center gap-2 text-foreground">
        <span className="text-accent">{icon}</span>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
      {cta}
    </div>
  );
}
