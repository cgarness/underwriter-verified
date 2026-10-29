import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAgentData } from "@/contexts/AgentDataContext";

export default function TestimonialsSection() {
  const { data } = useAgentData();

  return (
    <section id="reviews" className="bg-sand/50 py-20 md:py-28">
      <div className="container">
        <Heading />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {data.testimonials.map((t, i) => (
            <Card key={i} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Heading() {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="text-center">
      <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Agent-Provided Testimonials
      </h2>
      <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-accent" />
      <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">These statements are provided by the agent. They are not independently verified client reviews and do not count toward the public star rating.</p>
    </div>
  );
}

function Card({
  testimonial,
  index,
}: {
  testimonial: { quote: string; name: string };
  index: number;
}) {
  const ref = useScrollReveal(index * 100);

  return (
    <div
      ref={ref}
      className="rounded-2xl bg-background p-7 shadow-sm ring-1 ring-border/60"
    >
      <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
        "{testimonial.quote}"
      </p>
      <p className="mt-5 text-sm font-semibold text-foreground">
        — {testimonial.name}
      </p>
    </div>
  );
}
