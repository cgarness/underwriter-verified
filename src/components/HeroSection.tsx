import { Phone, Mail, MessageSquare, BadgeCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentData } from "@/contexts/AgentDataContext";
import AgentReviewSummary from "@/components/AgentReviewSummary";

export default function HeroSection() {
  const { data } = useAgentData();
  const verified = !data.contactCardOnly || data.profileVerified === true;
  const photo = data.headshotUrl;
  const initials = `${data.firstName.charAt(0)}${data.lastName.charAt(0)}`.toUpperCase();

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits[0] === "1")
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    if (digits.length === 10)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return phone;
  };

  return (
    <section className="relative overflow-hidden pb-10 pt-14 md:pt-20">
      <div className="container flex flex-col items-center text-center">
        <div className="relative animate-reveal">
          <div className="absolute -inset-3 rounded-full bg-accent/20 blur-xl" />
          {photo ? <img
            src={photo}
            alt={data.name}
            className="relative z-10 h-36 w-36 rounded-full object-cover shadow-lg ring-4 ring-background md:h-44 md:w-44"
          /> : <div aria-label={`${data.name} profile initials`} className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full bg-muted text-4xl font-semibold text-muted-foreground ring-4 ring-background md:h-44 md:w-44">{initials}</div>}
        </div>

        <h1
          className="mt-6 text-2xl font-bold tracking-tight text-foreground animate-reveal md:text-3xl"
          style={{ animationDelay: "100ms" }}
        >
          {data.name}
        </h1>

        <div
          className="mt-2 flex items-center gap-1.5 animate-reveal"
          style={{ animationDelay: "125ms" }}
          title={data.contactCardOnly && verified ? "Profile details confirmed by this agent" : undefined}
          aria-label={!verified ? "Agent profile" : "Verified agent"}
        >
          {!verified ? <UserRound size={18} className="text-accent" aria-hidden="true" /> : <BadgeCheck size={18} className="text-emerald-600" aria-hidden="true" />}
          <span className={`text-sm font-semibold tracking-wide ${!verified ? "text-muted-foreground" : "text-emerald-700"}`}>
            {!verified ? "Agent Profile" : "Verified"}
          </span>
        </div>

        <AgentReviewSummary />

        {data.agency && (
          <p
            className="mt-1.5 text-sm font-medium text-accent animate-reveal"
            style={{ animationDelay: "150ms" }}
          >
            {data.agency}
          </p>
        )}

        <p
          className="text-pretty mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground animate-reveal"
          style={{ animationDelay: "200ms" }}
        >
          {data.shortBio}
        </p>

        <div
          className="mt-7 flex flex-wrap justify-center gap-3 animate-reveal"
          style={{ animationDelay: "300ms" }}
        >
          {data.phone && <Button variant="outline" size="lg" asChild>
            <a href={`tel:${data.phone}`}>
              <Phone size={16} />
              Call
            </a>
          </Button>}
          {!data.contactCardOnly && data.phone && <Button variant="outline" size="lg" asChild>
            <a href={`sms:${data.phone}`}>
              <MessageSquare size={16} />
              Text
            </a>
          </Button>}
          {data.email && <Button variant="outline" size="lg" asChild>
            <a href={`mailto:${data.email}`}>
              <Mail size={16} />
              Email
            </a>
          </Button>}
        </div>

        <div
          className="mt-4 flex flex-col items-center gap-1.5 text-sm text-muted-foreground animate-reveal"
          style={{ animationDelay: "400ms" }}
        >
          {data.phone && <a href={`tel:${data.phone}`} className="transition-colors hover:text-foreground">
            {formatPhone(data.phone)}
          </a>}
          {data.email && <a href={`mailto:${data.email}`} className="transition-colors hover:text-foreground">
            {data.email}
          </a>}
        </div>
      </div>
    </section>
  );
}
