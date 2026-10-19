import { Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/contexts/AgentDataContext';

export default function DirectContactSection() {
  const { data } = useAgentData();
  if (!data.phone && !data.email) return null;
  return <section id="contact" className="py-20 md:py-28">
    <div className="container">
      <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">Let's Build Your Plan</h2>
      <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-accent" />
      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col justify-center">
          <h3 className="text-2xl font-semibold">Contact {data.name}</h3>
          {data.agency && <p className="mt-3 text-muted-foreground">{data.agency}</p>}
        </div>
        <div className="space-y-4 rounded-2xl bg-card p-7 shadow-sm ring-1 ring-border/60">
          {data.phone && <Button variant="hero" size="lg" className="w-full" asChild><a href={`tel:${data.phone}`}><Phone size={18}/>Call {data.firstName}</a></Button>}
          {data.email && <Button variant="outline" size="lg" className="w-full" asChild><a href={`mailto:${data.email}`}><Mail size={18}/>Email {data.firstName}</a></Button>}
        </div>
      </div>
    </div>
  </section>;
}
